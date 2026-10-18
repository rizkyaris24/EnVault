import React from 'react'
import { Project } from '@shared/types'
import { Settings, Search } from 'lucide-react'
import { IconButton, Kbd } from '../ui'
import { ProjectSwitcher } from './ProjectSwitcher'

interface TopBarProps {
  projects: Project[]
  selectedProject: Project | undefined
  onGoHome: () => void
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
  onOpenCommandPalette: () => void
  onOpenSettings: () => void
}

export const TopBar: React.FC<TopBarProps> = ({
  projects,
  selectedProject,
  onGoHome,
  onSelectProject,
  onAddProject,
  onScanComputer,
  onOpenCommandPalette,
  onOpenSettings
}) => {
  return (
    <header className="titlebar-drag-region h-12 shrink-0 flex items-center justify-between pl-20 pr-4 select-none">
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          onClick={onGoHome}
          title="All projects"
          className="titlebar-no-drag h-8 px-2.5 rounded-control text-ui font-semibold text-fg tracking-tight hover:bg-raised transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          EnVault
        </button>
        {selectedProject && (
          <>
            <span className="text-fg-subtle">/</span>
            <ProjectSwitcher
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={onSelectProject}
              onAddProject={onAddProject}
              onScanComputer={onScanComputer}
            />
          </>
        )}
      </div>

      <div className="titlebar-no-drag flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Open command palette (Cmd+K)"
          className="flex items-center gap-2 h-8 pl-3 pr-2 rounded-full bg-raised text-meta text-fg-subtle hover:text-fg transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Search className="w-3.5 h-3.5" />
          Search
          <Kbd shortcut="⌘K" />
        </button>
        <IconButton
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          variant="ghost"
          onClick={onOpenSettings}
          className="text-fg-subtle hover:text-fg"
        />
      </div>
    </header>
  )
}
