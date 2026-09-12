import React, { useEffect } from 'react'
import { FolderX, CheckCircle2, Folder, X } from 'lucide-react'

interface DeleteProjectModalProps {
  isOpen: boolean
  projectName: string
  projectPath?: string
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  projectName,
  projectPath,
  isLoading,
  onClose,
  onConfirm
}) => {
  // Jakob's Law / Accessibility: Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
    return undefined
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-palette-surface border border-palette-slate rounded-2xl shadow-2xl overflow-hidden flex flex-col text-palette-linen animate-in zoom-in-95 duration-200">
        {/* Top close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-palette-moss hover:text-palette-white p-1.5 rounded-lg hover:bg-palette-night transition disabled:opacity-50 z-10"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header & Hierarchy */}
        <div className="p-6 pb-4">
          <div className="flex items-start space-x-3.5">
            {/* Focal Icon: Visual Anchor (Law of Contrast & Proximity) */}
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
              <FolderX className="w-5 h-5" />
            </div>

            {/* Title & Description: Clear Typography Hierarchy */}
            <div className="space-y-1 pr-6">
              <h2 className="text-base font-semibold text-palette-white leading-tight">
                Stop tracking &ldquo;{projectName}&rdquo;?
              </h2>
              <p className="text-xs text-palette-stone leading-relaxed">
                EnVault will stop monitoring this project and remove it from your vault registry.
              </p>
            </div>
          </div>
        </div>

        {/* Content: Law of Common Region & Proximity */}
        <div className="px-6 pb-6 space-y-3">
          {/* Project Preview Card */}
          {projectPath && (
            <div className="p-3 rounded-xl bg-palette-navy/80 border border-palette-slate flex items-center space-x-3">
              <Folder className="w-4 h-4 text-palette-mint shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-palette-white truncate">
                  {projectName}
                </div>
                <div className="text-[11px] font-mono text-palette-moss truncate mt-0.5 select-text">
                  {projectPath}
                </div>
              </div>
            </div>
          )}

          {/* Reassurance Badge: Color Theory & Error Prevention */}
          <div className="flex items-center space-x-2 px-3 py-2.5 rounded-xl bg-palette-mint/5 border border-palette-mint/20 text-palette-linen">
            <CheckCircle2 className="w-4 h-4 text-palette-mint shrink-0" />
            <span className="text-xs text-palette-stone">
              Your actual files and secrets on disk remain <strong className="text-palette-white font-medium">100% safe & untouched</strong>.
            </span>
          </div>
        </div>

        {/* Footer: Fitts's Law (Equal, ergonomic button targets) & Hick's Law */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-t border-palette-slate bg-palette-deep/70">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2 px-4 text-xs font-medium text-palette-white bg-palette-charcoal hover:bg-palette-night border border-palette-slate rounded-xl transition active:scale-[0.98] disabled:opacity-50"
          >
            Keep Tracking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-2 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-950/40 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <span>{isLoading ? 'Removing...' : 'Stop Tracking'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
