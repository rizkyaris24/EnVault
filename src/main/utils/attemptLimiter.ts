interface Options {
  /** Failures allowed before any delay applies. */
  freeAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  now?: () => number
}

/** Exponential backoff for passphrase guesses (each guess also costs ~0.5s of scrypt on the main thread). */
export function createAttemptLimiter({ freeAttempts = 3, baseDelayMs = 2000, maxDelayMs = 60_000, now = Date.now }: Options = {}) {
  let failures = 0
  let lastFailure = 0

  return {
    /** Milliseconds the caller must still wait before another attempt; 0 means go ahead. */
    waitMs(): number {
      if (failures < freeAttempts) return 0
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (failures - freeAttempts))
      return Math.max(0, lastFailure + delay - now())
    },
    fail(): void {
      failures++
      lastFailure = now()
    },
    succeed(): void {
      failures = 0
    }
  }
}
