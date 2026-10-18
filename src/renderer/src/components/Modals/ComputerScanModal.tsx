import React from 'react'
import { ComputerScanSummary, ScanProgressPayload } from '@shared/types'
import { Dialog, Button } from '../ui'

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
      title={isScanning ? 'Scanning your computer' : 'Scan complete'}
      description={
        isScanning
          ? 'Looking for .env files in your development folders.'
          : `Found ${summary?.discoveredFiles ?? 0} files in ${summary?.discoveredProjects ?? 0} projects. ${summary?.newlyRegisteredProjects ?? 0} new, ${summary?.newlyBackedUpFiles ?? 0} snapshots saved.`
      }
      maxWidth="lg"
      footer={
        <Button variant="primary" onClick={onClose} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Done'}
        </Button>
      }
    >
      {isScanning ? (
        <div className="py-4 space-y-2">
          <div className="flex items-center gap-3 text-ui text-fg">
            <span className="w-4 h-4 border-2 border-fg-subtle border-t-transparent rounded-full animate-spin shrink-0" />
            {progress?.projectsFound ?? 0} projects, {progress?.filesFound ?? 0} files so far
          </div>
          {progress?.currentDir && (
            <p className="text-meta font-mono text-fg-subtle truncate select-text">{progress.currentDir}</p>
          )}
        </div>
      ) : summary ? (
        <ul className="max-h-72 overflow-y-auto">
          {summary.projects.map((proj) => (
            <li key={proj.projectPath} className="py-2">
              <div className="flex items-center gap-2 text-ui">
                <span className="font-medium text-fg truncate">{proj.projectName}</span>
                {proj.isNew && <span className="text-meta text-accent">New</span>}
              </div>
              <div className="text-meta font-mono text-fg-subtle truncate select-text">
                {proj.files.join(', ')}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Dialog>
  )
}
