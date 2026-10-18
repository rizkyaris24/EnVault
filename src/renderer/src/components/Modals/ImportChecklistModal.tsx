import React, { useState, useEffect } from 'react'
import { DiscoveredEnvFile } from '@shared/types'
import { CheckSquare, Square } from 'lucide-react'
import { Dialog, Button } from '../ui'

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

  const textBtn =
    'text-meta text-fg-muted hover:text-fg transition-colors rounded-control outline-none focus-visible:outline-2 focus-visible:outline-accent'

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add project"
      description="Choose which .env files EnVault should back up."
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={discoveredFiles.length > 0 && selected.size === 0}
          >
            {selected.size > 0 ? `Track ${selected.size} ${selected.size === 1 ? 'file' : 'files'}` : 'Track project'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="project-name" className="block text-meta text-fg-subtle mb-1.5">
            Name
          </label>
          <input
            id="project-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full h-10 bg-raised rounded-control px-3.5 text-ui text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            placeholder="e.g. My Next.js App"
          />
          <p className="mt-1.5 text-meta font-mono text-fg-subtle truncate select-text">{projectDir}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-meta text-fg-subtle">
              {discoveredFiles.length} {discoveredFiles.length === 1 ? 'file' : 'files'} found
            </span>
            {discoveredFiles.length > 0 && (
              <div className="flex items-center gap-3">
                <button type="button" onClick={selectRecommended} className={textBtn}>
                  Recommended
                </button>
                <button type="button" onClick={selectAll} className={textBtn}>
                  All
                </button>
                <button type="button" onClick={deselectAll} className={textBtn}>
                  None
                </button>
              </div>
            )}
          </div>

          {discoveredFiles.length === 0 ? (
            <p className="py-6 text-ui text-fg-muted">
              No .env files yet. You can still add this project. Any .env file created here is backed up automatically.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {discoveredFiles.map((file) => {
                const isChecked = selected.has(file.relativePath)
                return (
                  <li
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
                    className="flex items-center gap-3 h-11 px-3 -mx-3 rounded-control cursor-pointer select-none hover:bg-raised/60 outline-none focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-fg shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-fg-subtle shrink-0" />
                    )}
                    <span className={`font-mono text-ui truncate flex-1 ${isChecked ? 'text-fg' : 'text-fg-muted'}`}>
                      {file.relativePath}
                    </span>
                    {!file.isDefaultChecked && <span className="text-meta text-fg-subtle">template</span>}
                    <span className="text-meta text-fg-subtle shrink-0">
                      {file.lineCount} {file.lineCount === 1 ? 'var' : 'vars'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  )
}
