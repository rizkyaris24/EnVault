import React, { useState, useEffect, useRef } from 'react'
import { SecretEntry, SecretReuseReference } from '@shared/types'
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Lock,
  Layers,
  X,
  Key
} from 'lucide-react'

interface SecretTableProps {
  secrets: SecretEntry[]
  onCopySecret: (value: string, keyName: string) => void
}

export const SecretTable: React.FC<SecretTableProps> = ({ secrets, onCopySecret }) => {
  const [filter, setFilter] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [copiedItem, setCopiedItem] = useState<{ id: string; type: 'val' | 'key' } | null>(null)
  const [activeReusePopover, setActiveReusePopover] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent): void => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveReusePopover(null)
      }
    }
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setActiveReusePopover(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const toggleReveal = (key: string): void => {
    const next = new Set(revealedKeys)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setRevealedKeys(next)
  }

  const toggleRevealAll = (): void => {
    if (revealedKeys.size === secrets.length) {
      setRevealedKeys(new Set())
    } else {
      setRevealedKeys(new Set(secrets.map((s) => s.key)))
    }
  }

  const handleCopyValue = (key: string, value: string): void => {
    onCopySecret(value, key)
    setCopiedItem({ id: key, type: 'val' })
    setTimeout(() => setCopiedItem(null), 1800)
  }

  const handleCopyKey = (key: string): void => {
    navigator.clipboard.writeText(key)
    setCopiedItem({ id: key, type: 'key' })
    setTimeout(() => setCopiedItem(null), 1800)
  }

  const filteredSecrets = secrets.filter((s) =>
    s.key.toLowerCase().includes(filter.toLowerCase())
  )

  const allRevealed = secrets.length > 0 && revealedKeys.size === secrets.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-palette-white select-none bg-palette-void">
      {/* Search & Actions Bar */}
      <div className="px-6 py-3 border-b border-palette-slate/40 bg-palette-navy/60 flex items-center justify-between gap-4">
        <div className="relative w-72 flex items-center">
          <Search className="w-3.5 h-3.5 text-palette-moss absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter variable keys..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-palette-charcoal border border-palette-slate rounded-lg pl-8 pr-8 py-1.5 text-xs text-palette-white placeholder-palette-moss focus:outline-none focus:border-palette-mint transition"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-2.5 text-palette-moss hover:text-palette-white transition p-0.5"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-palette-stone font-mono text-[11px]">
            {filteredSecrets.length} of {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'}
          </span>
          <button
            onClick={toggleRevealAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-palette-charcoal hover:bg-palette-night border border-palette-slate text-palette-stone hover:text-palette-white transition active:scale-[0.98]"
          >
            {allRevealed ? <EyeOff className="w-3.5 h-3.5 text-palette-mint" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="font-medium text-xs">{allRevealed ? 'Mask All' : 'Reveal All'}</span>
          </button>
        </div>
      </div>

      {/* Secrets Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredSecrets.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 rounded-full bg-palette-charcoal border border-palette-slate flex items-center justify-center mx-auto mb-3">
              <Key className="w-5 h-5 text-palette-moss" />
            </div>
            <p className="text-xs font-semibold text-palette-white">
              {secrets.length === 0 ? 'No variables defined in this file' : 'No matching secrets found'}
            </p>
            <p className="text-[11px] text-palette-stone mt-1 max-w-sm mx-auto">
              {secrets.length === 0
                ? 'This file appears to be empty or contains only comments.'
                : `No secret keys matched "${filter}".`}
            </p>
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="mt-3 px-3 py-1 bg-palette-charcoal hover:bg-palette-slate border border-palette-slate text-palette-mint rounded-md text-xs font-medium transition"
              >
                Clear Filter
              </button>
            )}
          </div>
        ) : (
          <div className="border border-palette-slate/60 rounded-xl overflow-visible bg-palette-navy/40 divide-y divide-palette-slate/40 shadow-sm">
            {filteredSecrets.map((secret) => {
              const isRevealed = revealedKeys.has(secret.key)
              const isValCopied = copiedItem?.id === secret.key && copiedItem?.type === 'val'
              const isKeyCopied = copiedItem?.id === secret.key && copiedItem?.type === 'key'
              const hasReuse = secret.reusedIn && secret.reusedIn.length > 0
              const isPopoverOpen = activeReusePopover === secret.key

              return (
                <div
                  key={secret.key}
                  className="group flex flex-col md:flex-row md:items-center justify-between px-4 py-3 hover:bg-palette-charcoal/50 transition gap-2"
                >
                  {/* Key & Reuse indicator */}
                  <div className="flex items-center space-x-2.5 min-w-[260px] max-w-sm shrink-0">
                    <button
                      onClick={() => handleCopyKey(secret.key)}
                      className="flex items-center space-x-2 text-left group/key text-palette-white hover:text-palette-mint transition"
                      title="Click to copy key name"
                    >
                      <Lock className="w-3.5 h-3.5 text-palette-moss group-hover/key:text-palette-mint shrink-0 transition" />
                      <span className="font-mono font-medium text-xs truncate max-w-[220px]">
                        {secret.key}
                      </span>
                    </button>

                    {isKeyCopied && (
                      <span className="px-1.5 py-0.2 bg-palette-mint text-palette-void rounded text-[10px] font-semibold animate-fade-in">
                        Key Copied!
                      </span>
                    )}

                    {/* Salted HMAC Reuse Badge */}
                    {hasReuse && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveReusePopover(isPopoverOpen ? null : secret.key)
                          }
                          className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-palette-charcoal border border-palette-mint/40 text-palette-mint text-[10px] font-sans hover:bg-palette-slate transition"
                          title="View other projects sharing this secret value"
                        >
                          <AlertTriangle className="w-3 h-3 text-palette-mint shrink-0" />
                          <span>Reused ({secret.reusedIn!.length})</span>
                        </button>

                        {/* Reuse Popover */}
                        {isPopoverOpen && (
                          <div
                            ref={popoverRef}
                            className="absolute left-0 top-full mt-2 z-50 w-80 bg-palette-charcoal border border-palette-slate rounded-xl shadow-2xl p-3.5 text-xs text-palette-white animate-fade-in"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-palette-slate mb-2.5">
                              <span className="font-semibold text-palette-white flex items-center space-x-1.5">
                                <Layers className="w-3.5 h-3.5 text-palette-mint" />
                                <span>Secret Reuse Detected</span>
                              </span>
                              <button
                                onClick={() => setActiveReusePopover(null)}
                                className="text-palette-moss hover:text-palette-white p-1 rounded transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[11px] text-palette-stone mb-2 leading-relaxed">
                              This exact secret value is also present in other tracked projects:
                            </p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {secret.reusedIn!.map((ref: SecretReuseReference, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-palette-navy border border-palette-slate text-[11px]"
                                >
                                  <div className="font-medium text-palette-white">{ref.projectName}</div>
                                  <div className="font-mono text-[10px] text-palette-stone mt-0.5 truncate">
                                    {ref.envFile} → <span className="text-palette-mint">{ref.keyName}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-palette-slate/60 text-[10px] text-palette-moss">
                              🔒 Matched via salted HMAC hash. Zero plaintext leaked.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Value and Inline Actions (Law of Proximity) */}
                  <div className="flex items-center justify-between flex-1 min-w-0 pl-2 gap-3">
                    <div className="truncate font-mono text-xs select-text min-w-0 flex-1">
                      {isRevealed ? (
                        <span className="bg-palette-charcoal px-2.5 py-1 rounded-md text-palette-mint border border-palette-slate inline-block max-w-full truncate">
                          {secret.value}
                        </span>
                      ) : (
                        <span className="text-palette-moss tracking-widest font-sans select-none text-xs">
                          ••••••••••••••••••••••••
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => toggleReveal(secret.key)}
                        className="p-1.5 text-palette-moss hover:text-palette-white hover:bg-palette-charcoal rounded-md transition"
                        title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                      >
                        {isRevealed ? (
                          <EyeOff className="w-4 h-4 text-palette-mint" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyValue(secret.key, secret.value)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition text-xs font-medium ${
                          isValCopied
                            ? 'bg-palette-mint text-palette-void font-semibold shadow-sm'
                            : 'bg-palette-charcoal hover:bg-palette-night border border-palette-slate text-palette-stone hover:text-palette-white'
                        }`}
                        title="Copy decrypted secret value"
                      >
                        {isValCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-palette-void" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-palette-moss" />
                            <span>Copy</span>
                          </>
                        )}
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
