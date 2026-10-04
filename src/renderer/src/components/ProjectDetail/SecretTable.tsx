import React, { useState, useEffect, useRef, useCallback } from 'react'
import { SecretEntry, SecretReuseReference } from '@shared/types'
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  AlertTriangle,
  X,
  Key
} from 'lucide-react'
import { Button, IconButton, Badge } from '../ui'

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
  const tableRef = useRef<HTMLTableElement>(null)

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
      {/* Search & Actions Bar */}
      <div className="px-6 py-2.5 border-b border-line bg-surface flex items-center justify-between gap-4">
        <div className="relative w-72 flex items-center">
          <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter variable keys..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-8 bg-raised text-fg placeholder:text-fg-subtle border border-line rounded-control pl-8 pr-8 text-meta focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute right-2 p-1 text-fg-subtle hover:text-fg rounded-control transition-colors"
              title="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 text-meta">
          <span className="text-fg-subtle font-mono">
            {filteredSecrets.length} of {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleRevealAll}
            leftIcon={
              allRevealed ? (
                <EyeOff className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )
            }
          >
            {allRevealed ? 'Mask All' : 'Reveal All'}
          </Button>
        </div>
      </div>

      {/* Secrets Table Viewport */}
      <div className="flex-1 overflow-y-auto">
        {filteredSecrets.length === 0 ? (
          <div className="text-center py-20">
            <Key className="w-7 h-7 text-fg-subtle mx-auto mb-2 opacity-40" />
            <p className="text-ui font-medium text-fg">
              {secrets.length === 0 ? 'No variables defined in this file' : 'No matching secrets found'}
            </p>
            <p className="text-meta text-fg-subtle mt-1 max-w-sm mx-auto">
              {secrets.length === 0
                ? 'This file appears to be empty or contains only comments.'
                : `No secret keys matched "${filter}".`}
            </p>
            {filter && (
              <div className="mt-4">
                <Button size="sm" variant="secondary" onClick={() => setFilter('')}>
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        ) : (
          <table ref={tableRef} className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-surface border-b border-line text-meta font-medium text-fg-subtle select-none">
              <tr>
                <th scope="col" className="py-2 px-6 w-1/3">
                  Key
                </th>
                <th scope="col" className="py-2 px-4 w-1/2">
                  Value
                </th>
                <th scope="col" className="py-2 px-6 text-right w-1/6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle text-ui">
              {filteredSecrets.map((secret, index) => {
                const isSelected = index === selectedIndex
                const isRevealed = revealedKeys.has(secret.key)
                const isValCopied = copiedItem?.id === secret.key && copiedItem?.type === 'val'
                const isKeyCopied = copiedItem?.id === secret.key && copiedItem?.type === 'key'
                const hasReuse = secret.reusedIn && secret.reusedIn.length > 0
                const isPopoverOpen = activeReusePopover === secret.key

                return (
                  <tr
                    key={secret.key}
                    tabIndex={0}
                    onClick={() => setSelectedIndex(index)}
                    className={`transition-colors duration-100 group ${
                      isSelected ? 'bg-raised' : 'hover:bg-raised/50'
                    }`}
                  >
                    {/* Key Column */}
                    <td className="py-2.5 px-6 font-mono text-ui align-middle">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleCopyKey(secret.key)}
                          className="font-medium text-fg hover:text-accent transition-colors text-left truncate max-w-xs focus:outline-none"
                          title="Click to copy key name"
                        >
                          {secret.key}
                        </button>

                        {isKeyCopied && (
                          <Badge variant="accent" className="font-sans text-meta py-0">
                            Copied
                          </Badge>
                        )}

                        {hasReuse && (
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveReusePopover(isPopoverOpen ? null : secret.key)
                              }}
                              className="focus:outline-none"
                              title="Secret shared with other projects"
                            >
                              <Badge variant="warn" className="cursor-pointer gap-1 py-0">
                                <AlertTriangle className="w-3 h-3 text-warn shrink-0" />
                                <span>Reused ({secret.reusedIn!.length})</span>
                              </Badge>
                            </button>

                            {/* Salted HMAC Reuse Popover */}
                            {isPopoverOpen && (
                              <div
                                ref={popoverRef}
                                className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-surface border border-line rounded-panel shadow-lg p-3 text-meta text-fg animate-fade-in"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-line-subtle mb-2">
                                  <span className="font-semibold text-fg">Secret Reuse Detected</span>
                                  <IconButton
                                    icon={<X className="w-3.5 h-3.5" />}
                                    label="Close popover"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setActiveReusePopover(null)}
                                  />
                                </div>
                                <p className="text-meta text-fg-muted mb-2 leading-relaxed">
                                  This secret value matches across other tracked projects:
                                </p>
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                  {secret.reusedIn!.map((ref: SecretReuseReference, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-1.5 rounded-control bg-raised border border-line-subtle text-meta"
                                    >
                                      <div className="font-medium text-fg">{ref.projectName}</div>
                                      <div className="font-mono text-fg-subtle truncate mt-0.5">
                                        {ref.envFile} → {ref.keyName}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 pt-2 border-t border-line-subtle text-meta text-fg-subtle">
                                  Salted HMAC match. Zero plaintext leaked.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Value Column */}
                    <td className="py-2.5 px-4 font-mono text-ui align-middle">
                      <div className="truncate max-w-md select-text">
                        {isRevealed ? (
                          <span className="text-fg font-normal">{secret.value}</span>
                        ) : (
                          <span className="text-fg-subtle tracking-widest select-none">
                            ••••••••••••••••••••
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions Column (Law of Proximity) */}
                    <td className="py-2.5 px-6 text-right align-middle">
                      <div className="flex items-center justify-end space-x-1">
                        <IconButton
                          icon={
                            isRevealed ? (
                              <EyeOff className="w-4 h-4 text-accent" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )
                          }
                          label={isRevealed ? 'Hide secret' : 'Reveal secret'}
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleReveal(secret.key)}
                        />

                        <Button
                          size="sm"
                          variant={isValCopied ? 'primary' : 'secondary'}
                          onClick={() => handleCopyValue(secret.key, secret.value)}
                          leftIcon={
                            isValCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-fg-subtle" />
                            )
                          }
                          className="h-7 px-2 text-meta"
                        >
                          {isValCopied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
