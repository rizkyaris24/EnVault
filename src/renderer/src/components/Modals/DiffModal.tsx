import React, { useState, useEffect } from 'react'
import { DiffResult, DiffEntry } from '@shared/types'
import { GitCompare, X, Eye, EyeOff, PlusCircle, MinusCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

interface DiffModalProps {
  isOpen: boolean
  diff: DiffResult | null
  fileTitle: string
  versionAName: string
  versionBName: string
  onClose: () => void
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  diff,
  fileTitle,
  versionAName,
  versionBName,
  onClose
}) => {
  const [showValues, setShowValues] = useState(false)
  const [hideUnchanged, setHideUnchanged] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !diff) return null

  const displayedEntries = hideUnchanged
    ? diff.entries.filter((e: DiffEntry) => e.status !== 'unchanged')
    : diff.entries

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-palette-surface border border-palette-slate rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-palette-white select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-palette-slate/60 bg-palette-navy/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-palette-mint/10 border border-palette-mint/30 flex items-center justify-center text-palette-mint">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-palette-white flex items-center space-x-2">
                <span>Version Diff — {fileTitle}</span>
              </h2>
              <p className="text-[11px] text-palette-stone">
                Comparing <span className="text-palette-mint font-mono font-semibold">{versionAName}</span> with{' '}
                <span className="text-palette-teal font-mono font-semibold">{versionBName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-palette-charcoal hover:bg-palette-night text-palette-stone hover:text-palette-white border border-palette-slate rounded-lg transition active:scale-[0.98]"
              title={showValues ? 'Mask secret values' : 'Reveal secret values'}
            >
              {showValues ? <EyeOff className="w-3.5 h-3.5 text-palette-mint" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="font-medium">{showValues ? 'Mask Values' : 'Reveal Values'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-palette-moss hover:text-palette-white p-1.5 rounded-lg hover:bg-palette-charcoal transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Summary Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-palette-void border-b border-palette-slate/40 text-xs">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-palette-mint/10 border border-palette-mint/30 text-palette-mint font-medium text-[11px]">
              <PlusCircle className="w-3 h-3" />
              <span>+{diff.summary.added} added</span>
            </span>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium text-[11px]">
              <MinusCircle className="w-3 h-3" />
              <span>-{diff.summary.removed} removed</span>
            </span>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-palette-teal/10 border border-palette-teal/30 text-palette-teal font-medium text-[11px]">
              <RefreshCw className="w-3 h-3" />
              <span>~{diff.summary.modified} modified</span>
            </span>
            <span className="text-palette-moss text-[11px] font-mono">
              {diff.summary.unchanged} unchanged
            </span>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer text-palette-stone hover:text-palette-white select-none">
            <input
              type="checkbox"
              checked={hideUnchanged}
              onChange={(e) => setHideUnchanged(e.target.checked)}
              className="rounded bg-palette-charcoal border-palette-slate text-palette-mint focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-xs">Hide unchanged</span>
          </label>
        </div>

        {/* Diff Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2 font-mono text-xs select-text">
          {displayedEntries.length === 0 ? (
            <div className="text-center py-16 text-palette-moss">
              <CheckCircle2 className="w-8 h-8 text-palette-mint mx-auto mb-2 opacity-60" />
              <p className="text-xs text-palette-stone">No differences detected between these snapshots.</p>
            </div>
          ) : (
            displayedEntries.map((entry: DiffEntry) => {
              const mask = (v?: string): string =>
                showValues ? (v ?? '') : '••••••••••••••••'

              if (entry.status === 'added') {
                return (
                  <div
                    key={entry.key}
                    className="p-3 rounded-xl bg-palette-navy/70 border border-palette-mint/40 text-palette-white flex flex-col space-y-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-palette-mint">+ {entry.key}</span>
                      <span className="px-2 py-0.2 text-[10px] bg-palette-mint/20 text-palette-mint border border-palette-mint/30 rounded font-sans font-semibold">
                        ADDED
                      </span>
                    </div>
                    <div className="text-palette-stone truncate text-[11px]">
                      = {mask(entry.newValue)}
                    </div>
                  </div>
                )
              }

              if (entry.status === 'removed') {
                return (
                  <div
                    key={entry.key}
                    className="p-3 rounded-xl bg-palette-charcoal/80 border border-rose-500/30 text-palette-stone flex flex-col space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-400/90 line-through">- {entry.key}</span>
                      <span className="px-2 py-0.2 text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded font-sans font-semibold">
                        REMOVED
                      </span>
                    </div>
                    <div className="text-palette-moss line-through truncate text-[11px]">
                      = {mask(entry.oldValue)}
                    </div>
                  </div>
                )
              }

              if (entry.status === 'modified') {
                return (
                  <div
                    key={entry.key}
                    className="p-3 rounded-xl bg-palette-charcoal/90 border border-palette-teal/40 text-palette-white flex flex-col space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-palette-teal">~ {entry.key}</span>
                      <span className="px-2 py-0.2 text-[10px] bg-palette-teal/20 text-palette-teal border border-palette-teal/30 rounded font-sans font-semibold">
                        MODIFIED
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="text-rose-400/70 line-through truncate">- {mask(entry.oldValue)}</div>
                      <div className="text-palette-mint truncate">+ {mask(entry.newValue)}</div>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={entry.key}
                  className="p-2.5 rounded-xl bg-palette-navy/30 border border-palette-slate/40 text-palette-stone flex items-center justify-between"
                >
                  <span className="text-palette-stone">{entry.key}</span>
                  <span className="text-palette-moss truncate max-w-xs">{mask(entry.oldValue)}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-palette-slate/60 bg-palette-navy/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-palette-stone hover:text-palette-white bg-palette-charcoal hover:bg-palette-night border border-palette-slate rounded-xl transition active:scale-[0.98]"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
