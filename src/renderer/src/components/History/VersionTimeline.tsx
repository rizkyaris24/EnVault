import React from 'react'
import { EnvVersionSummary } from '@shared/types'
import { Button, relativeTime } from '../ui'

interface VersionTimelineProps {
  versions: EnvVersionSummary[]
  fileName: string
  onCompareWithLatest: (versionId: string) => void
  onRollback: (version: EnvVersionSummary) => void
}

const SOURCE_LABEL = { watch: 'Auto', manual: 'Manual', restore: 'Restored' } as const

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  onCompareWithLatest,
  onRollback
}) => {
  const formatFullDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

  return (
    <div className="flex-1 overflow-y-auto text-fg select-none bg-canvas">
      <div className="max-w-[720px] mx-auto px-8 pt-6 pb-16">
        {versions.length === 0 ? (
          <div className="text-center py-20 text-fg-subtle text-ui">
            No snapshots recorded for this file yet.
          </div>
        ) : (
          <ul>
            {versions.map((version, index) => {
              const isLatest = index === 0
              return (
                <li
                  key={version.id}
                  className="group flex items-center gap-4 min-h-14 py-2 px-3 -mx-3 rounded-control hover:bg-raised/60 focus-within:bg-raised/60 transition-colors"
                >
                  <span className="w-10 shrink-0 font-mono text-ui text-fg-muted">
                    v{version.versionNumber}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-ui">
                      <span
                        className="text-fg cursor-help"
                        title={`${formatFullDate(version.createdAt)}, ${version.contentHash.slice(0, 7)}`}
                      >
                        {relativeTime(version.createdAt)}
                      </span>
                      {isLatest && <span className="text-success font-medium">Current</span>}
                    </div>
                    <div className="text-meta text-fg-subtle">
                      {version.varCount} vars, {SOURCE_LABEL[version.source]}
                    </div>
                    {version.note && (
                      <p className="text-meta text-fg-muted truncate">{version.note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    {versions.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCompareWithLatest(version.id)}
                        title="Compare with the current version"
                      >
                        Diff
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRollback(version)}
                      title="Restore this snapshot to disk"
                    >
                      Restore
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
