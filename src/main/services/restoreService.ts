import * as fs from 'fs'
import { vaultDB } from './db'
import { backupService } from './backupService'
import { atomicWriteFileSync } from '../utils/atomicWrite'
import { fileWatcherService } from './watcher'
import { resolveInside } from '../utils/safePath'

export class RestoreService {
  /**
   * Restores an env file to disk atomically.
   */
  public restoreFile(
    fileId: string,
    versionId?: string
  ): { targetPath: string; versionNumber: number; restoredContent: string } {
    const file = vaultDB.getEnvFileById(fileId)
    if (!file) {
      throw new Error(`EnvFile not found: ${fileId}`)
    }

    const project = vaultDB.getProject(file.projectId)
    if (!project) {
      throw new Error(`Project not found: ${file.projectId}`)
    }

    const targetVersion = versionId
      ? vaultDB.getVersionById(versionId)
      : vaultDB.getLatestVersion(file.id)

    if (!targetVersion) {
      throw new Error(`No version found to restore for file: ${file.relativePath}`)
    }

    const decryptedContent = backupService.decryptVersion(targetVersion.id)
    const targetPath = resolveInside(project.path, file.relativePath)

    // Keep any unsaved on-disk edits so a restore is always reversible.
    if (fs.existsSync(targetPath)) {
      backupService.backupFile(file, project.path, 'manual', 'Saved before restore')
    }

    // Notify watcher service to ignore the restore file-write event
    fileWatcherService.suppressNextChangeEvent(targetPath)

    try {
      atomicWriteFileSync(targetPath, decryptedContent, 'utf8')
    } catch (err) {
      fileWatcherService.clearSuppression(targetPath)
      throw err
    }

    // Record the restore in history (no-op when it equals the latest snapshot).
    backupService.backupFile(file, project.path, 'restore', `Restored from v${targetVersion.versionNumber}`)

    return {
      targetPath,
      versionNumber: targetVersion.versionNumber,
      restoredContent: decryptedContent
    }
  }
}

export const restoreService = new RestoreService()
