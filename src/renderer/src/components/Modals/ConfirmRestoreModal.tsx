import React, { useEffect } from 'react'
import { AlertTriangle, RotateCcw, X } from 'lucide-react'

interface ConfirmRestoreModalProps {
  isOpen: boolean
  fileName: string
  versionNumber: number
  targetPath: string
  isCurrentlyMissing: boolean
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmRestoreModal: React.FC<ConfirmRestoreModalProps> = ({
  isOpen,
  fileName,
  versionNumber,
  targetPath,
  isCurrentlyMissing,
  isLoading,
  onClose,
  onConfirm
}) => {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="relative w-full max-w-md bg-palette-surface border border-palette-slate rounded-2xl shadow-2xl overflow-hidden flex flex-col text-palette-white select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-palette-slate/60 bg-palette-navy/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-palette-mint/10 border border-palette-mint/30 flex items-center justify-center text-palette-mint">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-palette-white">
                {isCurrentlyMissing ? 'Restore Missing File' : 'Rollback File Version'}
              </h2>
              <p className="text-[11px] text-palette-stone">Local filesystem write operation</p>
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

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-palette-navy border border-palette-slate">
            <AlertTriangle className="w-5 h-5 text-palette-mint shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-palette-mint">
                {isCurrentlyMissing ? 'Disaster Recovery Action' : 'File Overwrite Confirmation'}
              </p>
              <p className="text-palette-stone leading-relaxed">
                {isCurrentlyMissing
                  ? `EnVault will recreate ${fileName} on disk using encrypted snapshot v${versionNumber}.`
                  : `EnVault will overwrite the current content of ${fileName} on disk with snapshot v${versionNumber}. A safety snapshot of current state will be preserved.`}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-palette-stone text-[11px] font-medium">Target File Path</span>
              <div className="font-mono text-palette-white mt-1 px-3 py-2 bg-palette-void rounded-lg border border-palette-slate break-all select-text text-[11px]">
                {targetPath}
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-palette-void border border-palette-slate">
              <span className="text-palette-stone text-[11px]">Restoring Snapshot</span>
              <span className="font-mono font-bold text-palette-mint text-xs">Version {versionNumber}</span>
            </div>
          </div>
        </div>

        {/* Ergonomic 50/50 Footer Buttons (Fitts's Law) */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-t border-palette-slate/60 bg-palette-navy/60">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-semibold text-palette-stone hover:text-palette-white bg-palette-charcoal hover:bg-palette-night border border-palette-slate rounded-xl transition active:scale-[0.98]"
          >
            Cancel (Esc)
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-bold bg-palette-mint hover:bg-palette-teal disabled:opacity-50 text-palette-void rounded-xl shadow-lg shadow-palette-mint/20 transition active:scale-[0.98] flex items-center justify-center space-x-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Writing...' : 'Write to Disk'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
