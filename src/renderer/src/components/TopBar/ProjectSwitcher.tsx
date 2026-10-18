import React, { useEffect, useRef, useState } from 'react'
import { Project } from '@shared/types'
import { ChevronDown, Plus, Compass } from 'lucide-react'
import { StatusDot } from '../Home/StatusDot'

interface ProjectSwitcherProps {
  projects: Project[]
  selectedProject: Project
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onAddProject,
  onScanComputer
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) setIsOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const close = (): void => {
    setIsOpen(false)
    setQuery('')
  }

  const matches = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  const itemClass =
    'w-full flex items-center gap-2 px-3 h-9 rounded-control text-ui text-left text-fg-muted hover:bg-raised hover:text-fg transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent'

  return (
    <div ref={rootRef} className="relative titlebar-no-drag">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-control text-ui font-medium text-fg hover:bg-raised transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="truncate max-w-[220px]">{selectedProject.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-fg-subtle" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-10 z-40 w-72 bg-canvas rounded-dialog shadow-float p-2 animate-fade-in">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find project"
            className="w-full h-9 px-3 mb-1 bg-raised rounded-control text-ui text-fg placeholder:text-fg-subtle outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
          <div role="listbox" className="max-h-64 overflow-y-auto">
            {matches.length === 0 && (
              <p className="px-3 py-3 text-meta text-fg-subtle">No matching projects</p>
            )}
            {matches.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={p.id === selectedProject.id}
                onClick={() => {
                  onSelectProject(p.id)
                  close()
                }}
                className={`${itemClass} ${p.id === selectedProject.id ? 'text-fg font-medium' : ''}`}
              >
                <span className="truncate flex-1">{p.name}</span>
                <StatusDot project={p} />
              </button>
            ))}
          </div>
          <div className="mt-1 pt-1">
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close()
                onAddProject()
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add folder
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                close()
                onScanComputer()
              }}
            >
              <Compass className="w-3.5 h-3.5" />
              Scan computer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
