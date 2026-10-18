import React, { useState, useEffect, useRef, useCallback } from 'react'
import { SecretEntry, SecretReuseReference } from '@shared/types'
import { Eye, EyeOff, Copy, Check, Search, X } from 'lucide-react'
import { Button, IconButton } from '../ui'

interface SecretTableProps {
  secrets: SecretEntry[]
  onCopySecret: (value: string, keyName: string) => void
}

export const SecretTable: React.FC<SecretTableProps> = ({ secrets, onCopySecret }) => {
  const [filter, setFilter] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [copiedItem, setCopiedItem] = useState<{ id: string; type: 'val' | 'key' } | null>(null)
  const [activeReusePopover, setActiveReusePopover] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const popoverRef = useRef<HTMLDivElement>(null)

  const filteredSecrets = secrets.filter((s) =>
    s.key.toLowerCase().includes(filter.toLowerCase())
  )

  useEffect(() => {
    // Reset selected index when filter changes
    setSelectedIndex(0)
  }, [filter])

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

  const toggleReveal = useCallback((key: string): void => {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleRevealAll = (): void => {
    if (revealedKeys.size === secrets.length) {
      setRevealedKeys(new Set())
    } else {
      setRevealedKeys(new Set(secrets.map((s) => s.key)))
    }
  }

  const handleCopyValue = useCallback(
    (key: string, value: string): void => {
      onCopySecret(value, key)
      setCopiedItem({ id: key, type: 'val' })
      setTimeout(() => setCopiedItem(null), 1500)
    },
    [onCopySecret]
  )

  const handleCopyKey = useCallback((key: string): void => {
    navigator.clipboard.writeText(key)
    setCopiedItem({ id: key, type: 'key' })
    setTimeout(() => setCopiedItem(null), 1500)
  }, [])

  // Keyboard navigation across secrets table
  useEffect(() => {
    const handleTableKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (isInput) return

      if (filteredSecrets.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredSecrets.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredSecrets[selectedIndex]
        if (selected) {
          toggleReveal(selected.key)
        }
      } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        const selected = filteredSecrets[selectedIndex]
        if (selected) {
          handleCopyValue(selected.key, selected.value)
        }
      }
    }

    window.addEventListener('keydown', handleTableKeyDown)
    return () => window.removeEventListener('keydown', handleTableKeyDown)
  }, [filteredSecrets, selectedIndex, toggleReveal, handleCopyValue])

  const allRevealed = secrets.length > 0 && revealedKeys.size === secrets.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-fg select-none bg-canvas">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-8 pt-6 pb-16">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs flex items-center">
              <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter keys"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full h-9 bg-raised text-fg placeholder:text-fg-subtle rounded-full pl-9 pr-8 text-ui focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  className="absolute right-2.5 text-fg-subtle hover:text-fg"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 text-meta">
              <span className="text-fg-subtle">
                {filteredSecrets.length === secrets.length
                  ? `${secrets.length} ${secrets.length === 1 ? 'secret' : 'secrets'}`
                  : `${filteredSecrets.length} of ${secrets.length}`}
              </span>
              {secrets.length > 0 && (
                <Button size="sm" variant="ghost" onClick={toggleRevealAll}>
                  {allRevealed ? 'Mask all' : 'Reveal all'}
                </Button>
              )}
            </div>
          </div>

          {filteredSecrets.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-title font-medium text-fg">
                {secrets.length === 0 ? 'No variables in this file' : 'No matching keys'}
              </p>
              <p className="text-ui text-fg-subtle mt-1">
                {secrets.length === 0
                  ? 'The file is empty or contains only comments.'
                  : `Nothing matched "${filter}".`}
              </p>
            </div>
          ) : (
            <ul className="mt-4">
              {filteredSecrets.map((secret, index) => {
                const isSelected = index === selectedIndex
                const isRevealed = revealedKeys.has(secret.key)
                const isValCopied = copiedItem?.id === secret.key && copiedItem?.type === 'val'
                const isKeyCopied = copiedItem?.id === secret.key && copiedItem?.type === 'key'
                const hasReuse = secret.reusedIn && secret.reusedIn.length > 0
                const isPopoverOpen = activeReusePopover === secret.key

                return (
                  <li
                    key={secret.key}
                    onClick={() => setSelectedIndex(index)}
                    onMouseMove={() => !isSelected && setSelectedIndex(index)}
                    className={`group relative flex items-center gap-4 h-11 px-3 -mx-3 rounded-control transition-colors duration-100 ${
                      isSelected ? 'bg-raised' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 w-2/5 min-w-0 font-mono text-ui">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(secret.key)}
                        className="font-medium text-fg hover:text-accent transition-colors text-left truncate focus:outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-chip"
                        title="Copy key name"
                      >
                        {isKeyCopied ? 'Copied' : secret.key}
                      </button>

                      {hasReuse && (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveReusePopover(isPopoverOpen ? null : secret.key)
                            }}
                            className="flex items-center p-1 rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
                            aria-label={`Shared with ${secret.reusedIn!.length} other project(s)`}
                            title="Secret shared with other projects"
                          >
                            <span className="w-2 h-2 rounded-full bg-warn" />
                          </button>

                          {isPopoverOpen && (
                            <div
                              ref={popoverRef}
                              className="absolute left-0 top-full mt-1 z-50 w-72 bg-canvas rounded-dialog shadow-float p-4 text-meta text-fg font-sans animate-fade-in"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-ui font-medium text-fg">Also used in</p>
                              <ul className="mt-2 space-y-2 max-h-36 overflow-y-auto">
                                {secret.reusedIn!.map((ref: SecretReuseReference, idx: number) => (
                                  <li key={idx}>
                                    <div className="text-ui text-fg">{ref.projectName}</div>
                                    <div className="font-mono text-fg-subtle truncate">
                                      {ref.envFile} / {ref.keyName}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-3 text-fg-subtle">Matched by salted hash. No plaintext shared.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 font-mono text-ui truncate select-text">
                      {isRevealed ? (
                        <span className="text-fg">{secret.value}</span>
                      ) : (
                        <span className="text-fg-subtle tracking-widest select-none">••••••••••••</span>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      }`}
                    >
                      <IconButton
                        icon={isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        label={isRevealed ? 'Hide secret' : 'Reveal secret'}
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleReveal(secret.key)}
                      />
                      <IconButton
                        icon={isValCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        label={isValCopied ? 'Copied' : 'Copy value'}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyValue(secret.key, secret.value)}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
