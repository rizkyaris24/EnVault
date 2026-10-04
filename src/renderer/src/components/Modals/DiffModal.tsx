import React, { useState } from 'react'
import { DiffResult, DiffEntry } from '@shared/types'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Dialog, Button, Badge } from '../ui'

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

  if (!isOpen || !diff) return null

  const displayedEntries = hideUnchanged
    ? diff.entries.filter((e: DiffEntry) => e.status !== 'unchanged')
    : diff.entries

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Version Diff — ${fileTitle}`}
      description={`Comparing ${versionAName} with ${versionBName}`}
      maxWidth="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Diff Summary Bar & Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-line-subtle text-meta">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <Badge variant="success">+{diff.summary.added} added</Badge>
            <Badge variant="danger">-{diff.summary.removed} removed</Badge>
            <Badge variant="warn">~{diff.summary.modified} modified</Badge>
            <span className="text-fg-subtle font-mono ml-1">
              {diff.summary.unchanged} unchanged
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer text-fg-muted hover:text-fg select-none text-meta">
              <input
                type="checkbox"
                checked={hideUnchanged}
                onChange={(e) => setHideUnchanged(e.target.checked)}
                className="rounded-chip bg-raised border-line text-accent focus:ring-0 w-3.5 h-3.5"
              />
              <span>Hide unchanged</span>
            </label>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowValues(!showValues)}
              leftIcon={
                showValues ? (
                  <EyeOff className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )
              }
            >
              {showValues ? 'Mask Values' : 'Reveal Values'}
            </Button>
          </div>
        </div>

        {/* Diff Entries List */}
        <div className="space-y-2 font-mono text-ui select-text max-h-[50vh] overflow-y-auto">
          {displayedEntries.length === 0 ? (
            <div className="text-center py-16 text-fg-subtle">
              <CheckCircle2 className="w-7 h-7 text-accent mx-auto mb-2 opacity-60" />
              <p className="text-ui text-fg-muted">No differences detected between these snapshots.</p>
            </div>
          ) : (
            displayedEntries.map((entry: DiffEntry) => {
              const mask = (v?: string): string =>
                showValues ? (v ?? '') : '••••••••••••••••'

              if (entry.status === 'added') {
                return (
                  <div
                    key={entry.key}
                    className="p-3 rounded-control bg-raised border border-success/30 flex flex-col space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-success">+ {entry.key}</span>
                      <Badge variant="success">ADDED</Badge>
                    </div>
                    <div className="text-fg-muted truncate text-meta">
                      = {mask(entry.newValue)}
                    </div>
                  </div>
                )
              }

              if (entry.status === 'removed') {
                return (
                  <div
                    key={entry.key}
                    className="p-3 rounded-control bg-raised border border-danger/30 flex flex-col space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-danger line-through">- {entry.key}</span>
                      <Badge variant="danger">REMOVED</Badge>
                    </div>
                    <div className="text-fg-subtle line-through truncate text-meta">
                      = {mask(entry.oldValue)}
                    </div>
                  </div>
                )
              }

              if (entry.status === 'modified') {
                return (
                  <div
                    key={entry.key}
                    className="p-3 rounded-control bg-raised border border-warn/30 flex flex-col space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-warn">~ {entry.key}</span>
                      <Badge variant="warn">MODIFIED</Badge>
                    </div>
                    <div className="space-y-0.5 text-meta">
                      <div className="text-danger line-through truncate">- {mask(entry.oldValue)}</div>
                      <div className="text-success truncate">+ {mask(entry.newValue)}</div>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={entry.key}
                  className="px-3 py-2 rounded-control bg-surface border border-line-subtle text-fg-muted flex items-center justify-between"
                >
                  <span className="text-fg-muted">{entry.key}</span>
                  <span className="text-fg-subtle truncate max-w-xs">{mask(entry.oldValue)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Dialog>
  )
}
