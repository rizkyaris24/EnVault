import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import {
  Project,
  EnvFile,
  EnvVersion,
  EnvVersionSummary,
  SecretReuseReference
} from '../../shared/types'

export const LATEST_SCHEMA_VERSION = 2
const MAX_MIGRATION_BACKUPS = 2

export const DEFAULT_RETENTION = { maxAgeMs: 90 * 86_400_000, keepNewest: 50 }

const TABLE_COLUMNS: Record<string, string[]> = {
  projects: ['id', 'name', 'path', 'created_at', 'updated_at'],
  env_files: ['id', 'project_id', 'relative_path', 'is_active', 'created_at', 'updated_at'],
  env_versions: ['id', 'env_file_id', 'version_number', 'ciphertext', 'iv', 'auth_tag', 'content_hash', 'var_count', 'source', 'note', 'created_at'],
  secret_hashes: ['id', 'env_version_id', 'project_id', 'env_file_id', 'key_name', 'value_hash', 'created_at']
}

export class VaultCorruptError extends Error {}

export class VaultDB {
  private db: Database.Database | null = null
  private dbFile: string | null = null

  public init(dbPath?: string): void {
    const finalPath = dbPath || path.join(app.getPath('userData'), 'envault.db')
    const dir = path.dirname(finalPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const existed = fs.existsSync(finalPath)

    let db: Database.Database
    try {
      db = new Database(finalPath)
      if (existed && db.pragma('quick_check', { simple: true }) !== 'ok') {
        db.close()
        throw new Error('quick_check failed')
      }
    } catch (err) {
      throw new VaultCorruptError(
        `The vault database is damaged (${(err as Error).message}). Nothing was changed. ` +
          `If an automatic copy exists next to it (envault.db.bak-v*), you can restore from that.`
      )
    }

    this.db = db
    this.dbFile = finalPath
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('busy_timeout = 5000')

    this.migrate(existed)
  }

  private get client(): Database.Database {
    if (!this.db) {
      throw new Error('Database is not initialized')
    }
    return this.db
  }

  public getSchemaVersion(): number {
    return this.client.pragma('user_version', { simple: true }) as number
  }

  private migrate(existed: boolean): void {
    const current = this.getSchemaVersion()
    if (current > LATEST_SCHEMA_VERSION) {
      throw new Error(
        `This vault was created by a newer version of EnVault (schema ${current}). Update EnVault to open it.`
      )
    }
    if (current === LATEST_SCHEMA_VERSION) return

    // Keep a copy of the pre-migration file so an upgrade can never lose a vault.
    if (existed && current < LATEST_SCHEMA_VERSION && this.hasTable('projects')) {
      this.backupBeforeMigration(current)
    }

    const migrations: Array<() => void> = [
      // v1: baseline schema (idempotent so databases from older builds, at user_version 0, adopt it)
      () => this.client.exec(`
      CREATE TABLE IF NOT EXISTS vault_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS env_files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        relative_path TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(project_id, relative_path)
      );

      CREATE TABLE IF NOT EXISTS env_versions (
        id TEXT PRIMARY KEY,
        env_file_id TEXT NOT NULL REFERENCES env_files(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        var_count INTEGER NOT NULL,
        source TEXT NOT NULL,
        note TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS secret_hashes (
        id TEXT PRIMARY KEY,
        env_version_id TEXT NOT NULL REFERENCES env_versions(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        env_file_id TEXT NOT NULL REFERENCES env_files(id) ON DELETE CASCADE,
        key_name TEXT NOT NULL,
        value_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_secret_hashes_val ON secret_hashes(value_hash);
      CREATE INDEX IF NOT EXISTS idx_versions_file ON env_versions(env_file_id, created_at DESC);
    `),
      // v2: one row per (file, version number)
      () => {
        const dup = this.client
          .prepare('SELECT 1 FROM env_versions GROUP BY env_file_id, version_number HAVING COUNT(*) > 1 LIMIT 1')
          .get()
        if (dup) {
          this.client.exec(`
            UPDATE env_versions SET version_number = (
              SELECT COUNT(*) FROM env_versions e2
              WHERE e2.env_file_id = env_versions.env_file_id
                AND (e2.created_at < env_versions.created_at
                     OR (e2.created_at = env_versions.created_at AND e2.rowid <= env_versions.rowid))
            )
          `)
        }
        this.client.exec(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_unique ON env_versions(env_file_id, version_number)'
        )
      }
    ]

    for (let v = current + 1; v <= LATEST_SCHEMA_VERSION; v++) {
      this.client.transaction(() => {
        migrations[v - 1]()
        this.client.pragma(`user_version = ${v}`)
      })()
    }
  }

  private hasTable(name: string): boolean {
    return !!this.client.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)
  }

