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

export class VaultDB {
  private db: Database.Database | null = null

  public init(dbPath?: string): void {
    const finalPath = dbPath || path.join(app.getPath('userData'), 'envault.db')
    const dir = path.dirname(finalPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(finalPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    this.migrate()
  }

  private get client(): Database.Database {
    if (!this.db) {
      throw new Error('Database is not initialized')
    }
    return this.db
  }

  private migrate(): void {
    const schema = `
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
    `
    this.client.exec(schema)
  }

  // Meta
  public getMeta(key: string): string | null {
    const row = this.client.prepare('SELECT value FROM vault_meta WHERE key = ?').get(key) as { value: string } | undefined
    return row ? row.value : null
  }

  public setMeta(key: string, value: string): void {
    this.client.prepare('INSERT OR REPLACE INTO vault_meta (key, value) VALUES (?, ?)').run(key, value)
  }

  // Projects
  public getProjects(): Project[] {
    const rows = this.client.prepare(`
      SELECT 
        p.*,
        COUNT(DISTINCT ef.id) as fileCount
      FROM projects p
      LEFT JOIN env_files ef ON ef.project_id = p.id AND ef.is_active = 1
      GROUP BY p.id
      ORDER BY p.updated_at DESC
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
      this.db.close()
      this.db = null
    }
  }
}

export const vaultDB = new VaultDB()
