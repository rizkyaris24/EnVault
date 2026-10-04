import React, { useState, useEffect } from 'react'
import { DiscoveredEnvFile } from '@shared/types'
import { CheckSquare, Square, FileText, AlertCircle } from 'lucide-react'
import { Dialog, Button, Badge } from '../ui'

interface ImportChecklistModalProps {
  isOpen: boolean
  projectDir: string
  discoveredFiles: DiscoveredEnvFile[]
  isLoading: boolean
  onClose: () => void
  onConfirm: (selectedPaths: string[], projectName: string) => void
}

export const ImportChecklistModal: React.FC<ImportChecklistModalProps> = ({
  isOpen,
  projectDir,
  discoveredFiles,
  isLoading,
  onClose,
  onConfirm
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    if (isOpen) {
      const initial = new Set<string>()
      discoveredFiles.forEach((f) => {
        if (f.isDefaultChecked) {
          initial.add(f.relativePath)
        }
      })
      if (initial.size === 0 && discoveredFiles.length > 0) {
        initial.add(discoveredFiles[0].relativePath)
      }
      setSelected(initial)

      const base = projectDir.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project'
      setProjectName(base)
    }
  }, [isOpen, projectDir, discoveredFiles])

  const toggleSelect = (relPath: string): void => {
    const next = new Set(selected)
    if (next.has(relPath)) {
      next.delete(relPath)
    } else {
      next.add(relPath)
    }
    setSelected(next)
  }

  const selectAll = (): void => {
    setSelected(new Set(discoveredFiles.map((f) => f.relativePath)))
  }

  const selectRecommended = (): void => {
    const rec = new Set<string>()
    discoveredFiles.forEach((f) => {
      if (f.isDefaultChecked) rec.add(f.relativePath)
    })
    setSelected(rec)
  }

  const deselectAll = (): void => {
    setSelected(new Set())
  }

  const handleConfirm = (): void => {
    if (selected.size === 0 && discoveredFiles.length > 0) return
    onConfirm(Array.from(selected), projectName.trim())
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Register Project"
      description="Configure tracked environment files for passive backup"
      maxWidth="md"
      footer={
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={discoveredFiles.length > 0 && selected.size === 0}
          >
            {selected.size > 0 ? `Track (${selected.size}) Files` : 'Track Project'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Project Name */}
        <div>
          <label className="block text-meta font-medium text-fg-subtle mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full h-9 bg-raised border border-line rounded-control px-3 text-ui text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            placeholder="e.g. My Next.js App"
          />
        </div>

        {/* Project Location */}
        <div>
          <label className="block text-meta font-medium text-fg-subtle mb-1">
            Project Location
          </label>
          <div className="px-3 py-2 bg-canvas border border-line-subtle rounded-control text-meta font-mono text-fg-muted truncate select-text">
            {projectDir}
          </div>
        </div>

        {/* Files Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-meta font-medium text-fg">
              Discovered Files ({discoveredFiles.length})
            </span>
            <div className="flex items-center space-x-1.5 text-meta">
              <button
                type="button"
                onClick={selectRecommended}
                className="px-2 py-0.5 rounded-chip bg-raised hover:bg-line-subtle text-accent border border-line-subtle transition-colors"
              >
                Recommended
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-0.5 rounded-chip bg-raised hover:bg-line-subtle text-fg-muted hover:text-fg border border-line-subtle transition-colors"
              >
                All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2 py-0.5 rounded-chip bg-raised hover:bg-line-subtle text-fg-subtle hover:text-fg-muted border border-line-subtle transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {discoveredFiles.length === 0 ? (
            <div className="p-6 border border-line border-dashed rounded-control text-center bg-raised/20">
              <AlertCircle className="w-6 h-6 text-fg-subtle mx-auto mb-2 opacity-60" />
              <p className="text-ui font-medium text-fg">No .env files detected yet in this directory</p>
              <p className="text-meta text-fg-muted mt-1 max-w-sm mx-auto">
                You can still register this project. Any .env files created here will be passively detected and backed up.
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {discoveredFiles.map((file) => {
                const isChecked = selected.has(file.relativePath)
                const isExample = !file.isDefaultChecked
                return (
                  <div
                    key={file.relativePath}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onClick={() => toggleSelect(file.relativePath)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        toggleSelect(file.relativePath)
                      }
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-control border text-meta cursor-pointer transition-colors select-none outline-none focus-visible:outline-2 focus-visible:outline-accent ${
                      isChecked
                        ? 'bg-raised border-line text-fg font-medium'
                        : 'bg-surface border-line-subtle text-fg-muted hover:bg-raised/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0 pr-2">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-accent shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-fg-subtle shrink-0" />
                      )}
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isChecked ? 'text-accent' : 'text-fg-subtle'}`} />
                      <span className="font-mono text-ui truncate">{file.relativePath}</span>
                      {isExample && (
                        <Badge variant="default" className="text-meta py-0">
                          template
                        </Badge>
                      )}
                    </div>
                    <span className="text-meta text-fg-subtle font-mono shrink-0">
                      {file.lineCount} {file.lineCount === 1 ? 'var' : 'vars'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
