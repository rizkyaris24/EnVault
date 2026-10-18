import React, { useState, useEffect, useCallback } from 'react'
import {
  Project,
  EnvFile,
  EnvVersionSummary,
  SecretEntry,
  DiscoveredEnvFile,
  DiffResult,
  ComputerScanSummary,
  ScanProgressPayload,
  VaultStatus
} from '@shared/types'
import { UnlockScreen } from './components/Vault/UnlockScreen'
import { Onboarding } from './components/Onboarding/Onboarding'
import { SettingsDialog } from './components/Settings/SettingsDialog'
import { TopBar } from './components/TopBar/TopBar'
import { ProjectsHome } from './components/Home/ProjectsHome'
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
import { CommandPalette } from './components/Common/CommandPalette'
import { Button } from './components/ui'

export const App: React.FC = () => {
  // Global State
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

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
    }
  }, [])

  const refreshVaultStatus = useCallback(async (): Promise<void> => {
    const res = await window.envaultApi.security.getStatus()
    if (res.success && res.data) setVaultStatus(res.data)
  }, [])

  useEffect(() => {
    refreshVaultStatus()
  }, [refreshVaultStatus])

  // First run: no projects yet and the welcome flow was never finished.
  const onboardingChecked = React.useRef(false)
  useEffect(() => {
    if (!vaultStatus || vaultStatus.state !== 'ready' || onboardingChecked.current) return
    onboardingChecked.current = true
    window.envaultApi.settings.get('onboarding_done').then((res) => {
      if (res.success && res.data == null && vaultStatus.totalProjects === 0) setNeedsOnboarding(true)
    })
  }, [vaultStatus])

  useEffect(() => window.envaultApi.onOpenSettings(() => setIsSettingsOpen(true)), [])

  useEffect(
    () =>
      window.envaultApi.onUpdateStatus((status) => {
        if (status.state === 'ready') {
          addToast('info', 'Update ready', `EnVault ${status.version} installs when you quit, or restart from Settings.`)
        }
      }),
    []
  )

  useEffect(() => {
    loadProjects()

    // Watcher event listeners
    const unbindBackup = window.envaultApi.onBackupUpdated(({ fileId }: { fileId: string; projectId: string; version: any }) => {
      addToast('info', 'Backup saved', 'A .env file changed and a new version was saved.')
      loadProjects()
      if (selectedFileId === fileId) {
        loadFileDetails(fileId)
      }
    })

    const unbindStatus = window.envaultApi.onFileStatusChanged(({ fileId, existsOnDisk }: { fileId: string; projectId: string; existsOnDisk: boolean }) => {
      if (!existsOnDisk) {
        addToast('warning', 'File missing', 'A .env file was removed from its folder. You can restore it from History.')
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
  }, [loadProjects, selectedFileId])

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
      addToast('error', 'Could not scan the folder', scanRes.error)
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
        'Project added',
        `Tracking ${selectedPaths.length} ${selectedPaths.length === 1 ? 'file' : 'files'}.`
      )
      await loadProjects()
      setSelectedProjectId(addRes.data.id)
    } else {
      addToast('error', 'Could not add project', addRes.error)
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
        addToast('info', 'Project removed', `${name} is no longer tracked.`)
        const updated = projects.filter((p) => p.id !== id)
        setProjects(updated)
        setSelectedProjectId(null)
        setDeleteModal({ isOpen: false, project: null, isLoading: false })
      } else {
        addToast('error', 'Could not remove project', res.error)
        setDeleteModal((prev) => ({ ...prev, isLoading: false }))
      }
    } catch (err) {
      addToast('error', 'Something went wrong', (err as Error).message)
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
      await loadProjects()
    } else {
      setComputerScanModal({
        isOpen: false,
        isScanning: false,
        progress: null,
        summary: null
      })
      addToast('error', 'Computer scan failed', res.error)
    }
  }, [loadProjects])

  // Global keyboard shortcuts (Jakob's Law)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Cmd+K: Open Command Palette
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
        return
      }

      if (!isInput) {
        // Escape: back to all projects when nothing else is open
        if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
          setSelectedProjectId(null)
          return
        }

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
      addToast('success', 'Snapshot saved', 'A new version was added to history.')
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
      addToast('error', 'Could not compare versions', diffRes.error)
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
        'File restored',
        `Snapshot v${res.data.versionNumber} was written back to disk.`
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

  if (!vaultStatus) return <div className="h-screen w-screen bg-canvas" />
  if (vaultStatus.state !== 'ready') {
    return (
      <UnlockScreen
        status={vaultStatus}
        onDone={() => {
          refreshVaultStatus()
          loadProjects()
        }}
      />
    )
  }

  if (needsOnboarding) {
    return (
      <Onboarding
        hasRecovery={vaultStatus.hasRecovery}
        onFinish={async (next) => {
          await window.envaultApi.settings.set('onboarding_done', '1')
          setNeedsOnboarding(false)
          refreshVaultStatus()
          if (next === 'add') handleAddProject()
          if (next === 'scan') handleScanComputer()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas text-fg font-sans select-none">
      <TopBar
        projects={projects}
        selectedProject={selectedProject}
        onGoHome={() => setSelectedProjectId(null)}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onAddProject={handleAddProject}
        onScanComputer={handleScanComputer}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-canvas">
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none max-w-md mx-auto">
                <h2 className="text-title font-medium text-fg">No .env files in this project yet</h2>
                <p className="text-ui text-fg-muted mt-1">
                  Create one in the folder and EnVault picks it up, or take a snapshot now.
                </p>
                <div className="mt-6">
                  <Button variant="secondary" onClick={handleBackupNow}>
                    Snapshot now
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {activeView === 'table' && (
                  <SecretTable
                    secrets={secrets}
                    onCopySecret={(val, key) => {
                      window.envaultApi.clipboard.copySecret(val)
                      addToast('info', 'Copied', `${key} copied. It clears from the clipboard in 30 seconds.`)
                    }}
                  />
                )}

                {activeView === 'raw' && (
                  <RawViewer
                    rawContent={rawContent}
                    onCopyAll={(content) => {
                      window.envaultApi.clipboard.copySecret(content)
                      addToast('info', 'Copied', 'The whole file was copied. It clears from the clipboard in 30 seconds.')
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
          <ProjectsHome
            projects={projects}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onAddProject={handleAddProject}
            onScanComputer={handleScanComputer}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </main>

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

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        projects={projects}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onAddProject={handleAddProject}
        onScanComputer={handleScanComputer}
        onSnapshotNow={handleBackupNow}
        onChangeView={(v) => setActiveView(v)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={vaultStatus}
        onVaultChanged={() => {
          refreshVaultStatus()
          loadProjects()
          setSelectedProjectId(null)
        }}
        notify={addToast}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  )
}
