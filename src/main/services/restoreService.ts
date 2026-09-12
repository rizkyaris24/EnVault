import * as path from 'path'
import { vaultDB } from './db'
import { backupService } from './backupService'
import { atomicWriteFileSync } from '../utils/atomicWrite'
import { fileWatcherService } from './watcher'

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
    const targetPath = path.join(project.path, file.relativePath)

    // Notify watcher service to ignore the restore file-write event
    fileWatcherService.suppressNextChangeEvent(targetPath)

    // Atomic write to disk
    atomicWriteFileSync(targetPath, decryptedContent, 'utf8')

    return {
      targetPath,
      versionNumber: targetVersion.versionNumber,
      restoredContent: decryptedContent
    }
  }
}

export const restoreService = new RestoreService()
