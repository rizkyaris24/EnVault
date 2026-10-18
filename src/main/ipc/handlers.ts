import { app, ipcMain, dialog, shell, clipboard, BrowserWindow, nativeTheme, IpcMainInvokeEvent } from 'electron'
import * as os from 'os'
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
import { createClipboardGuard } from '../utils/clipboardGuard'
import { getLogger } from '../utils/logger'
import { atomicWriteFileSync } from '../utils/atomicWrite'
import { exportVault, importVault } from '../services/vaultTransfer'
import { buildDiagnostics } from '../services/diagnostics'
import { isTrustedSenderUrl, isSafeId, parseTheme, parseAddPayload, isInside, parseSetting, SETTING_KEYS } from './validate'
import { SecretEntry, AppInfo, IPCResult, Project, EnvFile, ComputerScanSummary, VaultStatus } from '../../shared/types'

/** Secrets copied from the UI are cleared from the clipboard after 30 seconds. */
export const secretClipboard = createClipboardGuard(clipboard, 30_000)

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

  // Projects: List (two queries total, file checks run in parallel)
  handle(IPC_CHANNELS.PROJECTS_LIST, async (): Promise<Project[]> => {
    const projects = vaultDB.getProjects()
    const reuseCounts = vaultDB.getReuseCountsByProject()
    const pathsByProject = new Map<string, string[]>()
    for (const f of vaultDB.getActiveFilePaths()) {
      const list = pathsByProject.get(f.projectId) ?? []
      list.push(f.relativePath)
      pathsByProject.set(f.projectId, list)
    }
    return Promise.all(
      projects.map(async (p) => {
        const checks = await Promise.all(
          (pathsByProject.get(p.id) ?? []).map((rel) =>
            fs.promises.access(path.join(p.path, rel)).then(
              () => true,
              () => false
            )
          )
        )
        return { ...p, hasMissingFiles: checks.some((ok) => !ok), reuseWarningCount: reuseCounts.get(p.id) ?? 0 }
      })
    )
  })

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

  // Settings (allowlisted UI settings only)
  handle(IPC_CHANNELS.SETTINGS_GET, (_e, key: unknown): string | null => {
    if (typeof key !== 'string' || !SETTING_KEYS.includes(key)) throw new Error('Unknown setting')
    return vaultDB.getMeta(key)
  })

  handle(IPC_CHANNELS.SETTINGS_SET, (_e, key: unknown, value: unknown) => {
    const setting = parseSetting(key, value)
    if (!setting) throw new Error('Invalid setting')
    vaultDB.setMeta(setting.key, setting.value)
    if (setting.key === 'retention_days') vaultDB.applyRetention()
  })

  const vaultFile = (): string => path.join(app.getPath('userData'), 'envault.db')

  handle(IPC_CHANNELS.APP_GET_INFO, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    vaultPath: vaultFile(),
    logPath: getLogger().path
  }), { allowLocked: true })

  handle(IPC_CHANNELS.APP_REVEAL, (_e, target: unknown) => {
    if (target === 'vault') shell.showItemInFolder(vaultFile())
    else if (target === 'logs' && getLogger().path) shell.showItemInFolder(getLogger().path)
    else throw new Error('Nothing to reveal')
  })

  handle(IPC_CHANNELS.APP_DIAGNOSTICS, (): string =>
    buildDiagnostics({
      appVersion: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      vaultState: vaultCrypto.getState(),
      keySource: vaultCrypto.getKeySource(),
      hasRecovery: vaultCrypto.hasRecovery(),
      schemaVersion: vaultDB.getSchemaVersion(),
      stats: vaultDB.getStats(),
      retentionDays: vaultDB.getMeta('retention_days') ?? '90',
      quitOnClose: vaultDB.getMeta('quit_on_close') ?? '0',
      logTail: getLogger().readTail(20_000)
    })
  )

  // Vault: export everything to one passphrase-protected file
  handle(IPC_CHANNELS.VAULT_EXPORT, async (_e, passphrase: unknown): Promise<{ path: string } | null> => {
    if (typeof passphrase !== 'string') throw new Error('Invalid passphrase')
    const contents = exportVault(vaultDB, vaultCrypto, passphrase) // validates the passphrase before asking for a location
    const res = await dialog.showSaveDialog(getWindow()!, {
      title: 'Export EnVault backup',
      defaultPath: `EnVault-backup-${new Date().toISOString().slice(0, 10)}.envault`,
      filters: [{ name: 'EnVault backup', extensions: ['envault'] }]
    })
    if (res.canceled || !res.filePath) return null
    atomicWriteFileSync(res.filePath, contents, 'utf8')
    getLogger().info('Vault exported')
    return { path: res.filePath }
  })

  // Vault: replace this vault with an export file
  handle(
    IPC_CHANNELS.VAULT_IMPORT,
    async (_e, passphrase: unknown): Promise<{ projects: number; files: number; versions: number } | null> => {
      if (typeof passphrase !== 'string') throw new Error('Invalid passphrase')
      const res = await dialog.showOpenDialog(getWindow()!, {
        title: 'Import EnVault backup',
        properties: ['openFile'],
        filters: [{ name: 'EnVault backup', extensions: ['envault'] }]
      })
      if (res.canceled || res.filePaths.length === 0) return null
      const file = res.filePaths[0]
      if (fs.statSync(file).size > 500 * 1024 * 1024) throw new Error('This file is too large to be an EnVault backup')
      const result = importVault(vaultDB, vaultCrypto, fs.readFileSync(file, 'utf8'), passphrase)
      fileWatcherService.closeAll()
      fileWatcherService.initAllWatchers()
      getLogger().info('Vault imported')
      return result
    }
  )

  // Clipboard: copy a secret and auto-clear it
  handle(IPC_CHANNELS.CLIPBOARD_COPY_SECRET, (_e, text: unknown) => {
    if (typeof text !== 'string' || text.length > 2 * 1024 * 1024) throw new Error('Invalid text')
    secretClipboard.copySecret(text)
  })

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
