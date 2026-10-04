import React from 'react'
import { Project, EnvFile } from '@shared/types'
import {
  ExternalLink,
  Camera,
  Code,
  ListFilter,
  History,
  FileText
} from 'lucide-react'
import { Button, IconButton, SegmentedControl } from '../ui'

interface ProjectHeaderProps {
  project: Project
  files: EnvFile[]
  selectedFileId: string | null
  activeView: 'table' | 'raw' | 'history'
  versionCount: number
  isBackingUp: boolean
  onSelectFile: (fileId: string) => void
  onChangeView: (view: 'table' | 'raw' | 'history') => void
  onRevealFolder: () => void
  onBackupNow: () => void
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  files,
  selectedFileId,
  activeView,
  versionCount,
  isBackingUp,
  onSelectFile,
  onChangeView,
  onRevealFolder,
  onBackupNow
}) => {
  const viewOptions: { value: 'table' | 'raw' | 'history'; label: string; icon: React.ReactNode; badge?: number }[] = [
    { value: 'table', label: 'Secrets', icon: <ListFilter className="w-3.5 h-3.5" /> },
    { value: 'raw', label: 'Raw', icon: <Code className="w-3.5 h-3.5" /> },
    { value: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" />, badge: versionCount }
  ]

  return (
    <header className="border-b border-line bg-surface select-none">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="titlebar-drag-region pt-7 px-6 pb-3 flex items-center justify-between">
        <div className="titlebar-no-drag flex items-center space-x-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-title font-semibold text-fg tracking-tight truncate">
                {project.name}
              </h1>
              <IconButton
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                label="Reveal project folder"
                size="sm"
                variant="ghost"
                onClick={onRevealFolder}
                className="text-fg-subtle hover:text-fg"
              />
            </div>
            <div className="text-meta font-mono text-fg-subtle truncate max-w-xl">
              {project.path}
            </div>
          </div>
        </div>

        {/* Primary Action & Status */}
        <div className="titlebar-no-drag flex items-center space-x-3 shrink-0">
          <div
            className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-control bg-raised border border-line text-meta text-fg-muted"
            title="Continuous background file monitoring active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            <span>Watching</span>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={onBackupNow}
            isLoading={isBackingUp}
            leftIcon={<Camera className="w-3.5 h-3.5" />}
            title="Create an immediate encrypted snapshot"
          >
            {isBackingUp ? 'Snapshotting...' : 'Snapshot'}
          </Button>
        </div>
      </div>

      {/* Navigation Subbar: File Tabs & View Switcher */}
      <div className="px-6 flex items-center justify-between border-t border-line-subtle bg-canvas">
        {/* Horizontal File Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1.5 pr-4 scrollbar-none">
          {files.map((file) => {
            const isSelected = file.id === selectedFileId
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-control text-meta font-mono transition-colors shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-accent ${
                  isSelected
                    ? 'bg-surface text-fg font-medium border border-line shadow-xs'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/60 border border-transparent'
                }`}
              >
                <FileText
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isSelected ? 'text-accent' : 'text-fg-subtle'
                  }`}
                />
                <span>{file.relativePath}</span>
                {!file.existsOnDisk && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-danger shrink-0"
                    title="Missing on disk"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* View Mode Segmented Control */}
        <div className="shrink-0 my-1">
          <SegmentedControl
            options={viewOptions}
            value={activeView}
            onChange={onChangeView}
            size="sm"
          />
        </div>
      </div>
    </header>
  )
}
