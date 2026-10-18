import * as fs from 'fs'
import { atomicWriteFileSync } from './atomicWrite'

export interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
}

export interface DisplayBounds {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_WIDTH = 860
export const MIN_HEIGHT = 560

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function loadWindowState(file: string): WindowState | null {
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!isNum(s.width) || !isNum(s.height) || !isNum(s.x) || !isNum(s.y)) return null
    return { x: s.x, y: s.y, width: s.width, height: s.height }
  } catch {
    return null
  }
}

export function saveWindowState(file: string, state: WindowState): void {
  try {
    atomicWriteFileSync(file, JSON.stringify(state), 'utf8')
  } catch {
    // Losing window position is harmless.
  }
}

/** Keeps the saved size (at least the minimum) and drops the position when it is no longer on any display. */
export function fitToDisplays(state: WindowState, displays: DisplayBounds[]): WindowState {
  const width = Math.max(MIN_WIDTH, state.width)
  const height = Math.max(MIN_HEIGHT, state.height)
  if (!isNum(state.x) || !isNum(state.y)) return { width, height }

  const visible = displays.some(
    (d) => state.x! + 100 < d.x + d.width && state.x! + width - 100 > d.x && state.y! + 40 < d.y + d.height && state.y! > d.y - 40
  )
  return visible ? { x: state.x, y: state.y, width, height } : { width, height }
}
