import React from 'react'
import { Project } from '@shared/types'
import { Plus, Trash2 } from 'lucide-react'
import { Button, IconButton, Kbd, relativeTime } from '../ui'

const statusLabel = (p: Project): { text: string; className: string } | null =>
  p.hasMissingFiles
    ? { text: 'File missing', className: 'text-danger' }
    : p.reuseWarningCount
      ? { text: 'Shared secrets', className: 'text-warn' }
      : null

interface ProjectsHomeProps {
  projects: Project[]
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onScanComputer: () => void
  onDeleteProject: (id: string, name: string) => void
}

export const ProjectsHome: React.FC<ProjectsHomeProps> = ({
  projects,
  onSelectProject,
  onAddProject,
  onScanComputer,
  onDeleteProject
}) => {
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16 text-center">
        <h1 className="text-display font-semibold text-fg">Your .env files, backed up quietly.</h1>
        <p className="text-title text-fg-muted mt-3 max-w-md">
          Encrypted, versioned, and offline. Add a folder and EnVault watches it for you.
        </p>
        <div className="flex flex-col items-center gap-3 mt-8">
          <Button variant="primary" onClick={onAddProject} rightIcon={<Kbd shortcut="⌘N" />}>
            Add folder
          </Button>
          <button
            type="button"
            onClick={onScanComputer}
            className="text-ui text-fg-muted hover:text-fg underline-offset-4 hover:underline outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-control"
          >
            Scan this computer
          </button>
        </div>
        <p className="mt-16 text-meta text-fg-subtle">
          AES-256-GCM encrypted. OS Keychain protected. 100% offline.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-8 pt-10 pb-16">
        <div className="flex items-end justify-between">
          <h1 className="text-display font-semibold text-fg">Projects</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onScanComputer}
              className="text-ui text-fg-muted hover:text-fg outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-control"
            >
              Scan computer
            </button>
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={onAddProject}>
              Add folder
            </Button>
          </div>
        </div>

        <ul className="mt-8">
          {projects.map((p) => (
            <li
              key={p.id}
              className="group flex items-center gap-2 h-14 px-3 -mx-3 rounded-control hover:bg-raised focus-within:bg-raised transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelectProject(p.id)}
                className="flex-1 min-w-0 h-full flex items-center gap-4 text-left rounded-control outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="text-title font-medium text-fg truncate flex-1 min-w-0">{p.name}</span>
                {statusLabel(p) && (
                  <span className={`text-meta shrink-0 ${statusLabel(p)!.className}`}>{statusLabel(p)!.text}</span>
                )}
                <span className="text-meta text-fg-subtle shrink-0 w-36 text-right">
                  {p.fileCount ?? 0} {p.fileCount === 1 ? 'file' : 'files'}, {relativeTime(p.updatedAt)}
                </span>
              </button>
              <IconButton
                icon={<Trash2 className="w-4 h-4" />}
                label={`Stop tracking ${p.name}`}
                variant="ghost"
                onClick={() => onDeleteProject(p.id, p.name)}
                className="shrink-0 ml-2 text-fg-subtle hover:text-danger hover:bg-line opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
