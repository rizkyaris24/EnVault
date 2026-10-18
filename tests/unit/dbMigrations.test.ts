import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import Database from 'better-sqlite3'
import { VaultDB, LATEST_SCHEMA_VERSION } from '../../src/main/services/db'

const LEGACY_SCHEMA = `
  CREATE TABLE vault_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
  CREATE TABLE env_files (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, relative_path TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(project_id, relative_path));
  CREATE TABLE env_versions (id TEXT PRIMARY KEY, env_file_id TEXT NOT NULL REFERENCES env_files(id) ON DELETE CASCADE, version_number INTEGER NOT NULL, ciphertext TEXT NOT NULL, iv TEXT NOT NULL, auth_tag TEXT NOT NULL, content_hash TEXT NOT NULL, var_count INTEGER NOT NULL, source TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL);
  CREATE TABLE secret_hashes (id TEXT PRIMARY KEY, env_version_id TEXT NOT NULL REFERENCES env_versions(id) ON DELETE CASCADE, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, env_file_id TEXT NOT NULL REFERENCES env_files(id) ON DELETE CASCADE, key_name TEXT NOT NULL, value_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
`

describe('VaultDB schema versioning', () => {
  let dir: string
  let dbPath: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-mig-'))
    dbPath = path.join(dir, 'vault.db')
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function makeLegacy(withDuplicates = true): void {
    const raw = new Database(dbPath)
    raw.exec(LEGACY_SCHEMA)
    raw.prepare("INSERT INTO vault_meta VALUES ('encrypted_dek','abc')").run()
    raw.prepare("INSERT INTO projects VALUES ('p1','App','/tmp/app',1,1)").run()
    raw.prepare("INSERT INTO env_files VALUES ('f1','p1','.env',1,1,1)").run()
    const ins = raw.prepare("INSERT INTO env_versions VALUES (?,?,?,'c','i','t','h',1,'manual',NULL,?)")
    ins.run('v1', 'f1', 1, 100)
    ins.run('v2', 'f1', withDuplicates ? 1 : 2, 200)
    ins.run('v3', 'f1', withDuplicates ? 2 : 3, 300)
    raw.close()
  }

  it('creates a fresh database at the latest schema version', () => {
    const db = new VaultDB()
    db.init(dbPath)
    expect(db.getSchemaVersion()).toBe(LATEST_SCHEMA_VERSION)
    db.close()
  })

  it('upgrades a legacy database, keeps its data, and renumbers duplicate versions', () => {
    makeLegacy(true)
    const db = new VaultDB()
    db.init(dbPath)
    expect(db.getSchemaVersion()).toBe(LATEST_SCHEMA_VERSION)
    expect(db.getMeta('encrypted_dek')).toBe('abc')
    const nums = db.getVersions('f1').map((v) => v.versionNumber).sort()
    expect(nums).toEqual([1, 2, 3])
    // oldest stays v1, newest becomes v3
    expect(db.getLatestVersion('f1')?.id).toBe('v3')
    expect(db.getLatestVersion('f1')?.versionNumber).toBe(3)
    db.close()
  })

  it('does not renumber when version numbers are already unique', () => {
    makeLegacy(false)
    const db = new VaultDB()
    db.init(dbPath)
    const byId = Object.fromEntries(db.getVersions('f1').map((v) => [v.id, v.versionNumber]))
    expect(byId).toEqual({ v1: 1, v2: 2, v3: 3 })
    db.close()
  })

  it('enforces unique (file, version number)', () => {
    const db = new VaultDB()
    db.init(dbPath)
    db.createProject('p', 'P', '/tmp/p')
    db.createEnvFile('f', 'p', '.env')
    const mk = (id: string) => ({
      id, envFileId: 'f', versionNumber: 1, ciphertext: 'c', iv: 'i', authTag: 't',
      contentHash: id, varCount: 0, source: 'manual' as const, createdAt: Date.now()
    })
    db.createVersion(mk('a'))
    expect(() => db.createVersion(mk('b'))).toThrow(/unique/i)
    db.close()
  })

  it('copies the database before migrating and keeps only the two newest copies', () => {
    makeLegacy(true)
    fs.writeFileSync(`${dbPath}.bak-v90`, 'old1')
    fs.writeFileSync(`${dbPath}.bak-v91`, 'old2')
    const past = new Date(Date.now() - 60_000)
    fs.utimesSync(`${dbPath}.bak-v90`, past, past)
    fs.utimesSync(`${dbPath}.bak-v91`, new Date(past.getTime() + 1000), new Date(past.getTime() + 1000))

    const db = new VaultDB()
    db.init(dbPath)
    db.close()

    const baks = fs.readdirSync(dir).filter((f) => f.includes('.bak-v')).sort()
    expect(baks).toHaveLength(2)
    expect(baks).toContain('vault.db.bak-v0')
    const legacy = new Database(`${dbPath}.bak-v0`, { readonly: true })
    expect((legacy.pragma('user_version', { simple: true }) as number)).toBe(0)
    legacy.close()
  })

  it('refuses a damaged database with a clear message and leaves the file alone', () => {
    fs.writeFileSync(dbPath, Buffer.from('this is definitely not a sqlite database file '.repeat(50)))
    const before = fs.readFileSync(dbPath)
    const db = new VaultDB()
    expect(() => db.init(dbPath)).toThrow(/damaged|corrupt/i)
    expect(fs.readFileSync(dbPath).equals(before)).toBe(true)
  })
})

