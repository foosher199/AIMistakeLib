'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addFish,
  analyzeStocking,
  cleanFilter,
  deriveWater,
  doseAmmonia,
  doseBacteria,
  emptyCyclingTank,
  feed,
  loadTank,
  removeFish,
  saveTank,
  setFilter,
  setHeater,
  setLights,
  setPlants,
  setSpeed,
  setTap,
  setVolume,
  tickTank,
  totalBioLoad,
  waterChange,
  type FilterType,
  type TankState,
} from '@/lib/aquarium'

export function useAquarium() {
  const [state, setState] = useState<TankState>(emptyCyclingTank)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadTank()
    // Client-only restore of the last tank from localStorage.
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
      setState(saved)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveTank(state)
  }, [state, hydrated])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      setState((s) => tickTank(s, dt))
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  const patch = useCallback((fn: (s: TankState) => TankState) => {
    setState((s) => fn(s))
  }, [])

  const bioLoad = useMemo(() => totalBioLoad(state.fish), [state.fish])
  const derived = useMemo(() => deriveWater(state, bioLoad), [state, bioLoad])
  const stocking = useMemo(() => analyzeStocking(state), [state])

  return {
    state,
    hydrated,
    derived,
    stocking,
    bioLoad,
    reset: (next: TankState) => setState(next),
    feed: () => patch(feed),
    waterChange: (pct: number) => patch((s) => waterChange(s, pct)),
    doseAmmonia: () => patch((s) => doseAmmonia(s, 2)),
    doseBacteria: () => patch(doseBacteria),
    cleanFilter: () => patch(cleanFilter),
    addFish: (id: string, n: number) => patch((s) => addFish(s, id, n)),
    removeFish: (id: string) => patch((s) => removeFish(s, id)),
    setSpeed: (n: number) => patch((s) => setSpeed(s, n)),
    setHeater: (on: boolean, c: number) => patch((s) => setHeater(s, on, c)),
    setLights: (h: number, i: number) => patch((s) => setLights(s, h, i)),
    setFilter: (f: FilterType) => patch((s) => setFilter(s, f)),
    setPlants: (n: number) => patch((s) => setPlants(s, n)),
    setTap: (tap: Partial<TankState['tap']>) => patch((s) => setTap(s, tap)),
    setVolume: (n: number) => patch((s) => setVolume(s, n)),
  }
}
