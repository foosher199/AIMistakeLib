import type { TankState } from './types'

const KEY = 'aqualab-tank-v1'

export function loadTank(): TankState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as TankState
  } catch {
    return null
  }
}

export function saveTank(state: TankState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota
  }
}

export function clearTank(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
