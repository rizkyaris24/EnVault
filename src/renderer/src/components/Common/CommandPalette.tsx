import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Project } from '@shared/types'
import {
  Search,
  Folder,
  Plus,
  Compass,
  Camera,
  ListFilter,
  Code,
  History,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { Kbd } from '../ui'
import { useTheme } from '../../theme/useTheme'

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
  onSnapshotNow: () => void
  onChangeView: (view: 'table' | 'raw' | 'history') => void
}

interface PaletteAction {
  id: string
  title: string
  subtitle?: string
  shortcut?: string
  icon: React.ReactNode
  category: 'Actions' | 'Projects' | 'Appearance'
  run: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
  onAddProject,
  onScanComputer,
  onSnapshotNow,
  onChangeView
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { setTheme } = useTheme()

  const allActions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [
      {
        id: 'action-add-project',
        title: 'Add Project Folder',
        subtitle: 'Register an existing workspace directory',
        shortcut: '⌘N',
        icon: <Plus className="w-4 h-4 text-accent" />,
        category: 'Actions',
        run: () => {
          onClose()
          onAddProject()
        }
      },
      {
        id: 'action-scan-pc',
        title: 'Scan Computer',
        subtitle: 'Auto-discover and ingest all .env files',
        shortcut: '⇧⌘S',
        icon: <Compass className="w-4 h-4 text-accent" />,
        category: 'Actions',
        run: () => {
          onClose()
          onScanComputer()
        }
      },
      {
        id: 'action-snapshot',
        title: 'Take Snapshot Now',
        subtitle: 'Encrypt and store current local environment',
        icon: <Camera className="w-4 h-4 text-accent" />,
        category: 'Actions',
        run: () => {
          onClose()
          onSnapshotNow()
        }
      },
      {
        id: 'view-secrets',
        title: 'Switch to Secrets Table',
        shortcut: '⌘1',
        icon: <ListFilter className="w-4 h-4 text-fg-subtle" />,
        category: 'Actions',
        run: () => {
          onClose()
          onChangeView('table')
        }
      },
      {
        id: 'view-raw',
        title: 'Switch to Raw Code View',
        shortcut: '⌘2',
        icon: <Code className="w-4 h-4 text-fg-subtle" />,
        category: 'Actions',
        run: () => {
          onClose()
          onChangeView('raw')
        }
      },
      {
        id: 'view-history',
        title: 'Switch to History Timeline',
        shortcut: '⌘3',
        icon: <History className="w-4 h-4 text-fg-subtle" />,
        category: 'Actions',
        run: () => {
          onClose()
          onChangeView('history')
        }
      },
      {
        id: 'theme-light',
        title: 'Set Theme: Light',
        icon: <Sun className="w-4 h-4 text-fg-subtle" />,
        category: 'Appearance',
        run: () => {
          onClose()
          setTheme('light')
        }
      },
      {
        id: 'theme-dark',
        title: 'Set Theme: Dark',
        icon: <Moon className="w-4 h-4 text-fg-subtle" />,
        category: 'Appearance',
        run: () => {
          onClose()
          setTheme('dark')
        }
      },
      {
        id: 'theme-system',
        title: 'Set Theme: System Default',
        icon: <Monitor className="w-4 h-4 text-fg-subtle" />,
        category: 'Appearance',
        run: () => {
          onClose()
          setTheme('system')
        }
      }
    ]

    // Append project navigation actions
    projects.forEach((p) => {
      list.push({
        id: `proj-${p.id}`,
        title: p.name,
        subtitle: p.path,
        icon: <Folder className="w-4 h-4 text-accent" />,
        category: 'Projects',
        run: () => {
          onClose()
          onSelectProject(p.id)
        }
      })
    })

    return list
  }, [
    projects,
    onClose,
    onAddProject,
    onScanComputer,
    onSnapshotNow,
    onChangeView,
    onSelectProject,
    setTheme
  ])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allActions
    return allActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q))
    )
  }, [allActions, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected) {
          selected.run()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filtered, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl bg-surface border border-line rounded-dialog shadow-xl overflow-hidden flex flex-col max-h-[70vh] select-none text-fg"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-line-subtle gap-3">
          <Search className="w-4 h-4 text-fg-subtle shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search projects..."
            className="flex-1 bg-transparent text-ui text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <Kbd shortcut="Esc" />
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-0.5 max-h-[50vh]">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-meta text-fg-subtle">
              No matching commands or projects found.
            </div>
          ) : (
            filtered.map((action, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={action.id}
                  role="button"
                  tabIndex={0}
                  onClick={action.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-control text-ui cursor-pointer transition-colors duration-100 ${
                    isSelected
                      ? 'bg-raised text-fg font-medium'
                      : 'text-fg-muted hover:bg-raised/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate flex-1 min-w-0 pr-3">
                    <span className="shrink-0">{action.icon}</span>
                    <div className="truncate min-w-0">
                      <div className="text-ui font-medium text-fg truncate">
                        {action.title}
                      </div>
                      {action.subtitle && (
                        <div className="text-meta font-mono text-fg-subtle truncate">
                          {action.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {action.shortcut && <Kbd shortcut={action.shortcut} />}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-line-subtle bg-raised/40 flex items-center justify-between text-meta text-fg-subtle">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-mono">{filtered.length} results</span>
        </div>
      </div>
    </div>
  )
}
