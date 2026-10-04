import React, { useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

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

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-warn shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-danger shrink-0" />,
    info: <Info className="w-4 h-4 text-accent shrink-0" />
  }

  return (
    <div
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className="pointer-events-auto flex items-start space-x-3 p-3 rounded-control border border-line bg-surface text-fg shadow-lg animate-fade-in transition-all select-none"
    >
      {iconMap[toast.type]}
      <div className="flex-1 text-meta min-w-0">
        <div className="font-medium text-fg truncate">{toast.title}</div>
        {toast.message && (
          <div className="text-fg-muted mt-0.5 leading-snug">{toast.message}</div>
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
