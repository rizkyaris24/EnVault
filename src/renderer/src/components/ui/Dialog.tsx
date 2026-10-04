import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from './cn'
import { IconButton } from './IconButton'

export interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  className
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    // Auto-focus the dialog container
    dialogRef.current?.focus()

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 transition-opacity duration-150 animate-fade-in"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        tabIndex={-1}
        className={cn(
          'w-full bg-surface border border-line rounded-dialog shadow-xl outline-none overflow-hidden flex flex-col max-h-[90vh]',
          widthStyles[maxWidth],
          className
        )}
      >
        {/* Dialog Header */}
        <div className="flex items-start justify-between p-5 border-b border-line-subtle select-none">
          <div className="space-y-1">
            <h2 id="dialog-title" className="text-title font-semibold text-fg tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-meta text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton
            icon={<X className="w-4 h-4" />}
            label="Close dialog"
            onClick={onClose}
            size="sm"
            className="text-fg-subtle hover:text-fg -mr-1 -mt-1"
          />
        </div>

        {/* Dialog Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Dialog Footer */}
        {footer && (
          <div className="p-4 border-t border-line-subtle bg-raised/40 flex items-center justify-end gap-3 select-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
