import React from 'react'
import { Project } from '@shared/types'

// Shown only when something needs attention; healthy projects stay quiet.
export const StatusDot: React.FC<{ project: Project }> = ({ project }) => {
  if (project.hasMissingFiles) {
    return <span title="Missing .env file on disk" className="w-2 h-2 rounded-full bg-danger shrink-0" />
  }
  if (project.reuseWarningCount) {
    return (
      <span
        title={`${project.reuseWarningCount} secret(s) shared across projects`}
        className="w-2 h-2 rounded-full bg-warn shrink-0"
      />
    )
  }
  return null
}
