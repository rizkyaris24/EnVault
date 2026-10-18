import React from 'react'
import { Button } from '../ui'

interface State {
  failed: boolean
}

/** Last line of defence: a render error shows a calm reload screen instead of a blank window. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error): void {
    console.error('Renderer error:', error.message)
  }

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-canvas text-fg font-sans px-8 text-center">
        <h1 className="text-display font-semibold">Something went wrong</h1>
        <p className="text-ui text-fg-muted mt-3 max-w-sm">
          Your backups are safe. Reload to continue.
        </p>
        <Button variant="primary" className="mt-6" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    )
  }
}
