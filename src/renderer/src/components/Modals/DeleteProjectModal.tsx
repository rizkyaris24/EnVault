import React from 'react'
import { Folder, CheckCircle2 } from 'lucide-react'
import { Dialog, Button } from '../ui'

interface DeleteProjectModalProps {
  isOpen: boolean
  projectName: string
  projectPath?: string
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  projectName,
  projectPath,
  isLoading,
  onClose,
  onConfirm
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Stop tracking "${projectName}"?`}
      description="EnVault will stop monitoring this project and remove it from your vault registry."
      maxWidth="sm"
      footer={
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Stop Tracking
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {projectPath && (
          <div className="p-3 rounded-control bg-raised border border-line-subtle flex items-center space-x-2.5">
            <Folder className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-ui font-medium text-fg truncate">
                {projectName}
              </div>
              <div className="text-meta font-mono text-fg-subtle truncate select-text">
                {projectPath}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2 px-3 py-2.5 rounded-control bg-surface border border-line text-fg-muted">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span className="text-meta">
            Files on your local disk remain safe and untouched.
          </span>
        </div>
      </div>
    </Dialog>
  )
}
