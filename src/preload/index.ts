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
  }
  onBackupUpdated: (callback: (payload: { fileId: string; projectId: string; version: any }) => void) => () => void
  onFileStatusChanged: (callback: (payload: { fileId: string; projectId: string; existsOnDisk: boolean }) => void) => () => void
  onScanProgress: (callback: (payload: ScanProgressPayload) => void) => () => void
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
    getReuse: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_REUSE, projectId)
  },
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
  }
}

try {
  contextBridge.exposeInMainWorld('envaultApi', api)
} catch (error) {
  console.error('Failed to expose envaultApi in preload:', error)
}