  private backupBeforeMigration(fromVersion: number): void {
    const file = this.dbFile!
    this.client.pragma('wal_checkpoint(TRUNCATE)')
    fs.copyFileSync(file, `${file}.bak-v${fromVersion}`)

    const base = path.basename(file)
    const dir = path.dirname(file)
    const baks = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${base}.bak-v`))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
    for (const old of baks.slice(MAX_MIGRATION_BACKUPS)) {
      fs.unlinkSync(path.join(dir, old.f))
    }
  }

  public runInTransaction<T>(fn: () => T): T {
    return this.client.transaction(fn)()
  }

  // Meta
  public getMeta(key: string): string | null {
    const row = this.client.prepare('SELECT value FROM vault_meta WHERE key = ?').get(key) as { value: string } | undefined
    return row ? row.value : null
  }

  public deleteMeta(key: string): void {
    this.client.prepare('DELETE FROM vault_meta WHERE key = ?').run(key)
  }

  public setMeta(key: string, value: string): void {
    this.client.prepare('INSERT OR REPLACE INTO vault_meta (key, value) VALUES (?, ?)').run(key, value)
  }

  // Projects
  public getProjects(): Project[] {
    const rows = this.client.prepare(`
      SELECT
        p.id, p.name, p.path,
        p.created_at as createdAt,
        COALESCE(MAX(ev.created_at), p.updated_at) as updatedAt,
        COUNT(DISTINCT ef.id) as fileCount
      FROM projects p
      LEFT JOIN env_files ef ON ef.project_id = p.id AND ef.is_active = 1
      LEFT JOIN env_versions ev ON ev.env_file_id = ef.id
      GROUP BY p.id
      ORDER BY updatedAt DESC
    `).all() as Array<Project & { fileCount: number }>

    return rows
  }

  public getProject(id: string): Project | null {
    const row = this.client.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined
    return row || null
  }

  public getProjectByPath(projectPath: string): Project | null {
    const row = this.client.prepare('SELECT * FROM projects WHERE path = ?').get(projectPath) as Project | undefined
    return row || null
  }

  public createProject(id: string, name: string, projectPath: string): Project {
    const now = Date.now()
    this.client.prepare(`
      INSERT INTO projects (id, name, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, projectPath, now, now)

    return {
      id,
      name,
      path: projectPath,
      createdAt: now,
      updatedAt: now,
      fileCount: 0
    }
  }

  public updateProjectName(id: string, name: string): void {
    const now = Date.now()
    this.client.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(name, now, id)
  }

