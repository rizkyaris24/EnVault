import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import { vaultDB } from '../../src/main/services/db'
import { vaultCrypto } from '../../src/main/services/crypto'
import { backupService } from '../../src/main/services/backupService'
import { restoreService } from '../../src/main/services/restoreService'

describe('Backup and restore safety', () => {
  let tmpRoot: string
  let projectDir: string
  let projectId: string

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-safety-'))
    projectDir = path.join(tmpRoot, 'app')
    fs.mkdirSync(projectDir)
    vaultDB.init(path.join(tmpRoot, 'vault.db'))
    vaultCrypto.setTestKey(crypto.randomBytes(32), 'pepper-for-safety-tests')
    projectId = crypto.randomUUID()
    vaultDB.createProject(projectId, 'app', projectDir)
  })

  afterEach(() => {
    vaultDB.close()
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('saves unsaved on-disk edits before a restore overwrites them', () => {
    const envPath = path.join(projectDir, '.env')
    fs.writeFileSync(envPath, 'TOKEN=original_value_123\n')
    const file = vaultDB.createEnvFile(crypto.randomUUID(), projectId, '.env')
    const v1 = backupService.backupFile(file, projectDir, 'manual')!.version

    fs.writeFileSync(envPath, 'TOKEN=unsaved_edit_456\n')
    restoreService.restoreFile(file.id, v1.id)

    expect(fs.readFileSync(envPath, 'utf8')).toBe('TOKEN=original_value_123\n')
    const contents = vaultDB.getVersions(file.id).map((v) => backupService.decryptVersion(v.id))
    expect(contents).toContain('TOKEN=unsaved_edit_456\n')
    expect(vaultDB.getVersions(file.id)[0].source).toBe('restore')
  })

  it('does not create extra versions when restoring the current content', () => {
    const envPath = path.join(projectDir, '.env')
    fs.writeFileSync(envPath, 'A=value_number_one\n')
    const file = vaultDB.createEnvFile(crypto.randomUUID(), projectId, '.env')
    const v1 = backupService.backupFile(file, projectDir, 'manual')!.version
    restoreService.restoreFile(file.id, v1.id)
    expect(vaultDB.getVersions(file.id)).toHaveLength(1)
  })

  it('refuses a tracked path that escapes the project folder', () => {
    fs.writeFileSync(path.join(tmpRoot, 'outside.env'), 'LEAK=should_never_be_read\n')
    const file = vaultDB.createEnvFile(crypto.randomUUID(), projectId, '../outside.env')
    expect(() => backupService.backupFile(file, projectDir, 'manual')).toThrow()
    expect(() => restoreService.restoreFile(file.id)).toThrow()
  })

  it('refuses to back up a .env that is a symlink', () => {
    fs.writeFileSync(path.join(tmpRoot, 'real'), 'SECRET=symlinked_elsewhere_1\n')
    fs.symlinkSync(path.join(tmpRoot, 'real'), path.join(projectDir, '.env'))
    const file = vaultDB.createEnvFile(crypto.randomUUID(), projectId, '.env')
    expect(() => backupService.backupFile(file, projectDir, 'manual')).toThrow(/symlink/i)
  })

  it('rolls back the version row when indexing secret hashes fails', () => {
    const envPath = path.join(projectDir, '.env')
    fs.writeFileSync(envPath, 'API_KEY=a_long_enough_secret_value\n')
    const file = vaultDB.createEnvFile(crypto.randomUUID(), projectId, '.env')
    const original = vaultDB.indexSecretHashes.bind(vaultDB)
    vaultDB.indexSecretHashes = () => {
      throw new Error('boom')
    }
    try {
      expect(() => backupService.backupFile(file, projectDir, 'manual')).toThrow('boom')
    } finally {
      vaultDB.indexSecretHashes = original
    }
    expect(vaultDB.getVersions(file.id)).toHaveLength(0)
  })
})

describe('Backup size cap', () => {
  it('refuses to back up a file over 1 MB', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-big-'))
    try {
      vaultDB.init(path.join(tmp, 'vault.db'))
      vaultCrypto.setTestKey(crypto.randomBytes(32), 'pepper-for-size-test')
      const dir = path.join(tmp, 'app')
      fs.mkdirSync(dir)
      fs.writeFileSync(path.join(dir, '.env'), 'X=' + 'a'.repeat(1024 * 1024 + 10))
      vaultDB.createProject('p', 'p', dir)
      const file = vaultDB.createEnvFile('f', 'p', '.env')
      expect(() => backupService.backupFile(file, dir, 'manual')).toThrow(/larger than 1 MB/)
    } finally {
      vaultDB.close()
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
