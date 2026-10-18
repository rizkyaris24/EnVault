import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels'
import {
  Project,
  EnvFile,
  EnvVersionSummary,
  SecretEntry,
  DiffResult,
  DiscoveredEnvFile,
  VaultStatus,
  AppInfo,
  UpdateStatus,
  SecretReuseReference,
  ComputerScanSummary,
  ScanProgressPayload,
  IPCResult
} from '../shared/types'

export interface EnVaultApi {
  projects: {
    selectDirectory: () => Promise<IPCResult<string | null>>
    scan: (projectDir: string) => Promise<IPCResult<DiscoveredEnvFile[]>>
    scanComputer: () => Promise<IPCResult<ComputerScanSummary>>
    add: (payload: { path: string; name?: string; selectedFiles: string[] }) => Promise<IPCResult<Project>>
    list: () => Promise<IPCResult<Project[]>>
    remove: (projectId: string) => Promise<IPCResult>
    reveal: (targetPath: string) => Promise<IPCResult>
  }
  files: {
    getByProject: (projectId: string) => Promise<IPCResult<EnvFile[]>>
    getVersions: (fileId: string) => Promise<IPCResult<EnvVersionSummary[]>>
    getDecrypted: (payload: { versionId: string; projectId: string }) => Promise<IPCResult<{ raw: string; secrets: SecretEntry[] }>>
    getDiff: (payload: { versionAId: string; versionBId: string }) => Promise<IPCResult<DiffResult>>
    restore: (payload: { fileId: string; versionId?: string }) => Promise<IPCResult<{ targetPath: string; versionNumber: number }>>
    backupNow: (fileId: string) => Promise<IPCResult<any>>
  }
  security: {
    getStatus: () => Promise<IPCResult<VaultStatus>>
    getReuse: (projectId: string) => Promise<IPCResult<Record<string, SecretReuseReference[]>>>
    unlock: (passphrase: string) => Promise<IPCResult>
    setPassphrase: (passphrase: string, currentPassphrase?: string) => Promise<IPCResult>
  }
  settings: {
    get: (key: string) => Promise<IPCResult<string | null>>
    set: (key: string, value: string) => Promise<IPCResult>
  }
  app: {
    getInfo: () => Promise<IPCResult<AppInfo>>
    reveal: (target: 'vault' | 'logs') => Promise<IPCResult>
    getDiagnostics: () => Promise<IPCResult<string>>
  }
  vault: {
    exportTo: (passphrase: string) => Promise<IPCResult<{ path: string } | null>>
    importFrom: (passphrase: string) => Promise<IPCResult<{ projects: number; files: number; versions: number } | null>>
  }
  updates: {
    getStatus: () => Promise<IPCResult<UpdateStatus>>
    check: () => Promise<IPCResult<UpdateStatus>>
    install: () => Promise<IPCResult>
  }
  clipboard: {
    copySecret: (text: string) => Promise<IPCResult>
  }
  setTheme: (theme: 'system' | 'light' | 'dark') => Promise<IPCResult<boolean>>
  onBackupUpdated: (callback: (payload: { fileId: string; projectId: string; version: any }) => void) => () => void
  onFileStatusChanged: (callback: (payload: { fileId: string; projectId: string; existsOnDisk: boolean }) => void) => () => void
  onScanProgress: (callback: (payload: ScanProgressPayload) => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
}

const api: EnVaultApi = {
  projects: {
    selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY),
    scan: (projectDir) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_SCAN, projectDir),
    scanComputer: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_SCAN_COMPUTER),
    add: (payload) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_ADD, payload),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_LIST),
    remove: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_REMOVE, projectId),
    reveal: (targetPath) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_REVEAL, targetPath)
  },
  files: {
    getByProject: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.FILES_GET_BY_PROJECT, projectId),
    getVersions: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.FILES_GET_VERSIONS, fileId),
    getDecrypted: (payload) => ipcRenderer.invoke(IPC_CHANNELS.FILES_GET_DECRYPTED, payload),
    getDiff: (payload) => ipcRenderer.invoke(IPC_CHANNELS.FILES_GET_DIFF, payload),
    restore: (payload) => ipcRenderer.invoke(IPC_CHANNELS.FILES_RESTORE, payload),
    backupNow: (fileId) => ipcRenderer.invoke(IPC_CHANNELS.FILES_BACKUP_NOW, fileId)
  },
  security: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_STATUS),
    getReuse: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_REUSE, projectId),
    unlock: (passphrase) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_UNLOCK, passphrase),
    setPassphrase: (passphrase, currentPassphrase) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_SET_PASSPHRASE, passphrase, currentPassphrase)
  },
  settings: {
    get: (key) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value)
  },
  app: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO),
    reveal: (target) => ipcRenderer.invoke(IPC_CHANNELS.APP_REVEAL, target),
    getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.APP_DIAGNOSTICS)
  },
  vault: {
    exportTo: (passphrase) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_EXPORT, passphrase),
    importFrom: (passphrase) => ipcRenderer.invoke(IPC_CHANNELS.VAULT_IMPORT, passphrase)
  },
  updates: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_STATUS),
    check: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL)
  },
  clipboard: {
    copySecret: (text) => ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_COPY_SECRET, text)
  },
  setTheme: (theme) => ipcRenderer.invoke(IPC_CHANNELS.THEME_SET, theme),
  onBackupUpdated: (callback) => {
    const handler = (_event: any, payload: any): void => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.EVENT_BACKUP_UPDATED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_BACKUP_UPDATED, handler)
    }
  },
  onFileStatusChanged: (callback) => {
    const handler = (_event: any, payload: any): void => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.EVENT_FILE_STATUS_CHANGED, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_FILE_STATUS_CHANGED, handler)
    }
  },
  onScanProgress: (callback) => {
    const handler = (_event: any, payload: any): void => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.EVENT_SCAN_PROGRESS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_SCAN_PROGRESS, handler)
    }
  },
  onOpenSettings: (callback) => {
    const handler = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.EVENT_OPEN_SETTINGS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_OPEN_SETTINGS, handler)
    }
  },
  onUpdateStatus: (callback) => {
    const handler = (_event: any, status: UpdateStatus): void => callback(status)
    ipcRenderer.on(IPC_CHANNELS.EVENT_UPDATE_STATUS, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_UPDATE_STATUS, handler)
    }
  }
}

try {
  contextBridge.exposeInMainWorld('envaultApi', api)
} catch (error) {
  console.error('Failed to expose envaultApi in preload:', error)
}
