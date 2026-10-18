import React, { useState } from 'react'
import { Button } from '../ui'

interface RawViewerProps {
  rawContent: string
  onCopyAll: (content: string) => void
}

export const RawViewer: React.FC<RawViewerProps> = ({ rawContent, onCopyAll }) => {
  const [copied, setCopied] = useState(false)
  const [isMasked, setIsMasked] = useState(true)

  const handleCopy = (): void => {
    onCopyAll(rawContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const lines = rawContent.split('\n')

  return (
    <div className="flex-1 overflow-y-auto text-fg select-none bg-canvas">
      <div className="max-w-[720px] mx-auto px-8 pt-6 pb-16">
        <div className="flex items-center justify-between">
          <span className="text-meta text-fg-subtle">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setIsMasked(!isMasked)}>
              {isMasked ? 'Reveal' : 'Mask'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              title="Copy decrypted file contents to clipboard"
            >
              {copied ? 'Copied' : 'Copy all'}
            </Button>
          </div>
        </div>

        <div className="mt-3 bg-surface rounded-panel font-mono text-ui leading-6 py-4 overflow-x-auto select-text">
          {lines.map((line, idx) => {
            const isComment = line.trim().startsWith('#')
            const eqIdx = line.indexOf('=')
            const hasAssignment = !isComment && eqIdx !== -1

            return (
              <div key={idx} className="flex items-baseline px-4">
                <span className="w-8 shrink-0 text-right pr-4 text-fg-subtle select-none text-meta">
                  {idx + 1}
                </span>
                <div className="flex-1 whitespace-pre break-all">
                  {isComment ? (
                    <span className="text-fg-subtle">{line}</span>
                  ) : hasAssignment ? (
                    <>
                      <span className="text-fg font-medium">{line.slice(0, eqIdx)}</span>
                      <span className="text-fg-subtle">=</span>
                      {isMasked ? (
                        <span className="text-fg-subtle tracking-wider select-none">••••••••••••</span>
                      ) : (
                        <span className="text-fg-muted">{line.slice(eqIdx + 1)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-fg-muted">{line || ' '}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
