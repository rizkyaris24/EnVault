import * as fs from 'fs'
import * as path from 'path'
import chokidar, { FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { vaultDB } from './db'
import { backupService } from './backupService'
import { IPC_CHANNELS } from '../../shared/ipcChannels'
import { getLogger } from '../utils/logger'

export class FileWatcherService {
  private watchers = new Map<string, FSWatcher>()
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private suppressedPaths = new Map<string, number>()
  private mainWindow: BrowserWindow | null = null
  /** Projects whose folder was missing (unplugged drive, moved folder); retried until it reappears. */
  private pendingProjects = new Map<string, string>()
  private retryTimer: NodeJS.Timeout | null = null

  public setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  /**
   * Prevents self-triggered loops when EnVault writes to disk (e.g. restore)
   */
  public suppressNextChangeEvent(filePath: string): void {
    const normalized = path.resolve(filePath)
    this.suppressedPaths.set(normalized, Date.now() + 3000) // suppress for 3s
  }

  public clearSuppression(filePath: string): void {
    this.suppressedPaths.delete(path.resolve(filePath))
  }

  private isSuppressed(filePath: string): boolean {
    const normalized = path.resolve(filePath)
    const expires = this.suppressedPaths.get(normalized)
    if (!expires) return false

    if (Date.now() > expires) {
      this.suppressedPaths.delete(normalized)
      return false
    }

    this.suppressedPaths.delete(normalized)
    return true
  }

  /**
   * Initializes watchers for all currently registered projects
   */
  public initAllWatchers(): void {
    const projects = vaultDB.getProjects()
    for (const project of projects) {
      this.watchProject(project.id, project.path)
    }
  }

  /**
   * Starts watching a project directory for .env file modifications
   */
  public watchProject(projectId: string, projectDir: string): void {
    if (this.watchers.has(projectId)) {
      this.unwatchProject(projectId)
    }

    if (!fs.existsSync(projectDir)) {
      this.pendingProjects.set(projectId, projectDir)
      this.startRetryTimer()
      return
    }
    this.pendingProjects.delete(projectId)

    const watcher = chokidar.watch(projectDir, {
      depth: 0,
      ignoreInitial: true,
      persistent: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/*.tmp*',
        '**/.*.tmp.*'
      ]
    })

    watcher.on('add', (filePath) => this.handleFileEvent(projectId, projectDir, filePath, 'add'))
    watcher.on('change', (filePath) => this.handleFileEvent(projectId, projectDir, filePath, 'change'))
    watcher.on('unlink', (filePath) => this.handleFileEvent(projectId, projectDir, filePath, 'unlink'))
    // An unhandled watcher error (EMFILE, EPERM, folder removed) would otherwise crash the main process.
    watcher.on('error', (err) => {
      getLogger().error(`File watcher error for project ${projectId}`, err)
      this.unwatchProject(projectId)
      this.pendingProjects.set(projectId, projectDir)
      this.startRetryTimer()
    })

    this.watchers.set(projectId, watcher)
  }

  private startRetryTimer(): void {
    if (this.retryTimer) return
    this.retryTimer = setInterval(() => {
      for (const [id, dir] of [...this.pendingProjects]) {
        if (fs.existsSync(dir)) this.watchProject(id, dir)
      }
      if (this.pendingProjects.size === 0 && this.retryTimer) {
        clearInterval(this.retryTimer)
        this.retryTimer = null
      }
    }, 30_000)
    this.retryTimer.unref?.()
  }

  public unwatchProject(projectId: string): void {
    this.pendingProjects.delete(projectId)
    const watcher = this.watchers.get(projectId)
    if (watcher) {
      watcher.close()
      this.watchers.delete(projectId)
    }
  }

  private handleFileEvent(
    projectId: string,
    projectDir: string,
    filePath: string,
    eventType: 'add' | 'change' | 'unlink'
  ): void {
    const fileName = path.basename(filePath)
    if (!fileName.startsWith('.env')) return

    const normalizedPath = path.resolve(filePath)
    if (this.isSuppressed(normalizedPath)) {
      return
    }

    const existingTimer = this.debounceTimers.get(normalizedPath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(normalizedPath)
      this.processFileChange(projectId, projectDir, fileName, eventType)
    }, 300)

    this.debounceTimers.set(normalizedPath, timer)
  }

  private processFileChange(
    projectId: string,
    projectDir: string,
    fileName: string,
    eventType: 'add' | 'change' | 'unlink'
  ): void {
    const envFile = vaultDB.getEnvFileByPath(projectId, fileName)
    if (!envFile || !envFile.isActive) return

    if (eventType === 'unlink') {
      // File was deleted on disk! Notify UI
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.EVENT_FILE_STATUS_CHANGED, {
          fileId: envFile.id,
          projectId,
          existsOnDisk: false
        })
      }
      return
    }

    // File was added or modified
    try {
      const result = backupService.backupFile(envFile, projectDir, 'watch')
      if (result && !result.skippedDuplicate) {
        // Broadcast new snapshot created
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.EVENT_BACKUP_UPDATED, {
            fileId: envFile.id,
            projectId,
            version: result.version
          })
        }
      }
    } catch (err) {
      getLogger().error(`Watcher backup failed for ${fileName}`, err)
    }
  }

  public closeAll(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer)
      this.retryTimer = null
    }
    this.pendingProjects.clear()
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}

export const fileWatcherService = new FileWatcherService()
