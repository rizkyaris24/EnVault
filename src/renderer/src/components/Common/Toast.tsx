import React, { useEffect } from 'react'
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
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
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 4500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-palette-mint shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-palette-teal shrink-0" />
  }

  const borderMap = {
    success: 'border-palette-mint/60 bg-palette-charcoal/95 text-palette-white',
    warning: 'border-amber-400/60 bg-palette-charcoal/95 text-palette-white',
    error: 'border-rose-400/60 bg-palette-charcoal/95 text-palette-white',
    info: 'border-palette-teal/60 bg-palette-charcoal/95 text-palette-white'
  }

  return (
    <div
      className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
        borderMap[toast.type]
      }`}
    >
      {iconMap[toast.type]}
      <div className="flex-1 text-xs">
        <div className="font-semibold text-palette-linen">{toast.title}</div>
        {toast.message && <div className="text-palette-stone mt-0.5">{toast.message}</div>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-palette-moss hover:text-palette-linen p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
