import React, { useState } from 'react'
import { DiffResult, DiffEntry } from '@shared/types'
import { Dialog, Button } from '../ui'

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

  const entries = hideUnchanged
    ? diff.entries.filter((e: DiffEntry) => e.status !== 'unchanged')
    : diff.entries
  const mask = (v?: string): string => (showValues ? (v ?? '') : '••••••••••••')
  const { added, removed, modified, unchanged } = diff.summary

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${fileTitle}: ${versionAName} vs ${versionBName}`}
      description={`${added} added, ${removed} removed, ${modified} modified, ${unchanged} unchanged`}
      maxWidth="lg"
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex items-center justify-end gap-2 -mt-1 mb-2">
        <Button size="sm" variant="ghost" onClick={() => setHideUnchanged(!hideUnchanged)}>
          {hideUnchanged ? 'Show unchanged' : 'Hide unchanged'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowValues(!showValues)}>
          {showValues ? 'Mask values' : 'Reveal values'}
        </Button>
      </div>

      <div className="font-mono text-ui select-text max-h-[50vh] overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-center py-12 font-sans text-ui text-fg-subtle">No differences between these snapshots.</p>
        ) : (
          entries.map((entry: DiffEntry) => {
            if (entry.status === 'unchanged') {
              return (
                <div key={entry.key} className="py-1.5 text-fg-subtle flex justify-between gap-4">
                  <span>{entry.key}</span>
                  <span className="truncate">{mask(entry.oldValue)}</span>
                </div>
              )
            }
            const color =
              entry.status === 'added' ? 'text-success' : entry.status === 'removed' ? 'text-danger' : 'text-warn'
            const sign = entry.status === 'added' ? '+' : entry.status === 'removed' ? '-' : '~'
            return (
              <div key={entry.key} className="py-2">
                <div className={`font-medium ${color}`}>
                  {sign} {entry.key}
                </div>
                <div className="text-meta text-fg-muted truncate">
                  {entry.status === 'modified' ? (
                    <>
                      {mask(entry.oldValue)} <span className="text-fg-subtle">to</span> {mask(entry.newValue)}
                    </>
                  ) : (
                    mask(entry.status === 'added' ? entry.newValue : entry.oldValue)
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Dialog>
  )
}
