import React, { useEffect } from 'react'
import { ComputerScanSummary, ScanProgressPayload } from '@shared/types'
import {
  Radar,
  CheckCircle2,
  FileText,
  X,
  Sparkles,
  ShieldCheck,
  FolderGit2
} from 'lucide-react'

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isScanning) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isScanning, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-palette-surface border border-palette-slate rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-palette-white select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-palette-slate/60 bg-palette-navy/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-palette-mint/10 border border-palette-mint/30 flex items-center justify-center text-palette-mint">
              {isScanning ? (
                <Radar className="w-4 h-4 animate-spin text-palette-mint" />
              ) : (
                <Sparkles className="w-4 h-4 text-palette-mint" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-palette-white">
                {isScanning ? 'Scanning Computer...' : 'Computer Scan & Auto-Backup'}
              </h2>
              <p className="text-[11px] text-palette-stone">
                {isScanning
                  ? 'Searching development folders for .env secrets'
                  : 'Discovered secrets automatically encrypted and monitored'}
              </p>
            </div>
          </div>

          {!isScanning && (
            <button
              onClick={onClose}
              className="text-palette-moss hover:text-palette-white p-1.5 rounded-lg hover:bg-palette-charcoal transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isScanning ? (
            /* Scanning Active State */
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-2 border-palette-mint/20 animate-ping absolute" />
                <div className="w-16 h-16 rounded-2xl bg-palette-charcoal border border-palette-mint/40 flex items-center justify-center shadow-xl shadow-palette-mint/10">
                  <Radar className="w-8 h-8 text-palette-mint animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-palette-white">
                  Scanning local repositories & directories
                </h3>
                <p className="text-xs text-palette-stone mt-1 max-w-sm mx-auto leading-relaxed">
                  Discovering active projects, encrypting secrets with AES-256-GCM, and configuring passive watchers.
                </p>
              </div>

              {/* Progress Counters */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div className="p-3.5 bg-palette-navy/70 border border-palette-slate rounded-xl text-center shadow-sm">
                  <div className="text-2xl font-bold font-mono text-palette-mint">
                    {progress?.projectsFound ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-palette-stone mt-0.5">Projects Discovered</div>
                </div>
                <div className="p-3.5 bg-palette-navy/70 border border-palette-slate rounded-xl text-center shadow-sm">
                  <div className="text-2xl font-bold font-mono text-palette-teal">
                    {progress?.filesFound ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-palette-stone mt-0.5">.env Files Found</div>
                </div>
              </div>

              {/* Currently inspecting path */}
              {progress?.currentDir && (
                <div className="w-full max-w-md px-3.5 py-2.5 bg-palette-void border border-palette-slate rounded-xl text-left">
                  <div className="text-[10px] uppercase font-mono text-palette-moss tracking-wider">
                    Searching in:
                  </div>
                  <div className="text-xs font-mono text-palette-white truncate mt-0.5 select-text">
                    {progress.currentDir}
                  </div>
                </div>
              )}
            </div>
          ) : summary ? (
            /* Scan Complete State (Peak-End Rule) */
            <div className="space-y-4">
              <div className="flex items-start space-x-3.5 p-4 rounded-xl bg-palette-navy/80 border border-palette-mint/40 text-palette-white shadow-md">
                <CheckCircle2 className="w-6 h-6 text-palette-mint shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-palette-white">
                    Auto-Save & Vault Ingestion Complete!
                  </h3>
                  <p className="text-xs text-palette-stone mt-1 leading-relaxed">
                    Discovered <span className="font-bold text-palette-mint">{summary.discoveredProjects} project(s)</span> and{' '}
                    <span className="font-bold text-palette-mint">{summary.discoveredFiles} .env file(s)</span>. All secrets are encrypted in your local SQLite vault and protected by OS Keychain.
                  </p>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-palette-charcoal/80 border border-palette-slate rounded-xl text-center">
                  <div className="text-xl font-bold font-mono text-palette-mint">
                    {summary.discoveredProjects}
                  </div>
                  <div className="text-[11px] text-palette-stone">
                    {summary.newlyRegisteredProjects} newly registered
                  </div>
                </div>
                <div className="p-3 bg-palette-charcoal/80 border border-palette-slate rounded-xl text-center">
                  <div className="text-xl font-bold font-mono text-palette-teal">
                    {summary.discoveredFiles}
                  </div>
                  <div className="text-[11px] text-palette-stone">
                    {summary.newlyBackedUpFiles} snapshots saved
                  </div>
                </div>
                <div className="p-3 bg-palette-charcoal/80 border border-palette-slate rounded-xl text-center">
                  <div className="text-xl font-bold font-mono text-palette-white">
                    {summary.scannedDirectories}
                  </div>
                  <div className="text-[11px] text-palette-stone">folders scanned</div>
                </div>
              </div>

              {/* Discovered Projects List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-palette-stone">
                  Tracked Projects ({summary.projects.length})
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {summary.projects.map((proj) => (
                    <div
                      key={proj.projectPath}
                      className="p-3 rounded-xl bg-palette-navy/50 border border-palette-slate flex items-center justify-between text-xs"
                    >
                      <div className="truncate flex-1 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          <FolderGit2 className="w-3.5 h-3.5 text-palette-mint shrink-0" />
                          <span className="font-semibold text-palette-white truncate">
                            {proj.projectName}
                          </span>
                          {proj.isNew && (
                            <span className="px-1.5 py-0.2 text-[10px] bg-palette-charcoal text-palette-mint border border-palette-mint/40 rounded font-mono font-semibold">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-palette-stone truncate mt-0.5 select-text">
                          {proj.projectPath}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {proj.files.map((f) => (
                          <span
                            key={f}
                            className="px-2 py-0.5 rounded bg-palette-charcoal border border-palette-slate text-[10px] font-mono text-palette-mint flex items-center space-x-1"
                          >
                            <FileText className="w-2.5 h-2.5 text-palette-moss" />
                            <span>{f}</span>
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-palette-slate/60 bg-palette-navy/60">
          <div className="flex items-center space-x-2 text-[11px] text-palette-stone">
            <ShieldCheck className="w-4 h-4 text-palette-mint" />
            <span>Encrypted locally with AES-256-GCM</span>
          </div>

          <button
            onClick={onClose}
            disabled={isScanning}
            className="px-5 py-2 text-xs font-bold bg-palette-mint hover:bg-palette-teal disabled:opacity-50 text-palette-void rounded-xl shadow-lg shadow-palette-mint/20 transition active:scale-[0.98]"
          >
            {isScanning ? 'Scanning...' : 'Done (Esc)'}
          </button>
        </div>
      </div>
    </div>
  )
}
