import React, { useState, useEffect } from 'react'
import { DiscoveredEnvFile } from '@shared/types'
import { CheckSquare, Square, FolderPlus, FileText, AlertCircle, X, Sparkles } from 'lucide-react'

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
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  useEffect(() => {
    if (isOpen) {
      // Pre-select files according to isDefaultChecked
      const initial = new Set<string>()
      discoveredFiles.forEach((f) => {
        if (f.isDefaultChecked) {
          initial.add(f.relativePath)
        }
      })
      // If nothing was default checked but files exist, select the first one
      if (initial.size === 0 && discoveredFiles.length > 0) {
        initial.add(discoveredFiles[0].relativePath)
      }
      setSelected(initial)

      const base = projectDir.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project'
      setProjectName(base)
    }
  }, [isOpen, projectDir, discoveredFiles])

  if (!isOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-palette-surface border border-palette-slate rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-palette-white select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-palette-slate/60 bg-palette-navy/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-palette-mint/10 border border-palette-mint/30 flex items-center justify-center text-palette-mint">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-palette-white">Register Project</h2>
              <p className="text-[11px] text-palette-stone">Configure tracked .env files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-palette-moss hover:text-palette-white p-1.5 rounded-lg hover:bg-palette-charcoal transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[11px] font-medium text-palette-stone uppercase tracking-wider mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-palette-charcoal border border-palette-slate rounded-lg px-3 py-2 text-xs text-palette-white placeholder-palette-moss focus:outline-none focus:border-palette-mint transition"
              placeholder="e.g. My Next.js App"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-palette-stone uppercase tracking-wider mb-1.5">
              Project Location
            </label>
            <div className="px-3 py-2 bg-palette-navy border border-palette-slate rounded-lg text-xs font-mono text-palette-stone truncate select-text">
              {projectDir}
            </div>
          </div>

          {/* Discovered files checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-palette-white">
                Discovered Files ({discoveredFiles.length})
              </span>
              <div className="flex items-center space-x-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={selectRecommended}
                  className="px-2 py-0.5 rounded bg-palette-charcoal hover:bg-palette-navy text-palette-mint border border-palette-slate transition flex items-center space-x-1"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Recommended</span>
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2 py-0.5 rounded bg-palette-charcoal hover:bg-palette-navy text-palette-stone hover:text-palette-white border border-palette-slate transition"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2 py-0.5 rounded bg-palette-charcoal hover:bg-palette-navy text-palette-moss hover:text-palette-stone border border-palette-slate transition"
                >
                  Clear
                </button>
              </div>
            </div>

            {discoveredFiles.length === 0 ? (
              <div className="p-6 border border-dashed border-palette-slate rounded-xl text-center bg-palette-navy/40">
                <AlertCircle className="w-8 h-8 text-palette-mint mx-auto mb-2 opacity-80" />
                <p className="text-xs font-medium text-palette-white">No .env files detected yet in this folder</p>
                <p className="text-[11px] text-palette-stone mt-1 max-w-sm mx-auto">
                  You can still register this project. EnVault's background watcher will automatically detect and backup any new .env files created here.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {discoveredFiles.map((file) => {
                  const isChecked = selected.has(file.relativePath)
                  const isExample = !file.isDefaultChecked
                  return (
                    <div
                      key={file.relativePath}
                      onClick={() => toggleSelect(file.relativePath)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-palette-navy border-palette-mint/50 text-palette-white font-medium shadow-sm'
                          : 'bg-palette-charcoal/60 border-palette-slate text-palette-stone hover:border-palette-slate hover:bg-palette-charcoal'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0 pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-palette-mint shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-palette-moss shrink-0" />
                        )}
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isChecked ? 'text-palette-mint' : 'text-palette-moss'}`} />
                        <span className="font-mono truncate">{file.relativePath}</span>
                        {isExample && (
                          <span className="px-1.5 py-0.2 text-[10px] bg-palette-charcoal text-palette-moss rounded border border-palette-slate">
                            template
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-palette-stone font-mono shrink-0">
                        {file.lineCount} {file.lineCount === 1 ? 'var' : 'vars'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer (Fitts's Law 50/50 Grid) */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-t border-palette-slate/60 bg-palette-navy/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-semibold text-palette-stone hover:text-palette-white bg-palette-charcoal hover:bg-palette-night border border-palette-slate rounded-xl transition active:scale-[0.98]"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || (discoveredFiles.length > 0 && selected.size === 0)}
            className="w-full py-2.5 text-xs font-bold bg-palette-mint hover:bg-palette-teal disabled:opacity-50 disabled:cursor-not-allowed text-palette-void rounded-xl shadow-lg shadow-palette-mint/20 transition active:scale-[0.98] flex items-center justify-center space-x-1.5"
          >
            {isLoading ? (
              <span>Registering...</span>
            ) : (
              <span>
                Track {selected.size > 0 ? `(${selected.size}) Files` : 'Project'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
