import React from 'react'
import { EnvVersionSummary } from '@shared/types'
import {
  GitCompare,
  RotateCcw,
  Clock,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react'
import { Button, Badge } from '../ui'

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
        return <Badge variant="default">Auto</Badge>
      case 'manual':
        return <Badge variant="accent">Manual</Badge>
      case 'restore':
        return <Badge variant="success">Restored</Badge>
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 text-fg select-none bg-canvas">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-title font-semibold text-fg">
              Version History: {fileName}
            </h2>
            <p className="text-meta text-fg-muted mt-0.5">
              Continuous immutable timeline of encrypted snapshots with rollback support.
            </p>
          </div>
          <span className="text-meta text-fg-subtle font-mono px-2 py-0.5 rounded-control bg-raised border border-line">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </span>
        </div>

        {/* Continuous Hairline Rail */}
        {versions.length === 0 ? (
          <div className="text-center py-20 text-fg-subtle text-ui">
            No history snapshots recorded for this file yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-3 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-line">
            {versions.map((version, index) => {
              const isLatest = index === 0
              return (
                <div key={version.id} className="relative group">
                  {/* Timeline Static Spine Node (No Continuous Pulsing) */}
                  <div
                    className={`absolute -left-[20px] top-4 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center z-10 bg-surface ${
                      isLatest
                        ? 'border-accent bg-accent'
                        : 'border-line group-hover:border-fg-subtle'
                    }`}
                  />

                  {/* Version Row Container */}
                  <div
                    className={`p-4 rounded-panel border transition-colors duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isLatest
                        ? 'bg-surface border-line'
                        : 'bg-surface/60 border-line-subtle hover:bg-surface hover:border-line'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-control flex items-center justify-center font-mono font-semibold text-meta shrink-0 border ${
                          isLatest
                            ? 'bg-raised text-fg border-line'
                            : 'bg-surface text-fg-muted border-line-subtle'
                        }`}
                      >
                        v{version.versionNumber}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-ui font-medium text-fg">
                            {isLatest ? 'Current Active Version' : `Snapshot v${version.versionNumber}`}
                          </span>
                          {getSourceBadge(version.source)}
                          {isLatest && (
                            <span className="flex items-center space-x-1 text-meta text-success font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Live on disk</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 text-meta text-fg-subtle flex-wrap gap-y-1">
                          <span
                            className="flex items-center space-x-1 cursor-help"
                            title={formatFullDate(version.createdAt)}
                          >
                            <Clock className="w-3.5 h-3.5 text-fg-subtle" />
                            <span>{getRelativeTime(version.createdAt)}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-fg-subtle" />
                            <span>{version.varCount} vars</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1 font-mono text-meta text-fg-muted">
                            <Shield className="w-3.5 h-3.5 text-fg-subtle" />
                            <span>{version.contentHash.slice(0, 7)}</span>
                          </span>
                        </div>

                        {version.note && (
                          <p className="text-meta text-fg-muted italic">
                            &ldquo;{version.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {versions.length > 1 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onCompareWithLatest(version.id)}
                          leftIcon={<GitCompare className="w-3.5 h-3.5 text-accent" />}
                          title="Compare changes with another version"
                        >
                          Diff
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={isLatest ? 'secondary' : 'primary'}
                        onClick={() => onRollback(version)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        title="Restore this snapshot to disk"
                      >
                        {isLatest ? 'Restore File' : 'Rollback'}
                      </Button>
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
