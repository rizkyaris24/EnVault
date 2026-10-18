/** Electron 44 made the main-process clipboard Promise-based; older versions are synchronous. Both work. */
export interface ClipboardLike {
  readText(): string | Promise<string>
  writeText(text: string): void | Promise<void>
}

/** Copies a secret and clears it after `ttlMs`, but only if it is still what is on the clipboard. */
export function createClipboardGuard(clipboard: ClipboardLike, ttlMs = 30_000) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: string | null = null

  const clearIfStillCopied = async (): Promise<void> => {
    timer = null
    const secret = pending
    pending = null
    if (secret !== null && (await clipboard.readText()) === secret) await clipboard.writeText('')
  }

  return {
    async copySecret(text: string): Promise<void> {
      await clipboard.writeText(text)
      if (timer) clearTimeout(timer)
      pending = text
      timer = setTimeout(() => void clearIfStillCopied(), ttlMs)
      timer.unref?.()
    },
    hasPending(): boolean {
      return pending !== null
    },
    /** Clears right now (used on quit so a secret never outlives the app). */
    async flush(): Promise<void> {
      if (timer) clearTimeout(timer)
      await clearIfStillCopied()
    }
  }
}
