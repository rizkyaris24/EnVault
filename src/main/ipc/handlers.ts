import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import { vaultDB } from '../services/db'
import { vaultCrypto } from '../services/crypto'
import { discoverEnvFiles } from '../services/discoveryService'
import { scanComputerAndAutoSave } from '../services/computerScanner'
import { backupService } from '../services/backupService'
import { restoreService } from '../services/restoreService'
import { fileWatcherService } from '../services/watcher'
import { computeEnvDiff } from '../services/diffService'
import { parseEnv } from '../services/envParser'
import { SecretEntry, IPCResult, Project, EnvFile, ComputerScanSummary } from '../../shared/types'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Dialog: Select Directory
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async (): Promise<IPCResult<string | null>> => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Project Directory',
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) {
      return { success: true, data: null }
    }
    return { success: true, data: res.filePaths[0] }
  })

  // Projects: Scan Single Directory
  ipcMain.handle(IPC_CHANNELS.PROJECTS_SCAN, async (_event, projectDir: string): Promise<IPCResult<any>> => {
    try {
      if (!projectDir || !fs.existsSync(projectDir)) {
        return { success: false, error: 'Directory does not exist' }
      }
      const files = discoverEnvFiles(projectDir)
      return { success: true, data: files }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Projects: Scan Computer & Auto-Save
  ipcMain.handle(IPC_CHANNELS.PROJECTS_SCAN_COMPUTER, async (): Promise<IPCResult<ComputerScanSummary>> => {
    try {
      const summary = await scanComputerAndAutoSave({
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.EVENT_SCAN_PROGRESS, progress)
          }
        }
      })
      return { success: true, data: summary }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Projects: Add with Selected Files
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_ADD,
    async (
      _event,
      payload: { path: string; name?: string; selectedFiles: string[] }
    ): Promise<IPCResult<Project>> => {
      try {
        const { path: projectPath, name, selectedFiles } = payload
        if (!fs.existsSync(projectPath)) {
          return { success: false, error: 'Directory does not exist' }
        }

        const existing = vaultDB.getProjectByPath(projectPath)
        if (existing) {
          return { success: false, error: 'This project directory is already registered in EnVault' }
        }

        const projectName = name?.trim() || path.basename(projectPath)
        const projectId = crypto.randomUUID()
        const project = vaultDB.createProject(projectId, projectName, projectPath)

        // Register each selected file and take initial backup
        for (const relativePath of selectedFiles) {
          const fileId = crypto.randomUUID()
          const envFile = vaultDB.createEnvFile(fileId, projectId, relativePath)
          backupService.backupFile(envFile, projectPath, 'manual', 'Initial project import')
        }

        // Start watching project folder
        fileWatcherService.watchProject(projectId, projectPath)

        return { success: true, data: project }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // Projects: List
  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST, async (): Promise<IPCResult<Project[]>> => {
    try {
      const projects = vaultDB.getProjects()
      const enriched: Project[] = projects.map((p) => {
        const files = vaultDB.getEnvFiles(p.id)
        let hasMissing = false
        for (const f of files) {
          const fullPath = path.join(p.path, f.relativePath)
          if (!fs.existsSync(fullPath)) {
            hasMissing = true
            break
          }
        }
        const reuseMap = vaultDB.getReusedSecretsForProject(p.id)
        const reuseCount = Object.keys(reuseMap).length

        return {
          ...p,
          hasMissingFiles: hasMissing,
          reuseWarningCount: reuseCount
        }
      })
      return { success: true, data: enriched }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Projects: Remove
  ipcMain.handle(IPC_CHANNELS.PROJECTS_REMOVE, async (_event, projectId: string): Promise<IPCResult> => {
    try {
      fileWatcherService.unwatchProject(projectId)
      vaultDB.deleteProject(projectId)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Projects: Reveal in OS Finder / Explorer
  ipcMain.handle(IPC_CHANNELS.PROJECTS_REVEAL, async (_event, targetPath: string): Promise<IPCResult> => {
    try {
      if (fs.existsSync(targetPath)) {
        shell.showItemInFolder(targetPath)
        return { success: true }
      } else {
        return { success: false, error: 'Path does not exist on disk' }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Files: Get By Project
  ipcMain.handle(IPC_CHANNELS.FILES_GET_BY_PROJECT, async (_event, projectId: string): Promise<IPCResult<EnvFile[]>> => {
    try {
      const project = vaultDB.getProject(projectId)
      if (!project) {
        return { success: false, error: 'Project not found' }
      }
      const files = vaultDB.getEnvFiles(projectId)
      const enriched = files.map((f) => ({
        ...f,
        existsOnDisk: fs.existsSync(path.join(project.path, f.relativePath))
      }))
      return { success: true, data: enriched }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Files: Get Versions
  ipcMain.handle(IPC_CHANNELS.FILES_GET_VERSIONS, async (_event, fileId: string): Promise<IPCResult<any>> => {
    try {
      const versions = vaultDB.getVersions(fileId)
      return { success: true, data: versions }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Files: Get Decrypted Content & Secret Entries
  ipcMain.handle(
    IPC_CHANNELS.FILES_GET_DECRYPTED,
    async (
      _event,
      payload: { versionId: string; projectId: string }
    ): Promise<IPCResult<{ raw: string; secrets: SecretEntry[] }>> => {
      try {
        const { versionId, projectId } = payload
        const raw = backupService.decryptVersion(versionId)
        const parsed = parseEnv(raw)
        const reuseMap = vaultDB.getReusedSecretsForProject(projectId)

        const secrets: SecretEntry[] = Object.entries(parsed.entries).map(([key, value]) => ({
          key,
          value,
          reusedIn: reuseMap[key] || []
        }))

        return { success: true, data: { raw, secrets } }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // Files: Get Diff
  ipcMain.handle(
    IPC_CHANNELS.FILES_GET_DIFF,
    async (
      _event,
      payload: { versionAId: string; versionBId: string }
    ): Promise<IPCResult<any>> => {
      try {
        const { versionAId, versionBId } = payload
        const contentA = backupService.decryptVersion(versionAId)
        const contentB = backupService.decryptVersion(versionBId)
        const diff = computeEnvDiff(versionAId, contentA, versionBId, contentB)
        return { success: true, data: diff }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // Files: Restore
  ipcMain.handle(
    IPC_CHANNELS.FILES_RESTORE,
    async (
      _event,
      payload: { fileId: string; versionId?: string }
    ): Promise<IPCResult<{ targetPath: string; versionNumber: number }>> => {
      try {
        const res = restoreService.restoreFile(payload.fileId, payload.versionId)
        return { success: true, data: { targetPath: res.targetPath, versionNumber: res.versionNumber } }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // Files: Backup Now (Manual)
  ipcMain.handle(IPC_CHANNELS.FILES_BACKUP_NOW, async (_event, fileId: string): Promise<IPCResult<any>> => {
    try {
      const file = vaultDB.getEnvFileById(fileId)
      if (!file) return { success: false, error: 'File not found' }
      const project = vaultDB.getProject(file.projectId)
      if (!project) return { success: false, error: 'Project not found' }

      const res = backupService.backupFile(file, project.path, 'manual', 'Manual backup triggered by user')
      if (!res) return { success: false, error: 'File does not exist on disk' }
      return { success: true, data: res }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Security: Status
  ipcMain.handle(IPC_CHANNELS.SECURITY_GET_STATUS, async (): Promise<IPCResult<any>> => {
    try {
      const stats = vaultDB.getStats()
      return {
        success: true,
        data: {
          isEncrypted: true,
          keySource: 'keychain',
          ...stats
        }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Security: Reuse
  ipcMain.handle(IPC_CHANNELS.SECURITY_GET_REUSE, async (_event, projectId: string): Promise<IPCResult<any>> => {
    try {
      const reuseMap = vaultDB.getReusedSecretsForProject(projectId)
      return { success: true, data: reuseMap }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
