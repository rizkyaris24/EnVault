import { vi } from 'vitest'

/** A minimal window.envaultApi for component tests; override pieces per test. */
export function installApi(overrides: Record<string, unknown> = {}): Record<string, any> {
  const api: Record<string, any> = {
    security: {
      unlock: vi.fn().mockResolvedValue({ success: true }),
      setPassphrase: vi.fn().mockResolvedValue({ success: true }),
      getStatus: vi.fn()
    },
    ...overrides
  }
  ;(window as any).envaultApi = api
  return api
}
