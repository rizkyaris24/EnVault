import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import { vaultDB } from '../../src/main/services/db'
import { vaultCrypto } from '../../src/main/services/crypto'
import { backupService } from '../../src/main/services/backupService'
import { restoreService } from '../../src/main/services/restoreService'
import { discoverEnvFiles } from '../../src/main/services/discoveryService'

describe('End-to-End Backup and Disaster Recovery Flow', () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `envault-e2e-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`)
    fs.mkdirSync(tmpRoot, { recursive: true })

    const dbPath = path.join(tmpRoot, 'vault.db')
    vaultDB.init(dbPath)

    vaultCrypto.setTestKey(crypto.randomBytes(32), 'integration-salt-pepper')
  })

  afterEach(() => {
    vaultDB.close()
    if (fs.existsSync(tmpRoot)) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true })
      } catch (_) {}
    }
  })

  it('runs the full lifecycle: discovery, initial snapshot, deduplication, modification, and disaster restore', () => {
    // 1. Create a simulated user project on disk
    const projectDir = path.join(tmpRoot, 'my-web-app')
    fs.mkdirSync(projectDir, { recursive: true })

    const envContentV1 = `
# Server config
PORT=3000
NODE_ENV=production
DATABASE_URL=postgres://app_user:ultra_secure_password_987@db.cloud.corp:5432/main
`
    const envPath = path.join(projectDir, '.env')
    fs.writeFileSync(envPath, envContentV1, 'utf8')

    // Also create a sample file that should be unchecked by default
    fs.writeFileSync(path.join(projectDir, '.env.example'), 'PORT=3000\nDATABASE_URL=\n', 'utf8')

    // 2. Discover env files
    const discovered = discoverEnvFiles(projectDir)
    expect(discovered).toHaveLength(2)

    const mainEnv = discovered.find((d) => d.relativePath === '.env')
    const exampleEnv = discovered.find((d) => d.relativePath === '.env.example')

    expect(mainEnv?.isDefaultChecked).toBe(true)
    expect(exampleEnv?.isDefaultChecked).toBe(false)

    // 3. Register project and main .env file
    const projectId = 'proj-e2e-1'
    vaultDB.createProject(projectId, 'My Web App', projectDir)
    const envFile = vaultDB.createEnvFile('file-e2e-1', projectId, '.env')

    // 4. Initial backup snapshot
    const snap1 = backupService.backupFile(envFile, projectDir, 'manual', 'Initial setup')
    expect(snap1).not.toBeNull()
    expect(snap1?.skippedDuplicate).toBe(false)
    expect(snap1?.version.versionNumber).toBe(1)
    expect(snap1?.version.varCount).toBe(3)

    // 5. Redundant backup check (deduplication)
    const snap1Again = backupService.backupFile(envFile, projectDir, 'watch')
    expect(snap1Again?.skippedDuplicate).toBe(true)
    expect(snap1Again?.version.versionNumber).toBe(1)

    // 6. User modifies .env file on disk
    const envContentV2 = envContentV1 + 'STRIPE_SECRET_KEY=sk_live_99887766554433221100\n'
    fs.writeFileSync(envPath, envContentV2, 'utf8')

    const snap2 = backupService.backupFile(envFile, projectDir, 'watch')
    expect(snap2?.skippedDuplicate).toBe(false)
    expect(snap2?.version.versionNumber).toBe(2)
    expect(snap2?.version.varCount).toBe(4)

    // 7. Disaster scenario: Developer or script deletes .env file from disk!
    fs.unlinkSync(envPath)
    expect(fs.existsSync(envPath)).toBe(false)

    // 8. Disaster Recovery: Restore latest version (v2) from vault
    const restoreResult = restoreService.restoreFile(envFile.id)
    expect(restoreResult.versionNumber).toBe(2)
    expect(fs.existsSync(envPath)).toBe(true)

    const restoredDiskContent = fs.readFileSync(envPath, 'utf8')
    expect(restoredDiskContent).toContain('sk_live_99887766554433221100')
    expect(restoredDiskContent).toContain('ultra_secure_password_987')

    // 9. Rollback to version 1
    const rollbackResult = restoreService.restoreFile(envFile.id, snap1!.version.id)
    expect(rollbackResult.versionNumber).toBe(1)

    const rolledBackContent = fs.readFileSync(envPath, 'utf8')
    expect(rolledBackContent).not.toContain('STRIPE_SECRET_KEY')
    expect(rolledBackContent).toContain('ultra_secure_password_987')
  })
})
