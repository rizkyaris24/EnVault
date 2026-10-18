import React from 'react'
import { Project, EnvFile } from '@shared/types'
import { ExternalLink, Camera } from 'lucide-react'
import { Button, IconButton, relativeTime } from '../ui'

type View = 'table' | 'raw' | 'history'

interface ProjectHeaderProps {
  project: Project
  files: EnvFile[]
  selectedFileId: string | null
  activeView: View
  versionCount: number
  isBackingUp: boolean
  onSelectFile: (fileId: string) => void
  onChangeView: (view: View) => void
  onRevealFolder: () => void
  onBackupNow: () => void
}

const VIEWS: { value: View; label: string }[] = [
  { value: 'table', label: 'Secrets' },
  { value: 'raw', label: 'Raw' },
  { value: 'history', label: 'History' }
]

const tabClass = (active: boolean): string =>
  `h-10 -mb-px border-b-2 text-ui transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent shrink-0 ${
    active ? 'text-fg font-medium border-fg' : 'text-fg-muted hover:text-fg border-transparent'
  }`

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  files,
  selectedFileId,
  activeView,
  isBackingUp,
  onSelectFile,
  onChangeView,
  onRevealFolder,
  onBackupNow
}) => (
  <header className="max-w-[720px] w-full mx-auto px-8 pt-6 select-none">
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-display font-semibold text-fg truncate">{project.name}</h1>
        <div className="flex items-center gap-1 mt-1 min-w-0">
          <span className="text-meta font-mono text-fg-subtle truncate select-text">{project.path}</span>
          <IconButton
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            label="Reveal project folder"
            size="sm"
            variant="ghost"
            onClick={onRevealFolder}
            className="text-fg-subtle hover:text-fg shrink-0"
          />
        </div>
        <p className="text-meta text-fg-subtle mt-1">Watching. Updated {relativeTime(project.updatedAt)}.</p>
      </div>
      <Button
        variant="primary"
        onClick={onBackupNow}
        isLoading={isBackingUp}
        leftIcon={<Camera className="w-4 h-4" />}
        title="Create an immediate encrypted snapshot"
        className="shrink-0"
      >
        {isBackingUp ? 'Snapshotting...' : 'Snapshot'}
      </Button>
    </div>

    <div className="mt-6 flex items-center justify-between gap-6 border-b border-line-subtle">
      <div role="tablist" aria-label="Env files" className="flex items-center gap-5 overflow-x-auto scrollbar-hidden">
        {files.map((file) => {
          const active = file.id === selectedFileId
          return (
            <button
              key={file.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectFile(file.id)}
              className={`${tabClass(active)} font-mono flex items-center gap-1.5`}
            >
              {file.relativePath}
              {!file.existsOnDisk && (
                <span className="w-1.5 h-1.5 rounded-full bg-danger" title="Missing on disk" />
              )}
            </button>
          )
        })}
      </div>
      <div role="tablist" aria-label="View" className="flex items-center gap-5 shrink-0">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={activeView === v.value}
            onClick={() => onChangeView(v.value)}
            className={tabClass(activeView === v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  </header>
)
