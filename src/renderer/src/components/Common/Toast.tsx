import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message?: string
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-40 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = (): void => {
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id)
    }, 4000)
  }

  const clearTimer = (): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  useEffect(() => {
    startTimer()
    return () => clearTimer()
  }, [toast.id, onDismiss])

  const dotColor = {
    success: 'bg-success',
    warning: 'bg-warn',
    error: 'bg-danger',
    info: 'bg-fg-subtle'
  }

  return (
    <div
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-dialog bg-canvas text-fg shadow-float animate-fade-in select-none"
    >
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor[toast.type]}`} />
      <div className="flex-1 text-ui min-w-0">
        <div className="font-medium text-fg truncate">{toast.title}</div>
        {toast.message && (
          <div className="text-meta text-fg-muted mt-0.5 leading-snug">{toast.message}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-fg-subtle hover:text-fg p-0.5 rounded-chip transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
