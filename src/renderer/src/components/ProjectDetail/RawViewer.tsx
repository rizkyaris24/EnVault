import React, { useState } from 'react'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'
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
  const totalLines = lines.length
  const totalChars = rawContent.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-fg select-none bg-canvas">
      {/* Action Bar */}
      <div className="px-6 py-2.5 border-b border-line bg-surface flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-meta font-medium text-fg">Raw Environment File</span>
          <div className="flex items-center space-x-2 text-meta text-fg-subtle font-mono">
            <span className="px-2 py-0.5 rounded-chip bg-raised border border-line-subtle">
              {totalLines} {totalLines === 1 ? 'line' : 'lines'}
            </span>
            <span className="px-2 py-0.5 rounded-chip bg-raised border border-line-subtle">
              {totalChars} chars
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsMasked(!isMasked)}
            leftIcon={
              isMasked ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-accent" />
              )
            }
          >
            {isMasked ? 'Reveal Raw' : 'Mask Raw'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleCopy}
            leftIcon={
              copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />
            }
            title="Copy decrypted file contents to clipboard"
          >
            {copied ? 'Copied File' : 'Copy All'}
          </Button>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-line rounded-panel overflow-hidden flex flex-col font-mono text-ui leading-6">
          <div className="py-3 overflow-x-auto select-text">
            {lines.map((line, idx) => {
              const lineNum = idx + 1
              const trimmed = line.trim()
              const isComment = trimmed.startsWith('#')
              const eqIdx = line.indexOf('=')
              const hasAssignment = !isComment && eqIdx !== -1

              return (
                <div
                  key={idx}
                  className="flex items-start hover:bg-raised/40 transition-colors px-4 group"
                >
                  {/* Line Number Gutter */}
                  <span className="w-10 shrink-0 text-right pr-4 text-fg-subtle select-none text-meta group-hover:text-fg-muted">
                    {lineNum}
                  </span>

                  {/* Line Content */}
                  <div className="flex-1 whitespace-pre break-all">
                    {isComment ? (
                      <span className="text-fg-subtle italic">{line}</span>
                    ) : hasAssignment ? (
                      <>
                        <span className="text-fg font-medium">{line.slice(0, eqIdx)}</span>
                        <span className="text-fg-subtle mx-0.5">=</span>
                        {isMasked ? (
                          <span className="text-fg-subtle tracking-wider font-sans select-none">
                            ••••••••••••••••
                          </span>
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
    </div>
  )
}
