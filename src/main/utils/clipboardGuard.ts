export interface ClipboardLike {
  readText(): string
  writeText(text: string): void
}

/** Copies a secret and clears it after `ttlMs`, but only if it is still what is on the clipboard. */
export function createClipboardGuard(clipboard: ClipboardLike, ttlMs = 30_000) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: string | null = null

  const clearIfStillCopied = (): void => {
    timer = null
    if (pending !== null && clipboard.readText() === pending) clipboard.writeText('')
    pending = null
  }

  return {
    copySecret(text: string): void {
      clipboard.writeText(text)
      if (timer) clearTimeout(timer)
      pending = text
      timer = setTimeout(clearIfStillCopied, ttlMs)
      timer.unref?.()
    },
    /** Clears right now (used on quit so a secret never outlives the app). */
    flush(): void {
      if (timer) clearTimeout(timer)
      clearIfStillCopied()
    }
  }
}
