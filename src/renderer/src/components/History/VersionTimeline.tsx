import React from 'react'
import { EnvVersionSummary } from '@shared/types'
import {
  History,
  GitCompare,
  RotateCcw,
  Clock,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react'

interface VersionTimelineProps {
  versions: EnvVersionSummary[]
  fileName: string
  onCompareWithLatest: (versionId: string) => void
  onRollback: (version: EnvVersionSummary) => void
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  fileName,
  onCompareWithLatest,
  onRollback
}) => {
  const formatFullDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getRelativeTime = (timestamp: number): string => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000)
    if (diffSec < 45) return 'just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getSourceBadge = (source: 'watch' | 'manual' | 'restore'): React.ReactNode => {
    switch (source) {
      case 'watch':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-palette-charcoal text-palette-stone font-medium border border-palette-slate">
            Auto-Watcher
          </span>
        )
      case 'manual':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-palette-navy text-palette-teal font-medium border border-palette-teal/40">
            Manual Snapshot
          </span>
        )
      case 'restore':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-palette-charcoal text-palette-mint font-medium border border-palette-mint/40">
            Restored
          </span>
        )
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 text-palette-white select-none bg-palette-void">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-palette-slate/50">
          <div>
            <h2 className="text-sm font-bold text-palette-white flex items-center space-x-2">
              <History className="w-4 h-4 text-palette-mint" />
              <span>Version History: {fileName}</span>
            </h2>
            <p className="text-xs text-palette-stone mt-0.5">
              Continuous timeline of encrypted snapshots with full rollback capability.
            </p>
          </div>
          <span className="text-xs text-palette-stone font-mono px-2.5 py-1 rounded-md bg-palette-charcoal border border-palette-slate">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </span>
        </div>

        {/* Timeline List with continuous vertical line */}
        {versions.length === 0 ? (
          <div className="text-center py-20 text-palette-moss text-xs">
            No history snapshots recorded for this file yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:bg-palette-slate">
            {versions.map((version, index) => {
              const isLatest = index === 0
              return (
                <div key={version.id} className="relative group">
                  {/* Timeline node icon on the spine */}
                  <div
                    className={`absolute -left-[31px] top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      isLatest
                        ? 'border-palette-mint bg-palette-charcoal shadow-lg shadow-palette-mint/30'
                        : 'border-palette-slate bg-palette-navy group-hover:border-palette-mint/60'
                    }`}
                  >
                    {isLatest ? (
                      <span className="w-2 h-2 rounded-full bg-palette-mint animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-palette-moss" />
                    )}
                  </div>

                  {/* Card Container */}
                  <div
                    className={`p-4 rounded-xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isLatest
                        ? 'bg-palette-navy border-palette-mint/40 shadow-md'
                        : 'bg-palette-charcoal/70 border-palette-slate/70 hover:border-palette-slate hover:bg-palette-charcoal'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          isLatest
                            ? 'bg-palette-mint text-palette-void shadow-md shadow-palette-mint/20'
                            : 'bg-palette-navy text-palette-stone border border-palette-slate'
                        }`}
                      >
                        v{version.versionNumber}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-semibold text-palette-white">
                            {isLatest ? 'Current Active Version' : `Snapshot v${version.versionNumber}`}
                          </span>
                          {getSourceBadge(version.source)}
                          {isLatest && (
                            <span className="flex items-center space-x-1 text-[10px] text-palette-mint font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Live on disk</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] text-palette-stone flex-wrap gap-y-1">
                          <span
                            className="flex items-center space-x-1 cursor-help"
                            title={formatFullDate(version.createdAt)}
                          >
                            <Clock className="w-3 h-3 text-palette-moss" />
                            <span>{getRelativeTime(version.createdAt)}</span>
                          </span>
                          <span className="text-palette-slate">•</span>
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3 h-3 text-palette-moss" />
                            <span>{version.varCount} vars</span>
                          </span>
                          <span className="text-palette-slate">•</span>
                          <span className="flex items-center space-x-1 font-mono text-[10px] text-palette-mint">
                            <Shield className="w-3 h-3 text-palette-mint" />
                            <span>{version.contentHash.slice(0, 7)}</span>
                          </span>
                        </div>

                        {version.note && (
                          <p className="text-[11px] text-palette-stone italic">
                            &ldquo;{version.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {versions.length > 1 && (
                        <button
                          onClick={() => onCompareWithLatest(version.id)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-palette-navy hover:bg-palette-charcoal border border-palette-slate text-xs font-medium text-palette-white transition active:scale-[0.98]"
                          title="Compare changes with another version"
                        >
                          <GitCompare className="w-3.5 h-3.5 text-palette-mint" />
                          <span>Diff</span>
                        </button>
                      )}

                      <button
                        onClick={() => onRollback(version)}
                        className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] ${
                          isLatest
                            ? 'bg-palette-charcoal hover:bg-palette-night text-palette-mint border border-palette-mint/40'
                            : 'bg-palette-mint hover:bg-palette-teal text-palette-void shadow-md shadow-palette-mint/15'
                        }`}
                        title="Write this version back to the local file on disk"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isLatest ? 'Restore File' : 'Rollback'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
