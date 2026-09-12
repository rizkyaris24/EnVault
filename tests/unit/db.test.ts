import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { VaultDB } from '../../src/main/services/db'
import { EnvVersion } from '../../src/shared/types'

describe('VaultDB', () => {
  let db: VaultDB
  let dbPath: string

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `envault-db-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.db`)
    db = new VaultDB()
    db.init(dbPath)
  })

  afterEach(() => {
    db.close()
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath)
      } catch (_) {}
    }
  })

  it('manages metadata key-value storage', () => {
    db.setMeta('test_key', 'test_value')
    expect(db.getMeta('test_key')).toBe('test_value')
    expect(db.getMeta('non_existent')).toBeNull()
  })

  it('creates, retrieves, and deletes projects', () => {
    const project = db.createProject('proj-1', 'Test App', '/path/to/test-app')
    expect(project.id).toBe('proj-1')
    expect(project.name).toBe('Test App')

    const fetched = db.getProject('proj-1')
    expect(fetched?.path).toBe('/path/to/test-app')

    const byPath = db.getProjectByPath('/path/to/test-app')
    expect(byPath?.id).toBe('proj-1')

    db.deleteProject('proj-1')
    expect(db.getProject('proj-1')).toBeNull()
  })

  it('creates env files and stores version snapshots', () => {
    db.createProject('proj-1', 'App 1', '/path/1')
    const envFile = db.createEnvFile('file-1', 'proj-1', '.env')

    expect(envFile.relativePath).toBe('.env')

    const version1: EnvVersion = {
      id: 'v-1',
      envFileId: 'file-1',
      versionNumber: 1,
      ciphertext: 'enc_data_1',
      iv: 'iv_1',
      authTag: 'tag_1',
      contentHash: 'hash_1',
      varCount: 5,
      source: 'watch',
      createdAt: Date.now()
    }
    db.createVersion(version1)

    const latest = db.getLatestVersion('file-1')
    expect(latest?.versionNumber).toBe(1)
    expect(latest?.contentHash).toBe('hash_1')

    const versions = db.getVersions('file-1')
    expect(versions).toHaveLength(1)
  })

  it('detects cross-project secret reuse without exposing plaintexts', () => {
    // Project 1
    db.createProject('proj-1', 'Frontend App', '/app/front')
    db.createEnvFile('file-1', 'proj-1', '.env')
    const v1: EnvVersion = {
      id: 'ver-1',
      envFileId: 'file-1',
      versionNumber: 1,
      ciphertext: 'c1',
      iv: 'iv1',
      authTag: 't1',
      contentHash: 'h1',
      varCount: 1,
      source: 'manual',
      createdAt: Date.now()
    }
    db.createVersion(v1)
    db.indexSecretHashes('ver-1', 'proj-1', 'file-1', [
      { keyName: 'SHARED_STRIPE_KEY', valueHash: 'hmac_stripe_secret_123' }
    ])

    // Project 2 (different project reusing same secret hash)
    db.createProject('proj-2', 'Backend API', '/app/back')
    db.createEnvFile('file-2', 'proj-2', '.env.local')
    const v2: EnvVersion = {
      id: 'ver-2',
      envFileId: 'file-2',
      versionNumber: 1,
      ciphertext: 'c2',
      iv: 'iv2',
      authTag: 't2',
      contentHash: 'h2',
      varCount: 1,
      source: 'manual',
      createdAt: Date.now()
    }
    db.createVersion(v2)
    db.indexSecretHashes('ver-2', 'proj-2', 'file-2', [
      { keyName: 'STRIPE_SECRET', valueHash: 'hmac_stripe_secret_123' }
    ])

    // Query reuse for Project 1
    const reuseMap1 = db.getReusedSecretsForProject('proj-1')
    expect(reuseMap1['SHARED_STRIPE_KEY']).toBeDefined()
    expect(reuseMap1['SHARED_STRIPE_KEY']).toHaveLength(1)
    expect(reuseMap1['SHARED_STRIPE_KEY'][0].projectName).toBe('Backend API')
    expect(reuseMap1['SHARED_STRIPE_KEY'][0].envFile).toBe('.env.local')
    expect(reuseMap1['SHARED_STRIPE_KEY'][0].keyName).toBe('STRIPE_SECRET')

    // Query reuse for Project 2
    const reuseMap2 = db.getReusedSecretsForProject('proj-2')
    expect(reuseMap2['STRIPE_SECRET']).toBeDefined()
    expect(reuseMap2['STRIPE_SECRET'][0].projectName).toBe('Frontend App')
  })
})
