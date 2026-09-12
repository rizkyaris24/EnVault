import React, { useState } from 'react'
import { Copy, Check, Eye, EyeOff, FileCode } from 'lucide-react'

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
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = rawContent.split('\n')
  const totalLines = lines.length
  const totalChars = rawContent.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-palette-white select-none bg-palette-void">
      {/* Action Bar */}
      <div className="px-6 py-3 border-b border-palette-slate/40 bg-palette-navy/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-palette-stone font-mono">
            <FileCode className="w-4 h-4 text-palette-mint" />
            <span>Raw File Snapshot</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-palette-moss font-mono">
            <span className="px-2 py-0.5 rounded bg-palette-charcoal border border-palette-slate/60">
              {totalLines} {totalLines === 1 ? 'line' : 'lines'}
            </span>
            <span className="px-2 py-0.5 rounded bg-palette-charcoal border border-palette-slate/60">
              {totalChars} chars
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsMasked(!isMasked)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-palette-charcoal hover:bg-palette-night border border-palette-slate text-xs text-palette-stone hover:text-palette-white transition active:scale-[0.98]"
          >
            {isMasked ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-palette-mint" />
            )}
            <span className="font-medium">{isMasked ? 'Reveal Raw' : 'Mask Raw'}</span>
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm active:scale-[0.98] ${
              copied
                ? 'bg-palette-teal text-palette-void'
                : 'bg-palette-mint hover:bg-palette-teal text-palette-void shadow-palette-mint/15'
            }`}
            title="Copy decrypted file contents to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied File' : 'Copy All'}</span>
          </button>
        </div>
      </div>

      {/* Editor Viewer with Line Numbers and Syntax Highlighting */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-palette-navy border border-palette-slate rounded-xl overflow-hidden shadow-inner flex flex-col font-mono text-xs leading-6">
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
                  className="flex items-start hover:bg-palette-charcoal/40 transition-colors px-4 group"
                >
                  {/* Line Number gutter */}
                  <span className="w-10 shrink-0 text-right pr-4 text-palette-moss select-none text-[11px] group-hover:text-palette-stone">
                    {lineNum}
                  </span>

                  {/* Line content */}
                  <div className="flex-1 whitespace-pre break-all">
                    {isComment ? (
                      <span className="text-palette-moss italic">{line}</span>
                    ) : hasAssignment ? (
                      <>
                        <span className="text-palette-mint font-medium">{line.slice(0, eqIdx)}</span>
                        <span className="text-palette-stone mx-0.5">=</span>
                        {isMasked ? (
                          <span className="text-palette-moss font-sans tracking-wider">
                            ••••••••••••••••
                          </span>
                        ) : (
                          <span className="text-palette-white">{line.slice(eqIdx + 1)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-palette-stone">{line || ' '}</span>
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
