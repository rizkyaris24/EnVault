import React, { useState } from 'react'
import { Project, VaultStatus } from '@shared/types'
import {
  FolderLock,
  Plus,
  Search,
  Folder,
  AlertTriangle,
  Trash2,
  Lock,
  Radar
} from 'lucide-react'

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  vaultStatus: VaultStatus | null
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
  onDeleteProject: (id: string, name: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  selectedProjectId,
  vaultStatus,
  onSelectProject,
  onAddProject,
  onScanComputer,
  onDeleteProject
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-72 bg-palette-deep border-r border-palette-olive/50 flex flex-col h-full select-none text-palette-linen">
      {/* Top title & drag region */}
      <div className="titlebar-drag-region pt-8 pb-3 px-4 border-b border-palette-olive/40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-palette-mint to-palette-teal flex items-center justify-center shadow-lg shadow-palette-mint/20">
            <FolderLock className="w-4 h-4 text-palette-charcoal" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center space-x-1.5">
              <span>
                <span className="text-palette-white">En</span>
                <span className="text-palette-mint">Vault</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-palette-charcoal text-palette-mint rounded border border-palette-slate">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-palette-stone truncate">Passive .env backup</div>
          </div>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="p-3 space-y-2 border-b border-palette-olive/40">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAddProject}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 bg-palette-mint hover:bg-palette-teal text-palette-void rounded-lg text-xs font-semibold shadow-md shadow-palette-mint/15 transition active:scale-[0.98] group"
            title="Add a project folder (⌘N)"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Folder</span>
          </button>

          <button
            onClick={onScanComputer}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 bg-palette-charcoal hover:bg-palette-night border border-palette-slate text-palette-white rounded-lg text-xs font-medium transition active:scale-[0.98]"
            title="Scan whole computer for all .env files and auto-save (⇧⌘S)"
          >
            <Radar className="w-3.5 h-3.5 text-palette-mint shrink-0" />
            <span>Scan PC</span>
          </button>
        </div>

        {/* Search Input with Shortcut and Clear Button */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-palette-moss absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-palette-navy border border-palette-slate rounded-lg pl-8 pr-8 py-1.5 text-xs text-palette-white placeholder-palette-moss focus:outline-none focus:border-palette-mint transition"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-1 text-palette-moss hover:text-palette-white rounded transition text-xs"
              title="Clear search"
            >
              ✕
            </button>
          ) : (
            <span className="absolute right-2.5 text-[10px] font-mono text-palette-moss pointer-events-none px-1 rounded bg-palette-charcoal/80 border border-palette-slate/60">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* Project List Section Header */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-palette-moss">
        <span>Tracked Projects</span>
        <span className="font-mono bg-palette-charcoal px-1.5 py-0.2 rounded text-palette-stone border border-palette-slate/40">
          {projects.length}
        </span>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredProjects.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Folder className="w-8 h-8 text-palette-olive mx-auto mb-2 opacity-60" />
            <p className="text-xs font-medium text-palette-stone">
              {projects.length === 0 ? 'No projects registered' : 'No matching projects'}
            </p>
            <p className="text-[11px] text-palette-moss mt-1 max-w-[200px] mx-auto">
              {projects.length === 0
                ? 'Click "Add Folder" or "Scan PC" to start passive encrypted backup.'
                : `No projects found matching "${searchQuery}".`}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isSelected = project.id === selectedProjectId
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`group relative flex items-center justify-between pl-3.5 pr-2 py-2.5 rounded-lg text-xs cursor-pointer transition select-none ${
                  isSelected
                    ? 'bg-palette-charcoal text-palette-white font-medium shadow-sm border border-palette-slate before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-palette-mint before:rounded-r'
                    : 'text-palette-stone hover:bg-palette-surface/80 hover:text-palette-white border border-transparent'
                }`}
              >
                <div className="flex items-start space-x-2.5 truncate flex-1 min-w-0 pr-2">
                  <Folder
                    className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                      isSelected ? 'text-palette-mint' : 'text-palette-moss group-hover:text-palette-teal'
                    }`}
                  />
                  <div className="truncate flex-1 min-w-0">
                    <div className="truncate text-palette-white font-medium leading-snug">
                      {project.name}
                    </div>
                    <div className="truncate text-[10px] text-palette-moss font-mono mt-0.5 select-text">
                      {project.path}
                    </div>
                  </div>
                </div>

                {/* Badges and indicators */}
                <div className="flex items-center space-x-1 shrink-0">
                  {project.hasMissingFiles && (
                    <span
                      title="One or more .env files are missing on disk!"
                      className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                  {project.reuseWarningCount ? (
                    <span
                      title={`${project.reuseWarningCount} secret(s) shared with other projects`}
                      className="p-1 rounded bg-palette-charcoal border border-palette-mint/40 text-palette-mint"
                    >
                      <Lock className="w-3 h-3" />
                    </span>
                  ) : null}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-palette-navy text-palette-stone rounded border border-palette-slate/60">
                    {project.fileCount ?? 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteProject(project.id, project.name)
                    }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-palette-moss hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                    title={`Stop tracking ${project.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Vault Status Footer */}
      <div className="p-3 border-t border-palette-olive/40 bg-palette-deep">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-palette-mint opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-palette-mint"></span>
            </span>
            <span className="font-medium text-palette-white">AES-256-GCM Vault</span>
          </div>
          <span className="text-[10px] font-mono text-palette-stone px-1.5 py-0.5 rounded bg-palette-charcoal border border-palette-slate">
            {vaultStatus?.keySource === 'keychain' ? 'OS Keychain' : 'Local'}
          </span>
        </div>
      </div>
    </div>
  )
}
