import React, { useState, useEffect, useCallback } from 'react'
import {
  Project,
  EnvFile,
  EnvVersionSummary,
  SecretEntry,
  DiscoveredEnvFile,
  DiffResult,
  VaultStatus,
  ComputerScanSummary,
  ScanProgressPayload
} from '@shared/types'
import { Sidebar } from './components/Sidebar/Sidebar'
import { ProjectHeader } from './components/ProjectDetail/ProjectHeader'
import { MissingFileBanner } from './components/ProjectDetail/MissingFileBanner'
import { SecretTable } from './components/ProjectDetail/SecretTable'
import { RawViewer } from './components/ProjectDetail/RawViewer'
import { VersionTimeline } from './components/History/VersionTimeline'
import { ImportChecklistModal } from './components/Modals/ImportChecklistModal'
import { DiffModal } from './components/Modals/DiffModal'
import { ConfirmRestoreModal } from './components/Modals/ConfirmRestoreModal'
import { ComputerScanModal } from './components/Modals/ComputerScanModal'
import { DeleteProjectModal } from './components/Modals/DeleteProjectModal'
import { ToastContainer, ToastMessage } from './components/Common/Toast'
import {
  FolderLock,
  ShieldCheck,
  Plus,
  Radar,
  Lock,
  RotateCcw,
  FileCode
} from 'lucide-react'

