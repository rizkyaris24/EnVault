import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'
import { VaultDB } from '../../src/main/services/db'
import { VaultCrypto, MetaStore, KeyStore } from '../../src/main/services/crypto'
import { exportVault, importVault } from '../../src/main/services/vaultTransfer'

const PASS = 'export passphrase 123'

function metaOf(db: VaultDB): MetaStore {
  return { get: (k) => db.getMeta(k), set: (k, v) => db.setMeta(k, v), delete: (k) => db.deleteMeta(k) }
}

function keystore(machine: string): KeyStore {
  return {
    isAvailable: () => true,
    wrap: (hex) => Buffer.from(`${machine}:${hex}`).toString('base64'),
    unwrap: (b64) => {
      const [m, hex] = Buffer.from(b64, 'base64').toString().split(':')
      if (m !== machine) throw new Error('wrong machine')
      return hex
    }
  }
}

describe('vault export and import', () => {
  const dirs: string[] = []
  const dbs: VaultDB[] = []
  afterEach(() => {
    dbs.splice(0).forEach((d) => d.close())
    dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true }))
  })

  function makeVault(machine: string): { db: VaultDB; vc: VaultCrypto } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-xfer-'))
    dirs.push(dir)
    const db = new VaultDB()
    db.init(path.join(dir, 'v.db'))
    dbs.push(db)
    const vc = new VaultCrypto()
    vc.initialize(metaOf(db), keystore(machine))
    return { db, vc }
  }

  function addSecretVersion(db: VaultDB, vc: VaultCrypto, projectId: string, text: string): string {
    db.createProject(projectId, projectId, `/tmp/${projectId}`)
    db.createEnvFile(`${projectId}-f`, projectId, '.env')
    const enc = vc.encrypt(text)
    const id = crypto.randomUUID()
    db.createVersion({
      id, envFileId: `${projectId}-f`, versionNumber: 1, ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag,
      contentHash: 'h', varCount: 1, source: 'manual', createdAt: Date.now()
    })
    db.indexSecretHashes(id, projectId, `${projectId}-f`, [{ keyName: 'K', valueHash: vc.hashSecretValue('a_long_enough_secret')! }])
    return id
  }

  it('moves a vault to another machine: data decrypts and reuse hashes still match', () => {
    const a = makeVault('mac-a')
    const versionId = addSecretVersion(a.db, a.vc, 'alpha', 'TOKEN=moved_across_machines\n')
    const file = exportVault(a.db, a.vc, PASS)

    const b = makeVault('mac-b')
    addSecretVersion(b.db, b.vc, 'old-project', 'OLD=will_be_replaced\n')
    const result = importVault(b.db, b.vc, file, PASS)

    expect(result.projects).toBe(1)
    expect(b.db.getProjects().map((p) => p.id)).toEqual(['alpha'])
    const v = b.db.getVersionById(versionId)!
    expect(b.vc.decrypt({ ciphertext: v.ciphertext, iv: v.iv, authTag: v.authTag })).toBe('TOKEN=moved_across_machines\n')
    expect(b.vc.hashSecretValue('a_long_enough_secret')).toBe(a.vc.hashSecretValue('a_long_enough_secret'))
    expect(b.vc.hasRecovery()).toBe(true)

    // survives a restart on machine b with its own keychain
    const again = new VaultCrypto()
    expect(again.initialize(metaOf(b.db), keystore('mac-b')).state).toBe('ready')
    expect(again.decrypt({ ciphertext: v.ciphertext, iv: v.iv, authTag: v.authTag })).toBe('TOKEN=moved_across_machines\n')
  })

  it('rejects a wrong passphrase and leaves the target vault untouched', () => {
    const a = makeVault('mac-a')
    addSecretVersion(a.db, a.vc, 'alpha', 'A=value_one_here\n')
    const file = exportVault(a.db, a.vc, PASS)

    const b = makeVault('mac-b')
    addSecretVersion(b.db, b.vc, 'keep-me', 'B=value_two_here\n')
    expect(() => importVault(b.db, b.vc, file, 'wrong passphrase!!')).toThrow(/incorrect/i)
    expect(b.db.getProjects().map((p) => p.id)).toEqual(['keep-me'])
  })

  it('rejects files that are not valid exports', () => {
    const b = makeVault('mac-b')
    for (const bad of ['', 'not json', '{}', JSON.stringify({ format: 'other', v: 1 }), JSON.stringify({ format: 'envault-export', v: 99 })]) {
      expect(() => importVault(b.db, b.vc, bad, PASS)).toThrow()
    }
  })

  it('refuses to export when the vault is locked and enforces passphrase length', () => {
    const a = makeVault('mac-a')
    expect(() => exportVault(a.db, a.vc, 'short')).toThrow(/at least/i)
  })

  it('does not put plaintext secrets or the raw key in the export file', () => {
    const a = makeVault('mac-a')
    addSecretVersion(a.db, a.vc, 'alpha', 'TOKEN=plaintext_must_not_leak\n')
    const file = exportVault(a.db, a.vc, PASS)
    expect(file).not.toContain('plaintext_must_not_leak')
    expect(file).not.toContain((a.vc as any).dek.toString('hex'))
    expect(file).not.toContain((a.vc as any).dek.toString('base64'))
  })

  function tamper(file: string, edit: (tables: any) => void): string {
    const parsed = JSON.parse(file)
    edit(parsed.tables)
    return JSON.stringify(parsed)
  }

  it('rejects an export whose rows would let a restore write outside .env files', () => {
    const a = makeVault('mac-a')
    addSecretVersion(a.db, a.vc, 'alpha', 'A=value_one_here\n')
    const good = exportVault(a.db, a.vc, PASS)

    const b = makeVault('mac-b')
    addSecretVersion(b.db, b.vc, 'keep-me', 'B=value_two_here\n')

    const attacks: Array<[string, (t: any) => void]> = [
      ['dotfile', (t) => (t.env_files[0].relative_path = '.zshrc')],
      ['launch agent', (t) => (t.env_files[0].relative_path = 'Library/LaunchAgents/x.plist')],
      ['traversal', (t) => (t.env_files[0].relative_path = '../../.ssh/.env')],
      ['absolute file', (t) => (t.env_files[0].relative_path = '/etc/.env')],
      ['relative project path', (t) => (t.projects[0].path = 'relative/dir')],
      ['null byte', (t) => (t.env_files[0].relative_path = '.env\0.sh')],
      ['non-string id', (t) => (t.projects[0].id = { $ne: 1 })]
    ]
    for (const [name, edit] of attacks) {
      expect(() => importVault(b.db, b.vc, tamper(good, edit), PASS), name).toThrow()
    }
    expect(b.db.getProjects().map((p) => p.id)).toEqual(['keep-me'])
  })

  it('accepts nested .env paths that the scanner legitimately produces', () => {
    const a = makeVault('mac-a')
    addSecretVersion(a.db, a.vc, 'alpha', 'A=value_one_here\n')
    const file = tamper(exportVault(a.db, a.vc, PASS), (t) => (t.env_files[0].relative_path = 'apps/web/.env.local'))
    const b = makeVault('mac-b')
    expect(importVault(b.db, b.vc, file, PASS).projects).toBe(1)
  })

  it('leaves the vault and its key untouched if adopting the key fails mid-import', () => {
    const a = makeVault('mac-a')
    addSecretVersion(a.db, a.vc, 'alpha', 'A=value_one_here\n')
    const file = exportVault(a.db, a.vc, PASS)

    const b = makeVault('mac-b')
    const oldId = b.db.getProjects().length
    const oldVersion = addSecretVersion(b.db, b.vc, 'keep-me', 'B=value_two_here\n')
    const failing = new VaultCrypto()
    failing.initialize(metaOf(b.db), keystore('mac-b'))
    ;(failing as any).keystore = { ...keystore('mac-b'), wrap: () => { throw new Error('keychain write failed') } }

    expect(() => importVault(b.db, failing, file, PASS)).toThrow(/keychain write failed/)
    expect(oldId).toBe(0)
    expect(b.db.getProjects().map((p) => p.id)).toEqual(['keep-me'])
    const v = b.db.getVersionById(oldVersion)!
    expect(failing.decrypt({ ciphertext: v.ciphertext, iv: v.iv, authTag: v.authTag })).toBe('B=value_two_here\n')
  })
})