describe('VaultDB retention and reuse counts', () => {
  let dir: string
  let db: VaultDB
  const DAY = 86_400_000

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-ret-'))
    db = new VaultDB()
    db.init(path.join(dir, 'vault.db'))
    db.createProject('p', 'P', '/tmp/p')
    db.createEnvFile('f', 'p', '.env')
  })

  afterEach(() => {
    db.close()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function addVersions(n: number, ageDays: (i: number) => number): void {
    for (let i = 1; i <= n; i++) {
      db.createVersion({
        id: `v${i}`, envFileId: 'f', versionNumber: i, ciphertext: 'c', iv: 'i', authTag: 't',
        contentHash: `h${i}`, varCount: 1, source: 'watch', createdAt: Date.now() - ageDays(i) * DAY
      })
    }
  }

  it('keeps versions younger than the max age and the newest N, never the rest', () => {
    addVersions(120, (i) => 200 - i) // v120 is 80 days old, v1 is 199 days old
    const removed = db.pruneVersions('f', { maxAgeMs: 90 * DAY, keepNewest: 50 })
    const left = db.getVersions('f').map((v) => v.versionNumber)
    // newest 50 (v71-v120) are kept; v11..v70 are younger than 90d only if age<90: v111+ is <90d
    expect(left.length).toBe(50)
    expect(Math.min(...left)).toBe(71)
    expect(removed).toBe(70)
  })

  it('keeps recent versions even beyond the newest N', () => {
    addVersions(80, () => 1) // all one day old
    expect(db.pruneVersions('f', { maxAgeMs: 90 * DAY, keepNewest: 50 })).toBe(0)
    expect(db.getVersions('f')).toHaveLength(80)
  })

  it('always keeps the latest version', () => {
    addVersions(3, () => 1000)
    db.pruneVersions('f', { maxAgeMs: 1, keepNewest: 1 })
    expect(db.getVersions('f').map((v) => v.versionNumber)).toEqual([3])
  })

  it('reports per-project reuse counts that match the per-project reuse map', () => {
    db.createProject('q', 'Q', '/tmp/q')
    db.createEnvFile('g', 'q', '.env')
    addVersions(1, () => 1)
    db.createVersion({
      id: 'qv', envFileId: 'g', versionNumber: 1, ciphertext: 'c', iv: 'i', authTag: 't',
      contentHash: 'qh', varCount: 1, source: 'watch', createdAt: Date.now()
    })
    db.indexSecretHashes('v1', 'p', 'f', [{ keyName: 'API_KEY', valueHash: 'same' }, { keyName: 'OTHER', valueHash: 'x1' }])
    db.indexSecretHashes('qv', 'q', 'g', [{ keyName: 'KEY_B', valueHash: 'same' }])
    const counts = db.getReuseCountsByProject()
    expect(counts.get('p')).toBe(Object.keys(db.getReusedSecretsForProject('p')).length)
    expect(counts.get('q')).toBe(Object.keys(db.getReusedSecretsForProject('q')).length)
    expect(counts.get('p')).toBe(1)
  })
})
