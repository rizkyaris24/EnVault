import React from 'react'
import { ShieldAlert, RotateCcw } from 'lucide-react'

interface MissingFileBannerProps {
  fileName: string
  latestVersionNumber?: number
  onRestore: () => void
}

export const MissingFileBanner: React.FC<MissingFileBannerProps> = ({
  fileName,
  latestVersionNumber,
  onRestore
}) => {
  return (
    <div className="m-6 p-4 rounded-xl bg-gradient-to-r from-palette-charcoal via-palette-navy to-palette-charcoal border border-palette-slate flex flex-col sm:flex-row sm:items-center justify-between shadow-xl text-palette-white gap-4">
      <div className="flex items-start space-x-3.5 min-w-0">
        <div className="p-2.5 rounded-xl bg-palette-charcoal text-palette-mint shrink-0 mt-0.5 border border-palette-mint/30 shadow-inner">
          <ShieldAlert className="w-5 h-5 text-palette-mint animate-pulse" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-palette-white truncate">
              File Missing from Disk: <span className="font-mono text-palette-mint">{fileName}</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-palette-charcoal border border-palette-slate text-palette-stone">
              Recovery Available
            </span>
          </div>
          <p className="text-xs text-palette-stone leading-relaxed">
            This file was deleted or moved outside of EnVault. All secrets remain safely encrypted in vault snapshot{' '}
            <span className="font-mono font-semibold text-palette-mint bg-palette-charcoal px-1.5 py-0.5 rounded border border-palette-slate">
              v{latestVersionNumber ?? 1}
            </span>
            .
          </p>
        </div>
      </div>

      <button
        onClick={onRestore}
        className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-palette-mint hover:bg-palette-teal text-palette-void rounded-xl text-xs font-bold shadow-lg shadow-palette-mint/20 transition active:scale-[0.98] shrink-0"
        title="Instantly restore this file back to your local filesystem"
      >
        <RotateCcw className="w-4 h-4" />
        <span>1-Click Restore to Disk</span>
      </button>
    </div>
  )
}
