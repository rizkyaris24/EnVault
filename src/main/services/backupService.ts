import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { vaultDB } from './db'
import { vaultCrypto } from './crypto'
import { parseEnv } from './envParser'
import { EnvVersion, EnvFile } from '../../shared/types'

export class BackupService {
  /**
   * Backs up an env file from disk.
   * If the file content is identical to the latest backup, it deduplicates and skips writing.
   */
  public backupFile(
    file: EnvFile,
    projectPath: string,
    source: 'watch' | 'manual' | 'restore' = 'watch',
    note?: string
  ): { version: EnvVersion; skippedDuplicate: boolean } | null {
    const fullPath = path.join(projectPath, file.relativePath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const content = fs.readFileSync(fullPath, 'utf8')
    const contentHash = vaultCrypto.hashContent(content)

    // Check if content matches latest version
    const latestVersion = vaultDB.getLatestVersion(file.id)
    if (latestVersion && latestVersion.contentHash === contentHash) {
      return { version: latestVersion, skippedDuplicate: true }
    }

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1
    const encrypted = vaultCrypto.encrypt(content)
    const parsed = parseEnv(content)
    const varCount = Object.keys(parsed.entries).length

    const newVersion: EnvVersion = {
      id: crypto.randomUUID(),
      envFileId: file.id,
      versionNumber: nextVersionNumber,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      contentHash,
      varCount,
      source,
      note,
      createdAt: Date.now()
    }

    vaultDB.createVersion(newVersion)

    // Index secret hashes for cross-project reuse detection
    const secretHashes: Array<{ keyName: string; valueHash: string }> = []
    for (const [key, value] of Object.entries(parsed.entries)) {
      const hash = vaultCrypto.hashSecretValue(value)
      if (hash) {
        secretHashes.push({ keyName: key, valueHash: hash })
      }
    }

    if (secretHashes.length > 0) {
      vaultDB.indexSecretHashes(newVersion.id, file.projectId, file.id, secretHashes)
    }

    return { version: newVersion, skippedDuplicate: false }
  }

  /**
   * Decrypts a version's content
   */
  public decryptVersion(versionId: string): string {
    const version = vaultDB.getVersionById(versionId)
    if (!version) {
      throw new Error(`Version not found: ${versionId}`)
    }

    return vaultCrypto.decrypt({
      ciphertext: version.ciphertext,
      iv: version.iv,
      authTag: version.authTag
    })
  }
}

export const backupService = new BackupService()
