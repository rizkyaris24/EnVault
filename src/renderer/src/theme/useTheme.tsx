import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'envault-theme'

export const THEME_TOKENS = {
  dark: {
    '--canvas': '#0B0B0C',
    '--surface': '#111113',
    '--raised': '#17171A',
    '--line-subtle': '#232327',
    '--line': '#2E2E33',
    '--line-strong': '#3F3F46',
    '--fg': '#ECECEE',
    '--fg-muted': '#A1A1AA',
    '--fg-subtle': '#8B8B94',
    '--accent': '#6E9BFF',
    '--accent-hover': '#5A8AF5',
    '--on-accent': '#0B0B0C',
    '--danger': '#F2686D',
    '--success': '#4CC38A',
    '--warn': '#F5A524',
    'color-scheme': 'dark'
  },
  light: {
    '--canvas': '#FAFAFA',
    '--surface': '#FFFFFF',
    '--raised': '#F4F4F5',
    '--line-subtle': '#E4E4E7',
    '--line': '#D4D4D8',
    '--line-strong': '#A1A1AA',
    '--fg': '#18181B',
    '--fg-muted': '#52525B',
    '--fg-subtle': '#6B6B74',
    '--accent': '#2F5FD0',
    '--accent-hover': '#2550B5',
    '--on-accent': '#FFFFFF',
    '--danger': '#CE2C31',
    '--success': '#18794E',
    '--warn': '#AD5700',
    'color-scheme': 'light'
  }
} as const

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(resolved: ResolvedTheme, preference: ThemePreference): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // 1. Set HTML attribute and classes
  root.setAttribute('data-theme', resolved)
  if (resolved === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }

  // 2. Directly inject CSS variable overrides onto root style for instant and fail-safe application
  const tokens = THEME_TOKENS[resolved]
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value)
  }

  // 3. Synchronize native window chrome in Electron
  if (typeof window !== 'undefined' && window.envaultApi?.setTheme) {
    window.envaultApi.setTheme(preference).catch(() => {
      // IPC unavailable in web test environments
    })
  }
}

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system'
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
    if (saved === 'system' || saved === 'light' || saved === 'dark') {
      return saved
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
    if (saved === 'light' || saved === 'dark') return saved
    return getSystemTheme()
  })

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)

    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)
    applyTheme(resolved, newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  // System media query watcher
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    applyTheme(resolved, theme)

    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent): void => {
      const nextResolved = e.matches ? 'dark' : 'light'
      setResolvedTheme(nextResolved)
      applyTheme(nextResolved, 'system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx) return ctx

  // Fallback for isolated usage outside ThemeProvider
  const theme = (typeof window !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'system'
    : 'system') as ThemePreference
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  return {
    theme,
    resolvedTheme,
    setTheme: (t: ThemePreference) => {
      localStorage.setItem(STORAGE_KEY, t)
      const res = t === 'system' ? getSystemTheme() : t
      applyTheme(res, t)
    },
    toggleTheme: () => {
      const next = resolvedTheme === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      applyTheme(next, next)
    }
  }
}
