import React from 'react'
import { ComputerScanSummary, ScanProgressPayload } from '@shared/types'
import { CheckCircle2, FolderGit2, ShieldCheck } from 'lucide-react'
import { Dialog, Button, Badge } from '../ui'

interface ComputerScanModalProps {
  isOpen: boolean
  isScanning: boolean
  progress: ScanProgressPayload | null
  summary: ComputerScanSummary | null
  onClose: () => void
}

export const ComputerScanModal: React.FC<ComputerScanModalProps> = ({
  isOpen,
  isScanning,
  progress,
  summary,
  onClose
}) => {
  if (!isOpen) return null

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isScanning ? 'Scanning Computer...' : 'Computer Scan & Ingestion Complete'}
      description={
        isScanning
          ? 'Searching development folders for .env configurations'
          : 'Discovered secrets were encrypted and registered in your vault'
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 text-meta text-fg-subtle">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>AES-256-GCM encrypted locally</span>
          </div>

          <Button
            variant="primary"
            onClick={onClose}
            disabled={isScanning}
          >
            {isScanning ? 'Scanning...' : 'Done'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {isScanning ? (
          /* Active Scan State */
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />

            <div>
              <h3 className="text-title font-medium text-fg">
                Searching local workspace directories
              </h3>
              <p className="text-meta text-fg-muted mt-1 max-w-sm mx-auto leading-relaxed">
                Discovering repositories, taking encrypted snapshots, and setting up passive watchers.
              </p>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="p-3 bg-raised border border-line-subtle rounded-control text-center">
                <div className="text-2xl font-semibold font-mono text-fg">
                  {progress?.projectsFound ?? 0}
                </div>
                <div className="text-meta text-fg-subtle mt-0.5">Projects Discovered</div>
              </div>
              <div className="p-3 bg-raised border border-line-subtle rounded-control text-center">
                <div className="text-2xl font-semibold font-mono text-accent">
                  {progress?.filesFound ?? 0}
                </div>
                <div className="text-meta text-fg-subtle mt-0.5">.env Files Found</div>
              </div>
            </div>

            {/* Current path */}
            {progress?.currentDir && (
              <div className="w-full max-w-md px-3 py-2 bg-canvas border border-line-subtle rounded-control text-left">
                <div className="text-meta font-mono text-fg-subtle">Searching in:</div>
                <div className="text-meta font-mono text-fg truncate mt-0.5 select-text">
                  {progress.currentDir}
                </div>
              </div>
            )}
          </div>
        ) : summary ? (
          /* Completed State */
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3.5 rounded-control bg-raised border border-line text-fg">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-ui font-medium text-fg">
                  Scan and Vault Ingestion Complete
                </h3>
                <p className="text-meta text-fg-muted leading-relaxed">
                  Discovered {summary.discoveredProjects} project(s) and {summary.discoveredFiles} .env file(s). All secrets are encrypted in your local SQLite vault.
                </p>
              </div>
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-raised border border-line-subtle rounded-control text-center">
                <div className="text-xl font-semibold font-mono text-fg">
                  {summary.discoveredProjects}
                </div>
                <div className="text-meta text-fg-subtle">
                  {summary.newlyRegisteredProjects} new projects
                </div>
              </div>
              <div className="p-3 bg-raised border border-line-subtle rounded-control text-center">
                <div className="text-xl font-semibold font-mono text-accent">
                  {summary.discoveredFiles}
                </div>
                <div className="text-meta text-fg-subtle">
                  {summary.newlyBackedUpFiles} snapshots saved
                </div>
              </div>
              <div className="p-3 bg-raised border border-line-subtle rounded-control text-center">
                <div className="text-xl font-semibold font-mono text-fg-muted">
                  {summary.scannedDirectories}
                </div>
                <div className="text-meta text-fg-subtle">folders scanned</div>
              </div>
            </div>

            {/* Discovered Projects List */}
            <div className="space-y-2">
              <div className="text-meta font-medium text-fg-subtle">
                Tracked Projects ({summary.projects.length})
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {summary.projects.map((proj) => (
                  <div
                    key={proj.projectPath}
                    className="p-2.5 rounded-control bg-surface border border-line-subtle flex items-center justify-between text-meta"
                  >
                    <div className="truncate flex-1 min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <FolderGit2 className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-medium text-fg truncate">
                          {proj.projectName}
                        </span>
                        {proj.isNew && (
                          <Badge variant="accent">
                            NEW
                          </Badge>
                        )}
                      </div>
                      <div className="text-meta font-mono text-fg-subtle truncate mt-0.5 select-text">
                        {proj.projectPath}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {proj.files.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded-chip bg-raised border border-line-subtle text-meta font-mono text-fg-muted"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