export const App: React.FC = () => {
  // Global State
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Project Detail State
  const [files, setFiles] = useState<EnvFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'table' | 'raw' | 'history'>('table')
  const [versions, setVersions] = useState<EnvVersionSummary[]>([])
  const [rawContent, setRawContent] = useState<string>('')
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false)

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importDir, setImportDir] = useState('')
  const [discoveredFiles, setDiscoveredFiles] = useState<DiscoveredEnvFile[]>([])
  const [isImportLoading, setIsImportLoading] = useState(false)

  const [diffModal, setDiffModal] = useState<{
    isOpen: boolean
    diff: DiffResult | null
    versionAName: string
    versionBName: string
  }>({
    isOpen: false,
    diff: null,
    versionAName: '',
    versionBName: ''
  })

  const [restoreModal, setRestoreModal] = useState<{
    isOpen: boolean
    file: EnvFile | null
    version: EnvVersionSummary | null
    isLoading: boolean
  }>({
    isOpen: false,
    file: null,
    version: null,
    isLoading: false
  })

  const [computerScanModal, setComputerScanModal] = useState<{
    isOpen: boolean
    isScanning: boolean
    progress: ScanProgressPayload | null
    summary: ComputerScanSummary | null
  }>({
    isOpen: false,
    isScanning: false,
    progress: null,
    summary: null
  })

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    project: { id: string; name: string; path?: string } | null
    isLoading: boolean
  }>({
    isOpen: false,
    project: null,
    isLoading: false
  })

  const addToast = (type: ToastMessage['type'], title: string, message?: string): void => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, title, message }])
  }

  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Load projects & vault status
  const loadProjects = useCallback(async (): Promise<void> => {
    const res = await window.envaultApi.projects.list()
    if (res.success && res.data) {
      setProjects(res.data)
      if (!selectedProjectId && res.data.length > 0) {
        setSelectedProjectId(res.data[0].id)
      }
    }
  }, [selectedProjectId])

  const loadVaultStatus = useCallback(async (): Promise<void> => {
    const res = await window.envaultApi.security.getStatus()
    if (res.success && res.data) {
      setVaultStatus(res.data)
    }
  }, [])

  useEffect(() => {
    loadProjects()
    loadVaultStatus()

    // Watcher event listeners
    const unbindBackup = window.envaultApi.onBackupUpdated(({ fileId }: { fileId: string; projectId: string; version: any }) => {
      addToast('info', 'Auto-Backup Recorded', 'A change to your .env file was silently encrypted.')
      loadProjects()
      if (selectedFileId === fileId) {
        loadFileDetails(fileId)
      }
    })

    const unbindStatus = window.envaultApi.onFileStatusChanged(({ fileId, existsOnDisk }: { fileId: string; projectId: string; existsOnDisk: boolean }) => {
      if (!existsOnDisk) {
        addToast('warning', 'File Missing on Disk', 'A .env file was removed from the project folder.')
      }
      loadProjects()
      if (selectedFileId === fileId) {
        loadFileDetails(fileId)
      }
    })

    const unbindScanProgress = window.envaultApi.onScanProgress((progress: ScanProgressPayload) => {
      setComputerScanModal((prev) => ({ ...prev, progress }))
    })

    return () => {
      unbindBackup()
      unbindStatus()
      unbindScanProgress()
    }
  }, [loadProjects, loadVaultStatus, selectedFileId])

  // Load files when selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setFiles([])
      setSelectedFileId(null)
      return
    }

    window.envaultApi.files.getByProject(selectedProjectId).then((res: { success: boolean; data?: EnvFile[]; error?: string }) => {
      if (res.success && res.data) {
        setFiles(res.data)
        if (res.data.length > 0) {
          // Default to first file or existing selection if present
          const match = res.data.find((f: EnvFile) => f.id === selectedFileId)
          setSelectedFileId(match ? match.id : res.data[0].id)
        } else {
          setSelectedFileId(null)
        }
      }
    })
  }, [selectedProjectId])

  // Load file versions & decrypted content
  const loadFileDetails = useCallback(
    async (fileId: string): Promise<void> => {
      const vRes = await window.envaultApi.files.getVersions(fileId)
      if (vRes.success && vRes.data) {
        setVersions(vRes.data)
        if (vRes.data.length > 0 && selectedProjectId) {
          const latest = vRes.data[0]
          const cRes = await window.envaultApi.files.getDecrypted({
            versionId: latest.id,
            projectId: selectedProjectId
          })
          if (cRes.success && cRes.data) {
            setRawContent(cRes.data.raw)
            setSecrets(cRes.data.secrets)
          }
        } else {
          setRawContent('')
          setSecrets([])
        }
      }
    },
    [selectedProjectId]
  )

  useEffect(() => {
    if (selectedFileId) {
      loadFileDetails(selectedFileId)
    } else {
      setVersions([])
      setRawContent('')
      setSecrets([])
    }
  }, [selectedFileId, loadFileDetails])

  // Handlers
  const handleAddProject = useCallback(async (): Promise<void> => {
    const dirRes = await window.envaultApi.projects.selectDirectory()
    if (!dirRes.success || !dirRes.data) return

    const dir = dirRes.data
    setImportDir(dir)

    const scanRes = await window.envaultApi.projects.scan(dir)
    if (scanRes.success && scanRes.data) {
      setDiscoveredFiles(scanRes.data)
      setIsImportModalOpen(true)
    } else {
      addToast('error', 'Failed to scan directory', scanRes.error)
    }
  }, [])

  const handleConfirmImport = async (selectedPaths: string[], projectName: string): Promise<void> => {
    setIsImportLoading(true)
    const addRes = await window.envaultApi.projects.add({
      path: importDir,
      name: projectName,
      selectedFiles: selectedPaths
    })
    setIsImportLoading(false)

    if (addRes.success && addRes.data) {
      setIsImportModalOpen(false)
      addToast(
        'success',
        'Project Registered',
        `Tracking ${selectedPaths.length} .env file(s) with passive backup.`
      )
      await loadProjects()
      setSelectedProjectId(addRes.data.id)
    } else {
      addToast('error', 'Could not register project', addRes.error)
    }
  }

  const handleDeleteProject = (id: string, name: string): void => {
    const proj = projects.find((p) => p.id === id)
    setDeleteModal({
      isOpen: true,
      project: { id, name, path: proj?.path },
      isLoading: false
    })
  }

  const handleConfirmDeleteProject = async (): Promise<void> => {
    if (!deleteModal.project) return
    const { id, name } = deleteModal.project
    setDeleteModal((prev) => ({ ...prev, isLoading: true }))
    try {
      const res = await window.envaultApi.projects.remove(id)
      if (res.success) {
        addToast('info', 'Project Removed', `Removed ${name} from EnVault.`)
        const updated = projects.filter((p) => p.id !== id)
        setProjects(updated)
        setSelectedProjectId(updated.length > 0 ? updated[0].id : null)
        setDeleteModal({ isOpen: false, project: null, isLoading: false })
      } else {
        addToast('error', 'Failed to Remove Project', res.error)
        setDeleteModal((prev) => ({ ...prev, isLoading: false }))
      }
    } catch (err) {
      addToast('error', 'Error', (err as Error).message)
      setDeleteModal((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleScanComputer = useCallback(async (): Promise<void> => {
    setComputerScanModal({
      isOpen: true,
      isScanning: true,
      progress: null,
      summary: null
    })

    const res = await window.envaultApi.projects.scanComputer()
    if (res.success && res.data) {
      setComputerScanModal((prev) => ({
        ...prev,
        isScanning: false,
        summary: res.data!
      }))
      addToast(
        'success',
        'Computer Scan Complete',
        `Discovered ${res.data.discoveredFiles} file(s) across ${res.data.discoveredProjects} project(s). Automatically backed up.`
      )
      await loadProjects()
      await loadVaultStatus()
    } else {
      setComputerScanModal({
        isOpen: false,
        isScanning: false,
        progress: null,
        summary: null
      })
      addToast('error', 'Computer scan failed', res.error)
    }
  }, [loadProjects, loadVaultStatus])

  // Global keyboard shortcuts (Jakob's Law)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Cmd+K: Focus search input
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search projects"]')
        searchInput?.focus()
        return
      }

      if (!isInput) {
        // Cmd+N: Add Project Folder
        if (cmdOrCtrl && e.key.toLowerCase() === 'n') {
          e.preventDefault()
          handleAddProject()
          return
        }

        // Shift+Cmd+S: Scan Computer
        if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault()
          handleScanComputer()
          return
        }

        // Cmd+1 / Cmd+2 / Cmd+3: Switch view modes
        if (cmdOrCtrl && e.key === '1') {
          e.preventDefault()
          setActiveView('table')
          return
        }
        if (cmdOrCtrl && e.key === '2') {
          e.preventDefault()
          setActiveView('raw')
          return
        }
        if (cmdOrCtrl && e.key === '3') {
          e.preventDefault()
          setActiveView('history')
          return
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleAddProject, handleScanComputer])

  const handleBackupNow = async (): Promise<void> => {
    if (!selectedFileId) return
    setIsBackingUp(true)
    const res = await window.envaultApi.files.backupNow(selectedFileId)
    setIsBackingUp(false)

    if (res.success) {
      addToast('success', 'Manual Snapshot Created', 'New encrypted snapshot saved to vault.')
      loadFileDetails(selectedFileId)
      loadProjects()
    } else {
      addToast('error', 'Backup failed', res.error)
    }
  }

  const handleCompareWithLatest = async (versionId: string): Promise<void> => {
    if (!versions || versions.length === 0) return
    const latest = versions[0]
    const diffRes = await window.envaultApi.files.getDiff({
      versionAId: versionId,
      versionBId: latest.id
    })

    if (diffRes.success && diffRes.data) {
      const selectedV = versions.find((v) => v.id === versionId)
      setDiffModal({
        isOpen: true,
        diff: diffRes.data,
        versionAName: `v${selectedV?.versionNumber ?? '?'}`,
        versionBName: `v${latest.versionNumber} (Current)`
      })
    } else {
      addToast('error', 'Failed to generate diff', diffRes.error)
    }
  }

  const handleTriggerRestore = (version?: EnvVersionSummary): void => {
    const curFile = files.find((f) => f.id === selectedFileId)
    if (!curFile) return
    const targetVersion = version || (versions.length > 0 ? versions[0] : null)

    setRestoreModal({
      isOpen: true,
      file: curFile,
      version: targetVersion,
      isLoading: false
    })
  }

  const handleExecuteRestore = async (): Promise<void> => {
    if (!restoreModal.file || !restoreModal.version) return
    setRestoreModal((prev) => ({ ...prev, isLoading: true }))

    const res = await window.envaultApi.files.restore({
      fileId: restoreModal.file.id,
      versionId: restoreModal.version.id
    })

    setRestoreModal({ isOpen: false, file: null, version: null, isLoading: false })

    if (res.success && res.data) {
      addToast(
        'success',
        'Restored Successfully',
        `Wrote snapshot v${res.data.versionNumber} back to ${res.data.targetPath}`
      )
      if (selectedFileId) {
        loadFileDetails(selectedFileId)
      }
      loadProjects()
    } else {
      addToast('error', 'Restore failed', res.error)
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const selectedFile = files.find((f) => f.id === selectedFileId)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-palette-void text-palette-white font-sans select-none">
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        vaultStatus={vaultStatus}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onAddProject={handleAddProject}
        onScanComputer={handleScanComputer}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-palette-void">
        {selectedProject ? (
          <>
            <ProjectHeader
              project={selectedProject}
              files={files}
              selectedFileId={selectedFileId}
              activeView={activeView}
              versionCount={versions.length}
              isBackingUp={isBackingUp}
              onSelectFile={(fId) => setSelectedFileId(fId)}
              onChangeView={(v) => setActiveView(v)}
              onRevealFolder={() => window.envaultApi.projects.reveal(selectedProject.path)}
              onBackupNow={handleBackupNow}
            />

            {/* Warning if selected file is missing on disk */}
            {selectedFile && !selectedFile.existsOnDisk && (
              <MissingFileBanner
                fileName={selectedFile.relativePath}
                latestVersionNumber={selectedFile.latestVersion?.versionNumber}
                onRestore={() => handleTriggerRestore()}
              />
            )}

            {/* View content based on activeView */}
            {files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="w-14 h-14 rounded-2xl bg-palette-charcoal border border-palette-slate flex items-center justify-center mb-3 text-palette-mint">
                  <FileCode className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-palette-white">No .env files tracked in this project</h3>
                <p className="text-xs text-palette-stone mt-1 max-w-sm leading-relaxed">
                  Create a .env file in this directory or snapshot to begin passive tracking.
                </p>
                <button
                  onClick={handleBackupNow}
                  className="mt-4 px-4 py-2 bg-palette-charcoal hover:bg-palette-night border border-palette-slate text-palette-mint rounded-xl text-xs font-semibold transition active:scale-[0.98]"
                >
                  Snapshot Now
                </button>
              </div>
            ) : (
              <>
                {activeView === 'table' && (
                  <SecretTable
                    secrets={secrets}
                    onCopySecret={(val, key) => {
                      navigator.clipboard.writeText(val)
                      addToast('info', 'Copied to Clipboard', `Copied secret ${key}`)
                    }}
                  />
                )}

                {activeView === 'raw' && (
                  <RawViewer
                    rawContent={rawContent}
                    onCopyAll={(content) => {
                      navigator.clipboard.writeText(content)
                      addToast('info', 'Copied File', 'Copied full .env contents.')
                    }}
                  />
                )}

                {activeView === 'history' && selectedFile && (
                  <VersionTimeline
                    versions={versions}
                    fileName={selectedFile.relativePath}
                    onCompareWithLatest={handleCompareWithLatest}
                    onRollback={(v) => handleTriggerRestore(v)}
                  />
                )}
              </>
            )}
          </>
        ) : (
          /* Empty State — Aesthetic-Usability Effect & Peak-End Rule */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-palette-mint to-palette-teal p-0.5 shadow-2xl shadow-palette-mint/20 mb-6">
              <div className="w-full h-full bg-palette-charcoal rounded-[22px] flex items-center justify-center">
                <FolderLock className="w-10 h-10 text-palette-mint" />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-palette-white">
              <span>Delete the project. </span>
              <span className="text-palette-mint">Keep the secrets.</span>
            </h1>

            <p className="text-xs text-palette-stone max-w-md mt-2 leading-relaxed">
              Passive, encrypted, and versioned backups for all your local <span className="font-mono text-palette-white">.env</span> files. Zero cloud leakage.
            </p>

            {/* Ergonomic Quick Action Cards (Fitts's Law) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mt-8">
              <button
                onClick={handleAddProject}
                className="group flex flex-col items-start p-4 rounded-2xl bg-palette-charcoal/90 border border-palette-slate hover:border-palette-mint/60 hover:bg-palette-charcoal text-left transition-all duration-150 shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="w-8 h-8 rounded-lg bg-palette-mint/10 border border-palette-mint/30 flex items-center justify-center text-palette-mint group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-palette-navy border border-palette-slate text-palette-stone">
                    ⌘N
                  </span>
                </div>
                <div className="font-bold text-xs text-palette-white group-hover:text-palette-mint transition-colors">
                  Add Project Folder
                </div>
                <div className="text-[11px] text-palette-stone mt-0.5 leading-normal">
                  Select an existing directory to register and passively monitor .env files.
                </div>
              </button>

              <button
                onClick={handleScanComputer}
                className="group flex flex-col items-start p-4 rounded-2xl bg-palette-charcoal/90 border border-palette-slate hover:border-palette-teal/60 hover:bg-palette-charcoal text-left transition-all duration-150 shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="w-8 h-8 rounded-lg bg-palette-teal/10 border border-palette-teal/30 flex items-center justify-center text-palette-teal group-hover:scale-105 transition-transform">
                    <Radar className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-palette-navy border border-palette-slate text-palette-stone">
                    ⇧⌘S
                  </span>
                </div>
                <div className="font-bold text-xs text-palette-white group-hover:text-palette-teal transition-colors">
                  Scan Entire Computer
                </div>
                <div className="text-[11px] text-palette-stone mt-0.5 leading-normal">
                  Automatically discover all repos on your disk and batch ingest them safely.
                </div>
              </button>
            </div>

            {/* Feature Trust Pills */}
            <div className="mt-8 flex items-center justify-center flex-wrap gap-4 text-[11px] text-palette-stone">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-palette-mint" />
                <span>AES-256-GCM Vault</span>
              </div>
              <span className="text-palette-slate">•</span>
              <div className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-palette-mint" />
                <span>OS Keychain Protected</span>
              </div>
              <span className="text-palette-slate">•</span>
              <div className="flex items-center space-x-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-palette-teal" />
                <span>Instant Rollback</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <ImportChecklistModal
        isOpen={isImportModalOpen}
        projectDir={importDir}
        discoveredFiles={discoveredFiles}
        isLoading={isImportLoading}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={handleConfirmImport}
      />

      <DiffModal
        isOpen={diffModal.isOpen}
        diff={diffModal.diff}
        fileTitle={selectedFile?.relativePath || ''}
        versionAName={diffModal.versionAName}
        versionBName={diffModal.versionBName}
        onClose={() => setDiffModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <ConfirmRestoreModal
        isOpen={restoreModal.isOpen}
        fileName={restoreModal.file?.relativePath || ''}
        versionNumber={restoreModal.version?.versionNumber || 1}
        targetPath={
          selectedProject && restoreModal.file
            ? `${selectedProject.path}/${restoreModal.file.relativePath}`
            : ''
        }
        isCurrentlyMissing={restoreModal.file ? !restoreModal.file.existsOnDisk : false}
        isLoading={restoreModal.isLoading}
        onClose={() => setRestoreModal({ isOpen: false, file: null, version: null, isLoading: false })}
        onConfirm={handleExecuteRestore}
      />

      <ComputerScanModal
        isOpen={computerScanModal.isOpen}
        isScanning={computerScanModal.isScanning}
        progress={computerScanModal.progress}
        summary={computerScanModal.summary}
        onClose={() => setComputerScanModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <DeleteProjectModal
        isOpen={deleteModal.isOpen}
        projectName={deleteModal.project?.name || ''}
        projectPath={deleteModal.project?.path}
        isLoading={deleteModal.isLoading}
        onClose={() => setDeleteModal({ isOpen: false, project: null, isLoading: false })}
        onConfirm={handleConfirmDeleteProject}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  )
}
