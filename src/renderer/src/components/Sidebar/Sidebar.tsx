import React, { useState } from 'react'
import { Project, VaultStatus } from '@shared/types'
import {
  Plus,
  Search,
  Folder,
  AlertTriangle,
  Trash2,
  Lock,
  Compass,
  Sun,
  Moon,
  Monitor,
  X
} from 'lucide-react'
import { Button, IconButton, Kbd, Badge } from '../ui'
import { useTheme } from '../../theme/useTheme'

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  vaultStatus: VaultStatus | null
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
  onDeleteProject: (id: string, name: string) => void
  onOpenCommandPalette?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectId,
  vaultStatus,
  onSelectProject,
  onAddProject,
  onScanComputer,
  onDeleteProject,
  onOpenCommandPalette
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const { theme, setTheme } = useTheme()

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="w-72 bg-surface border-r border-line flex flex-col h-full select-none text-fg">
      {/* Top Titlebar Header */}
      <div className="titlebar-drag-region pt-8 pb-3 px-4 border-b border-line-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-title font-semibold text-fg tracking-tight">EnVault</span>
            <Badge variant="default" className="text-meta">
              v1.0
            </Badge>
          </div>
          <span className="text-meta text-fg-subtle">Passive Vault</span>
        </div>
      </div>

      {/* Action Bar & Quick Search */}
      <div className="p-3 space-y-2.5 border-b border-line-subtle">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={onAddProject}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            title="Add a project folder (Cmd+N)"
          >
            Add Folder
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onScanComputer}
            leftIcon={<Compass className="w-3.5 h-3.5 text-accent" />}
            title="Scan computer for .env files (Shift+Cmd+S)"
          >
            Scan PC
          </Button>
        </div>

        {/* Search Input with Keyboard Shortcut and Instant Clear */}
        <div className="relative flex items-center w-full">
          <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-raised text-fg placeholder:text-fg-subtle border border-line rounded-control pl-8 pr-12 text-meta focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 m-0 border-0 bg-transparent text-fg-subtle hover:text-fg rounded-chip transition-colors flex items-center justify-center focus:outline-none"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0 m-0 border-0 bg-transparent flex items-center justify-center hover:opacity-80 focus:outline-none"
              title="Open command palette (Cmd+K)"
            >
              <Kbd shortcut="⌘K" />
            </button>
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-meta font-medium text-fg-subtle">
        <span>Tracked Projects</span>
        <span className="font-mono text-meta text-fg-subtle">{projects.length}</span>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {filteredProjects.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Folder className="w-7 h-7 text-fg-subtle mx-auto mb-2 opacity-40" />
            <p className="text-ui font-medium text-fg-muted">
              {projects.length === 0 ? 'No projects registered' : 'No matching projects'}
            </p>
            <p className="text-meta text-fg-subtle mt-1 max-w-[200px] mx-auto">
              {projects.length === 0
                ? 'Add a project folder or scan your computer to start passive backup.'
                : `No projects found matching "${searchQuery}".`}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isSelected = project.id === selectedProjectId
            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectProject(project.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectProject(project.id)
                  }
                }}
                className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-control text-ui cursor-pointer transition-colors duration-150 select-none outline-none focus-visible:outline-2 focus-visible:outline-accent ${
                  isSelected
                    ? 'bg-raised text-fg font-medium border border-line'
                    : 'text-fg-muted hover:bg-raised/60 hover:text-fg border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 truncate flex-1 min-w-0 pr-2">
                  <Folder
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isSelected ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted'
                    }`}
                  />
                  <div className="truncate flex-1 min-w-0">
                    <div className="truncate text-ui font-medium leading-snug text-fg">
                      {project.name}
                    </div>
                    <div className="truncate text-meta text-fg-subtle font-mono select-text">
                      {project.path}
                    </div>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="flex items-center space-x-1 shrink-0">
                  {project.hasMissingFiles && (
                    <span
                      title="Missing .env file on disk"
                      className="text-danger flex items-center"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {project.reuseWarningCount ? (
                    <span
                      title={`${project.reuseWarningCount} secret(s) shared across projects`}
                      className="text-warn flex items-center"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  ) : null}
                  <span className="text-meta font-mono text-fg-subtle px-1.5 py-0.5 rounded-chip bg-surface border border-line-subtle">
                    {project.fileCount ?? 0}
                  </span>
                  <IconButton
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label={`Stop tracking ${project.name}`}
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteProject(project.id, project.name)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Vault Status & Theme Footer */}
      <div className="p-3 border-t border-line-subtle bg-surface flex items-center justify-between">
        <div className="flex items-center space-x-2 text-meta text-fg-muted">
          <span className="w-2 h-2 rounded-full bg-success shrink-0" />
          <span className="font-medium text-fg">AES-256-GCM</span>
          <span className="text-fg-subtle font-mono">
            {vaultStatus?.keySource === 'keychain' ? 'Keychain' : 'Local'}
          </span>
        </div>

        {/* Theme Mode Segmented Toggle */}
        <div className="flex items-center border border-line rounded-control p-0.5 bg-raised">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-1 rounded-[3px] transition-colors ${
              theme === 'light' ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg'
            }`}
            title="Light mode"
            aria-label="Light mode"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-1 rounded-[3px] transition-colors ${
              theme === 'dark' ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg'
            }`}
            title="Dark mode"
            aria-label="Dark mode"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-1 rounded-[3px] transition-colors ${
              theme === 'system' ? 'bg-surface text-fg shadow-xs' : 'text-fg-subtle hover:text-fg'
            }`}
            title="System theme"
            aria-label="System theme"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
