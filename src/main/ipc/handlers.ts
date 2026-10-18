import { ipcMain, dialog, shell, BrowserWindow, nativeTheme, IpcMainInvokeEvent } from 'electron'
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
import { isTrustedSenderUrl, isSafeId, parseTheme, parseAddPayload, isInside } from './validate'
import { SecretEntry, IPCResult, Project, EnvFile, ComputerScanSummary, VaultStatus } from '../../shared/types'

export interface HandlerDeps {
  getWindow: () => BrowserWindow | null
  /** Called once the vault key is available (startup, unlock, or first passphrase). */
  onVaultReady: () => void
}

/** Registered once at app start. Every channel checks the sender, the vault lock, and returns a uniform IPCResult. */
export function registerIpcHandlers({ getWindow, onVaultReady }: HandlerDeps): void {
  // Directories the user picked in the native dialog this session; the only ones Add/Scan will accept.
  const approvedDirs = new Set<string>()

  function handle<T>(
    channel: string,
    fn: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T,
    opts: { allowLocked?: boolean } = {}
  ): void {
    ipcMain.handle(channel, async (event, ...args): Promise<IPCResult<T>> => {
      if (!isTrustedSenderUrl(event.senderFrame?.url, process.env['ELECTRON_RENDERER_URL'])) {
        return { success: false, error: 'Untrusted sender' }
      }
      if (!opts.allowLocked && !vaultCrypto.isReady()) {
        return { success: false, error: 'Vault is locked' }
      }
      try {
        return { success: true, data: await fn(event, ...args) }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    })
  }

  const requireId = (v: unknown, label: string): string => {
    if (!isSafeId(v)) throw new Error(`Invalid ${label}`)
    return v
  }

  const requireApprovedDir = (dir: unknown): string => {
    if (typeof dir !== 'string' || !path.isAbsolute(dir) || !fs.existsSync(dir)) {
      throw new Error('Directory does not exist')
    }
    if (!approvedDirs.has(fs.realpathSync(dir))) {
      throw new Error('Choose this folder with the folder picker first')
    }
    return dir
  }

  // Dialog: Select Directory
  handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async (): Promise<string | null> => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Select Project Directory',
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    approvedDirs.add(fs.realpathSync(res.filePaths[0]))
    return res.filePaths[0]
  })

  // Projects: Scan Single Directory
  handle(IPC_CHANNELS.PROJECTS_SCAN, (_e, projectDir: unknown) => discoverEnvFiles(requireApprovedDir(projectDir)))

  // Projects: Scan Computer & Auto-Save
  handle(IPC_CHANNELS.PROJECTS_SCAN_COMPUTER, (): Promise<ComputerScanSummary> =>
    scanComputerAndAutoSave({
      onProgress: (progress) => {
        const win = getWindow()
        if (win && !win.isDestroyed()) win.webContents.send(IPC_CHANNELS.EVENT_SCAN_PROGRESS, progress)
      }
    })
  )

  // Projects: Add with Selected Files
  handle(IPC_CHANNELS.PROJECTS_ADD, (_e, raw: unknown): Project => {
    const payload = parseAddPayload(raw)
    if (!payload) throw new Error('Invalid request')
    const projectPath = requireApprovedDir(payload.path)

    if (vaultDB.getProjectByPath(projectPath)) {
      throw new Error('This project directory is already registered in EnVault')
    }

    // Only files that really exist in the folder can be registered.
    const available = new Set(discoverEnvFiles(projectPath).map((f) => f.relativePath))
    if (!payload.selectedFiles.every((f) => available.has(f))) {
      throw new Error('One or more selected files were not found in this folder')
    }

    const projectId = crypto.randomUUID()
    const project = vaultDB.createProject(projectId, payload.name?.trim() || path.basename(projectPath), projectPath)
    try {
      for (const relativePath of payload.selectedFiles) {
        const envFile = vaultDB.createEnvFile(crypto.randomUUID(), projectId, relativePath)
        backupService.backupFile(envFile, projectPath, 'manual', 'Initial project import')
      }
    } catch (err) {
      vaultDB.deleteProject(projectId) // no half-registered projects
      throw err
    }

    fileWatcherService.watchProject(projectId, projectPath)
    return project
  })

  // Projects: List
  handle(IPC_CHANNELS.PROJECTS_LIST, (): Project[] =>
    vaultDB.getProjects().map((p) => {
      const files = vaultDB.getEnvFiles(p.id)
      const hasMissing = files.some((f) => !fs.existsSync(path.join(p.path, f.relativePath)))
      const reuseCount = Object.keys(vaultDB.getReusedSecretsForProject(p.id)).length
      return { ...p, hasMissingFiles: hasMissing, reuseWarningCount: reuseCount }
    })
  )

  // Projects: Remove
  handle(IPC_CHANNELS.PROJECTS_REMOVE, (_e, projectId: unknown) => {
    const id = requireId(projectId, 'project id')
    fileWatcherService.unwatchProject(id)
    vaultDB.deleteProject(id)
  })

  // Projects: Reveal in OS Finder / Explorer (registered project folders only)
  handle(IPC_CHANNELS.PROJECTS_REVEAL, (_e, targetPath: unknown) => {
    if (typeof targetPath !== 'string' || !vaultDB.getProjects().some((p) => isInside(p.path, targetPath))) {
      throw new Error('Path is not inside a tracked project')
    }
    if (!fs.existsSync(targetPath)) throw new Error('Path does not exist on disk')
    shell.showItemInFolder(targetPath)
  })

  // Files: Get By Project
  handle(IPC_CHANNELS.FILES_GET_BY_PROJECT, (_e, projectId: unknown): EnvFile[] => {
    const project = vaultDB.getProject(requireId(projectId, 'project id'))
    if (!project) throw new Error('Project not found')
    return vaultDB.getEnvFiles(project.id).map((f) => ({
      ...f,
      existsOnDisk: fs.existsSync(path.join(project.path, f.relativePath))
    }))
  })

  // Files: Get Versions
  handle(IPC_CHANNELS.FILES_GET_VERSIONS, (_e, fileId: unknown) => vaultDB.getVersions(requireId(fileId, 'file id')))

  // Files: Get Decrypted Content & Secret Entries
  handle(IPC_CHANNELS.FILES_GET_DECRYPTED, (_e, payload: any): { raw: string; secrets: SecretEntry[] } => {
    const versionId = requireId(payload?.versionId, 'version id')
    const projectId = requireId(payload?.projectId, 'project id')
    const raw = backupService.decryptVersion(versionId)
    const parsed = parseEnv(raw)
    const reuseMap = vaultDB.getReusedSecretsForProject(projectId)
    const secrets = Object.entries(parsed.entries).map(([key, value]) => ({
      key,
      value,
      reusedIn: reuseMap[key] || []
    }))
    return { raw, secrets }
  })

  // Files: Get Diff
  handle(IPC_CHANNELS.FILES_GET_DIFF, (_e, payload: any) => {
    const a = requireId(payload?.versionAId, 'version id')
    const b = requireId(payload?.versionBId, 'version id')
    return computeEnvDiff(a, backupService.decryptVersion(a), b, backupService.decryptVersion(b))
  })

  // Files: Restore
  handle(IPC_CHANNELS.FILES_RESTORE, (_e, payload: any) => {
    const fileId = requireId(payload?.fileId, 'file id')
    const versionId = payload?.versionId === undefined ? undefined : requireId(payload.versionId, 'version id')
    const res = restoreService.restoreFile(fileId, versionId)
    return { targetPath: res.targetPath, versionNumber: res.versionNumber }
  })

  // Files: Backup Now (Manual)
  handle(IPC_CHANNELS.FILES_BACKUP_NOW, (_e, fileId: unknown) => {
    const file = vaultDB.getEnvFileById(requireId(fileId, 'file id'))
    if (!file) throw new Error('File not found')
    const project = vaultDB.getProject(file.projectId)
    if (!project) throw new Error('Project not found')
    const res = backupService.backupFile(file, project.path, 'manual', 'Manual backup triggered by user')
    if (!res) throw new Error('File does not exist on disk')
    return res
  })

  // Security: Status (also answers while locked so the UI can show the unlock screen)
  handle(
    IPC_CHANNELS.SECURITY_GET_STATUS,
    (): VaultStatus => ({
      isEncrypted: true,
      state: vaultCrypto.getState(),
      keySource: vaultCrypto.getKeySource(),
      hasRecovery: vaultCrypto.hasRecovery(),
      ...vaultDB.getStats()
    }),
    { allowLocked: true }
  )

  // Security: Reuse
  handle(IPC_CHANNELS.SECURITY_GET_REUSE, (_e, projectId: unknown) =>
    vaultDB.getReusedSecretsForProject(requireId(projectId, 'project id'))
  )

  // Vault: Unlock with passphrase
  handle(
    IPC_CHANNELS.VAULT_UNLOCK,
    (_e, passphrase: unknown) => {
      if (typeof passphrase !== 'string') throw new Error('Invalid passphrase')
      vaultCrypto.unlock(passphrase)
      onVaultReady()
    },
    { allowLocked: true }
  )

  // Vault: Set master / recovery passphrase
  handle(
    IPC_CHANNELS.VAULT_SET_PASSPHRASE,
    (_e, passphrase: unknown) => {
      if (typeof passphrase !== 'string') throw new Error('Invalid passphrase')
      const wasWaiting = vaultCrypto.getState() === 'needs-passphrase-setup'
      vaultCrypto.setPassphrase(passphrase)
      if (wasWaiting) onVaultReady()
    },
    { allowLocked: true }
  )

  // Theme: Set
  handle(IPC_CHANNELS.THEME_SET, (_e, raw: unknown): boolean => {
    const theme = parseTheme(raw)
    if (!theme) throw new Error('Invalid theme')
    nativeTheme.themeSource = theme
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      const isDark = theme === 'system' ? nativeTheme.shouldUseDarkColors : theme === 'dark'
      win.setBackgroundColor(isDark ? '#0B0B0C' : '#FFFFFF')
    }
    return true
  }, { allowLocked: true })
}
