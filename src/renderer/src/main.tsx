import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import { ThemeProvider } from './theme/useTheme'
import { App } from './App'
import { ErrorBoundary } from './components/Common/ErrorBoundary'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
