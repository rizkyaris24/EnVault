import React from 'react'
import { Project } from '@shared/types'
import { Sun, Moon, Monitor, Search } from 'lucide-react'
import { IconButton, Kbd } from '../ui'
import { useTheme, ThemePreference } from '../../theme/useTheme'
import { ProjectSwitcher } from './ProjectSwitcher'

interface TopBarProps {
  projects: Project[]
  selectedProject: Project | undefined
  onGoHome: () => void
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
  onOpenCommandPalette: () => void
}

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system'
}

export const TopBar: React.FC<TopBarProps> = ({
  projects,
  selectedProject,
  onGoHome,
  onSelectProject,
  onAddProject,
  onScanComputer,
  onOpenCommandPalette
}) => {
  const { theme, setTheme } = useTheme()
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

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
          icon={<ThemeIcon className="w-4 h-4" />}
          label={`Theme: ${theme}. Click to change`}
          variant="ghost"
          onClick={() => setTheme(NEXT_THEME[theme])}
          className="text-fg-subtle hover:text-fg"
        />
      </div>
    </header>
  )
}
