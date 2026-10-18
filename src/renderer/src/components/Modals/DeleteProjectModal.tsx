import React from 'react'
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
}) => (
  <Dialog
    isOpen={isOpen}
    onClose={onClose}
    title={`Stop tracking "${projectName}"?`}
    maxWidth="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          Stop tracking
        </Button>
      </>
    }
  >
    <p className="text-ui text-fg-muted">
      EnVault stops watching this project and removes it from your vault. Files on your disk stay
      untouched.
    </p>
    {projectPath && (
      <p className="mt-3 text-meta font-mono text-fg-subtle break-all select-text">{projectPath}</p>
    )}
  </Dialog>
)