  public touchProject(id: string): void {
    this.client.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), id)
  }

  public deleteProject(id: string): void {
    this.client.prepare('DELETE FROM projects WHERE id = ?').run(id)
  }

  // Env Files
  public getEnvFiles(projectId: string): EnvFile[] {
    const rows = this.client.prepare(`
      SELECT 
        ef.id, ef.project_id as projectId, ef.relative_path as relativePath, 
        ef.is_active as isActive, ef.created_at as createdAt, ef.updated_at as updatedAt
      FROM env_files ef
      WHERE ef.project_id = ? AND ef.is_active = 1
      ORDER BY ef.relative_path ASC
    `).all(projectId) as EnvFile[]

    // Enrich with latest version summary
    const stmt = this.client.prepare(`
      SELECT id, version_number as versionNumber, content_hash as contentHash,
             var_count as varCount, source, note, created_at as createdAt
      FROM env_versions
      WHERE env_file_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `)

    return rows.map((file) => {
      const latest = stmt.get(file.id) as EnvVersionSummary | undefined
      return {
        ...file,
        isActive: Boolean(file.isActive),
        latestVersion: latest
      }
    })
  }

  public getEnvFileById(id: string): EnvFile | null {
    const row = this.client.prepare(`
      SELECT 
        id, project_id as projectId, relative_path as relativePath, 
        is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM env_files
      WHERE id = ?
    `).get(id) as EnvFile | undefined

    if (!row) return null

    const latest = this.client.prepare(`
      SELECT id, version_number as versionNumber, content_hash as contentHash,
             var_count as varCount, source, note, created_at as createdAt
      FROM env_versions
      WHERE env_file_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `).get(id) as EnvVersionSummary | undefined

    return {
      ...row,
      isActive: Boolean(row.isActive),
      latestVersion: latest
    }
  }

  public getEnvFileByPath(projectId: string, relativePath: string): EnvFile | null {
    const row = this.client.prepare(`
      SELECT 
        id, project_id as projectId, relative_path as relativePath, 
        is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM env_files
      WHERE project_id = ? AND relative_path = ?
    `).get(projectId, relativePath) as EnvFile | undefined

    if (!row) return null
    return {
      ...row,
      isActive: Boolean(row.isActive)
    }
  }

  public createEnvFile(id: string, projectId: string, relativePath: string): EnvFile {
    const now = Date.now()
    this.client.prepare(`
      INSERT INTO env_files (id, project_id, relative_path, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, projectId, relativePath, now, now)

    this.touchProject(projectId)

    return {
      id,
      projectId,
      relativePath,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  }

  public deleteEnvFile(id: string): void {
    this.client.prepare('DELETE FROM env_files WHERE id = ?').run(id)
  }

  // Versions
  public getVersions(envFileId: string): EnvVersionSummary[] {
    const rows = this.client.prepare(`
      SELECT id, version_number as versionNumber, content_hash as contentHash,
             var_count as varCount, source, note, created_at as createdAt
      FROM env_versions
      WHERE env_file_id = ?
      ORDER BY version_number DESC
    `).all(envFileId) as EnvVersionSummary[]

    return rows
  }

  public getVersionById(id: string): EnvVersion | null {
    const row = this.client.prepare(`
      SELECT 
        id, env_file_id as envFileId, version_number as versionNumber,
        ciphertext, iv, auth_tag as authTag, content_hash as contentHash,
        var_count as varCount, source, note, created_at as createdAt
      FROM env_versions
      WHERE id = ?
    `).get(id) as EnvVersion | undefined

    return row || null
  }

  public getLatestVersion(envFileId: string): EnvVersion | null {
    const row = this.client.prepare(`
      SELECT 
        id, env_file_id as envFileId, version_number as versionNumber,
        ciphertext, iv, auth_tag as authTag, content_hash as contentHash,
        var_count as varCount, source, note, created_at as createdAt
      FROM env_versions
      WHERE env_file_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `).get(envFileId) as EnvVersion | undefined

    return row || null
  }

  public createVersion(version: EnvVersion): void {
    const now = version.createdAt || Date.now()
    const stmt = this.client.prepare(`
      INSERT INTO env_versions (
        id, env_file_id, version_number, ciphertext, iv, auth_tag,
        content_hash, var_count, source, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      version.id,
      version.envFileId,
      version.versionNumber,
      version.ciphertext,
      version.iv,
      version.authTag,
      version.contentHash,
      version.varCount,
      version.source,
      version.note || null,
      now
    )

    this.client.prepare('UPDATE env_files SET updated_at = ? WHERE id = ?').run(now, version.envFileId)
  }

  // Secret Hashes for Cross-Project Reuse
  public indexSecretHashes(
    envVersionId: string,
    projectId: string,
    envFileId: string,
    hashes: Array<{ keyName: string; valueHash: string }>
  ): void {
    const now = Date.now()
    const insert = this.client.prepare(`
      INSERT INTO secret_hashes (id, env_version_id, project_id, env_file_id, key_name, value_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = this.client.transaction((items: Array<{ keyName: string; valueHash: string }>) => {
      // First clean up previous hashes from this specific file so only latest active version counts
      this.client.prepare('DELETE FROM secret_hashes WHERE env_file_id = ?').run(envFileId)

      for (const item of items) {
        const id = `${envVersionId}_${item.keyName}`
        insert.run(id, envVersionId, projectId, envFileId, item.keyName, item.valueHash, now)
      }
    })

    tx(hashes)
  }

  public getReusedSecretsForProject(projectId: string): Record<string, SecretReuseReference[]> {
    // Finds secret hashes belonging to this project that also exist in other projects
    const rows = this.client.prepare(`
      SELECT 
        sh1.key_name as currentKey,
        sh2.project_id as otherProjectId,
        p.name as otherProjectName,
        ef.relative_path as otherEnvFile,
        sh2.key_name as otherKeyName
      FROM secret_hashes sh1
      JOIN secret_hashes sh2 ON sh1.value_hash = sh2.value_hash AND sh1.project_id != sh2.project_id
      JOIN projects p ON p.id = sh2.project_id
      JOIN env_files ef ON ef.id = sh2.env_file_id
      WHERE sh1.project_id = ?
    `).all(projectId) as Array<{
      currentKey: string
      otherProjectId: string
      otherProjectName: string
      otherEnvFile: string
      otherKeyName: string
    }>

    const result: Record<string, SecretReuseReference[]> = {}
    for (const row of rows) {
      if (!result[row.currentKey]) {
        result[row.currentKey] = []
      }
      result[row.currentKey].push({
        projectId: row.otherProjectId,
        projectName: row.otherProjectName,
        envFile: row.otherEnvFile,
        keyName: row.otherKeyName
      })
    }

    return result
  }

  /** Keeps the newest `keepNewest` versions plus anything younger than `maxAgeMs`; the latest is always kept. */
  public pruneVersions(envFileId: string, opts = DEFAULT_RETENTION): number {
    const cutoff = Date.now() - opts.maxAgeMs
    const res = this.client
      .prepare(`
        DELETE FROM env_versions
        WHERE env_file_id = @fileId
          AND created_at < @cutoff
          AND id NOT IN (
            SELECT id FROM env_versions WHERE env_file_id = @fileId
            ORDER BY version_number DESC LIMIT @keep
          )
      `)
      .run({ fileId: envFileId, cutoff, keep: Math.max(1, opts.keepNewest) })
    return res.changes
  }

  public pruneAllVersions(opts = DEFAULT_RETENTION): number {
    const files = this.client.prepare('SELECT id FROM env_files').all() as Array<{ id: string }>
    return this.runInTransaction(() => files.reduce((n, f) => n + this.pruneVersions(f.id, opts), 0))
  }

  /** Retention from settings: null means keep everything. */
  public getRetention(): { maxAgeMs: number; keepNewest: number } | null {
    const days = this.getMeta('retention_days')
    if (days === '0') return null
    const n = days ? Number(days) : 90
    return { maxAgeMs: (Number.isFinite(n) && n > 0 ? n : 90) * 86_400_000, keepNewest: DEFAULT_RETENTION.keepNewest }
  }

  /** Prunes one file (or all files) using the saved retention setting. */
  public applyRetention(envFileId?: string): number {
    const opts = this.getRetention()
    if (!opts) return 0
    return envFileId ? this.pruneVersions(envFileId, opts) : this.pruneAllVersions(opts)
  }

  public exportRows(): Record<string, Array<Record<string, unknown>>> {
    const out: Record<string, Array<Record<string, unknown>>> = {}
    for (const table of Object.keys(TABLE_COLUMNS)) {
      out[table] = this.client.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>
    }
    return out
  }

  /** Replaces every project, file, version and hash in one transaction. Column names are whitelisted. */
  public replaceAllRows(tables: Record<string, Array<Record<string, unknown>>>): void {
    this.client.transaction(() => {
      for (const table of ['secret_hashes', 'env_versions', 'env_files', 'projects']) {
        this.client.prepare(`DELETE FROM ${table}`).run()
      }
      for (const table of ['projects', 'env_files', 'env_versions', 'secret_hashes']) {
        const cols = TABLE_COLUMNS[table]
        const insert = this.client.prepare(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`
        )
        for (const row of tables[table] ?? []) {
          const params: Record<string, unknown> = {}
          for (const c of cols) params[c] = row[c] ?? null
          insert.run(params)
        }
      }
    })()
  }

  /** Number of distinct keys per project whose value also appears in another project. */
  public getReuseCountsByProject(): Map<string, number> {
    const rows = this.client
      .prepare(`
        SELECT sh1.project_id as projectId, COUNT(DISTINCT sh1.key_name) as n
        FROM secret_hashes sh1
        WHERE EXISTS (
          SELECT 1 FROM secret_hashes sh2
          WHERE sh2.value_hash = sh1.value_hash AND sh2.project_id != sh1.project_id
        )
        GROUP BY sh1.project_id
      `)
      .all() as Array<{ projectId: string; n: number }>
    return new Map(rows.map((r) => [r.projectId, r.n]))
  }

  /** Active tracked files across all projects, in one query. */
  public getActiveFilePaths(): Array<{ projectId: string; relativePath: string }> {
    return this.client
      .prepare('SELECT project_id as projectId, relative_path as relativePath FROM env_files WHERE is_active = 1')
      .all() as Array<{ projectId: string; relativePath: string }>
  }

  public getStats(): { totalProjects: number; totalFiles: number; totalVersions: number; reusedSecretCount: number } {
    const projects = this.client.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }
    const files = this.client.prepare('SELECT COUNT(*) as count FROM env_files WHERE is_active = 1').get() as { count: number }
    const versions = this.client.prepare('SELECT COUNT(*) as count FROM env_versions').get() as { count: number }
    const reused = this.client.prepare(`
      SELECT COUNT(DISTINCT value_hash) as count 
      FROM secret_hashes 
      GROUP BY value_hash 
      HAVING COUNT(DISTINCT project_id) > 1
    `).all()

    return {
      totalProjects: projects.count,
      totalFiles: files.count,
      totalVersions: versions.count,
      reusedSecretCount: reused.length
    }
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.pragma('wal_checkpoint(TRUNCATE)')
      } catch (_) {}
      this.db.close()
      this.db = null
    }
  }
}

export const vaultDB = new VaultDB()
