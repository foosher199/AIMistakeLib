import { analyzeStocking, totalBioLoad } from './compatibility'
import {
  deriveWater,
  filterCapacity,
  mixWaterChange,
  stepChemistry,
  unionizedAmmonia,
} from './chemistry'
import { requireSpecies } from './species'
import type { FilterType, Fish, TankLog, TankState } from './types'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function pushLog(state: TankState, level: TankLog['level'], message: string): TankState {
  const log: TankLog = {
    id: uid(),
    gameHours: state.gameHours,
    level,
    message,
  }
  return { ...state, logs: [log, ...state.logs].slice(0, 80) }
}

export function hourOfDay(gameHours: number): number {
  return ((gameHours % 24) + 24) % 24
}

export function lightsAreOn(state: TankState): boolean {
  const h = hourOfDay(state.gameHours)
  const start = 8
  const end = 8 + state.equipment.lightHours
  if (end <= 24) return h >= start && h < end
  return h >= start || h < end - 24
}

export function formatGameTime(gameHours: number): string {
  const total = Math.floor(gameHours)
  const day = Math.floor(total / 24) + 1
  const hour = total % 24
  return `第 ${day} 天 ${String(hour).padStart(2, '0')}:00`
}

function stepTemperature(state: TankState, dtHours: number): number {
  const room = 22.5
  const { heaterOn, heaterSetC } = state.equipment
  const target = heaterOn ? heaterSetC : room
  const k = heaterOn ? 0.22 : 0.05
  return state.water.tempC + (target - state.water.tempC) * (1 - Math.exp(-k * dtHours))
}

function aggressionDamage(fish: Fish[], dtHours: number): Map<string, number> {
  const dmg = new Map<string, number>()
  const add = (id: string, v: number) => dmg.set(id, (dmg.get(id) ?? 0) + v)

  const bettas = fish.filter((f) => f.speciesId === 'betta')
  if (bettas.length > 1) {
    for (const b of bettas) add(b.id, 6 * dtHours)
  }

  const nippers = fish.filter((f) => requireSpecies(f.speciesId).finNipper)
  if (nippers.length > 0) {
    for (const f of fish) {
      if (requireSpecies(f.speciesId).longFins) add(f.id, 2.2 * dtHours)
    }
    const nipperCount = nippers.length
    if (nipperCount < 6) {
      for (const f of fish) {
        if (!requireSpecies(f.speciesId).finNipper) add(f.id, 0.8 * dtHours)
      }
    }
  }

  const predators = fish.filter((f) => requireSpecies(f.speciesId).eatsSmallFish)
  if (predators.length > 0) {
    for (const f of fish) {
      const s = requireSpecies(f.speciesId)
      if (s.adultSizeCm <= 3.5 && !s.isSnail) add(f.id, 4.5 * dtHours)
    }
  }

  const shrimpEaters = fish.filter((f) => requireSpecies(f.speciesId).eatsShrimp)
  if (shrimpEaters.length > 0) {
    for (const f of fish) {
      if (requireSpecies(f.speciesId).isShrimp) add(f.id, 3.2 * dtHours)
    }
  }

  const hasCichlid = fish.some((f) => f.speciesId === 'yellow-lab')
  const hasSoftFish = fish.some((f) => requireSpecies(f.speciesId).profile === 'soft-acid')
  if (hasCichlid && hasSoftFish) {
    for (const f of fish) {
      if (requireSpecies(f.speciesId).profile === 'soft-acid') add(f.id, 1.4 * dtHours)
    }
  }

  return dmg
}

function stepFish(state: TankState, dtHours: number): { fish: Fish[]; logs: string[] } {
  const nh3 = unionizedAmmonia(state.water.tan, state.water.pH, state.water.tempC)
  const { no2, no3, pH, gh, tempC } = state.water
  const counts = new Map<string, number>()
  for (const f of state.fish) {
    counts.set(f.speciesId, (counts.get(f.speciesId) ?? 0) + 1)
  }
  const aggro = aggressionDamage(state.fish, dtHours)
  const logs: string[] = []
  const next: Fish[] = []

  for (const f of state.fish) {
    const s = requireSpecies(f.speciesId)
    let stress = 0

    if (nh3 > 0.05) stress += 45
    else if (nh3 > 0.02) stress += 22
    else if (nh3 > 0.005) stress += 6

    if (no2 > 1) stress += 40
    else if (no2 > 0.25) stress += 18
    else if (no2 > 0.1) stress += 6

    if (no3 > 80) stress += 12
    else if (no3 > 40) stress += 5

    if (tempC < s.tempMin - 1) stress += (s.tempMin - tempC) * 6
    if (tempC > s.tempMax + 1) stress += (tempC - s.tempMax) * 7
    if (pH < s.pHMin) stress += (s.pHMin - pH) * 10
    if (pH > s.pHMax) stress += (pH - s.pHMax) * 10
    if (gh < s.ghMin) stress += (s.ghMin - gh) * 1.4
    if (gh > s.ghMax) stress += (gh - s.ghMax) * 0.8

    const group = counts.get(f.speciesId) ?? 1
    if (group < s.minGroup) stress += (s.minGroup - group) * 1.8
    if (s.sensitive) stress *= 1.35

    stress += aggro.get(f.id) ?? 0
    stress = clamp(stress, 0, 100)

    const satiation = clamp(f.satiation - 4.2 * dtHours, 0, 100)
    if (satiation < 15) stress += 8

    const recover = stress < 12 ? 3.5 * dtHours : 0
    const damage = (stress / 100) * 7.5 * dtHours * (s.sensitive ? 1.4 : 1)
    const health = clamp(f.health - damage + recover, 0, 100)
    const sizeCm = Math.min(s.adultSizeCm, f.sizeCm + (s.adultSizeCm - f.sizeCm) * 0.0009 * dtHours)

    if (health <= 0.2) {
      logs.push(`${s.nameZh} 死亡（长期应激 / 水质）`)
      continue
    }

    next.push({
      ...f,
      health,
      stress,
      satiation,
      sizeCm,
      ageHours: f.ageHours + dtHours,
    })
  }

  return { fish: next, logs }
}

export function tickTank(state: TankState, realSeconds: number): TankState {
  const totalHours = realSeconds * state.speed
  if (totalHours <= 0) return state
  const chunks = Math.min(10, Math.max(1, Math.ceil(totalHours / 3)))
  const dtHours = totalHours / chunks
  let current = state
  for (let i = 0; i < chunks; i++) {
    current = tickOnce(current, dtHours)
  }
  return current
}

function tickOnce(state: TankState, dtHours: number): TankState {
  const bioLoad = totalBioLoad(state.fish)
  const lightsOn = lightsAreOn(state)
  const { water, bacteria } = stepChemistry(
    { ...state.water, tempC: stepTemperature(state, dtHours) },
    state.bacteria,
    state.equipment,
    state.volumeL,
    bioLoad,
    lightsOn,
    dtHours
  )

  let next: TankState = {
    ...state,
    gameHours: state.gameHours + dtHours,
    water,
    bacteria,
  }

  const fishStep = stepFish(next, dtHours)
  next = { ...next, fish: fishStep.fish }
  for (const msg of fishStep.logs) {
    next = pushLog(next, 'danger', msg)
  }

  const derived = deriveWater(next, bioLoad)
  if (Math.floor(next.gameHours / 12) !== Math.floor(state.gameHours / 12)) {
    if (derived.nh3 > 0.05) {
      next = pushLog(next, 'danger', `非离子氨 NH₃ ${derived.nh3.toFixed(3)} mg/L，已达急性毒性。`)
    } else if (next.water.no2 > 0.5) {
      next = pushLog(next, 'warn', `亚硝酸盐 ${next.water.no2.toFixed(2)} mg/L，循环尚未过亚盐峰。`)
    } else if (next.water.algae > 55) {
      next = pushLog(next, 'warn', '藻类爆发：光照 × 硝酸盐/磷酸盐过高，考虑缩短光照或加水草。')
    } else if (next.water.kh < 1) {
      next = pushLog(next, 'danger', 'KH 接近 0，缓冲崩溃，pH 可能骤降。')
    }
  }

  return next
}

export function feed(state: TankState): TankState {
  if (state.fish.length === 0) {
    return pushLog(state, 'info', '空缸投喂：残饵会腐烂成氨，这正是鱼less循环的氨源。')
  }
  const hungry = state.fish.reduce((s, f) => s + (100 - f.satiation) / 100, 0)
  const leftover = Math.max(0, hungry * 0.15 + state.fish.length * 0.08)
  const fish = state.fish.map((f) => ({ ...f, satiation: clamp(f.satiation + 55, 0, 100) }))
  let next: TankState = {
    ...state,
    fish,
    water: {
      ...state.water,
      leftoverFood: state.water.leftoverFood + leftover,
      po4: state.water.po4 + leftover * 0.04,
    },
  }
  next = pushLog(next, leftover > 1.2 ? 'warn' : 'info', leftover > 1.2 ? '喂多了。残饵会变成氨和磷酸盐。' : '已投喂。')
  return next
}

export function waterChange(state: TankState, percent: number): TankState {
  const fraction = clamp(percent / 100, 0.05, 0.9)
  const water = mixWaterChange(state.water, state.tap, fraction)
  return pushLog(
    { ...state, water },
    'info',
    `换水 ${Math.round(percent)}%。氨/亚盐/硝盐被稀释，KH/GH 向源水靠拢。`
  )
}

export function doseAmmonia(state: TankState, mgL = 2): TankState {
  const water = { ...state.water, tan: state.water.tan + mgL }
  return pushLog({ ...state, water }, 'info', `鱼less 加氨 ${mgL} mg/L TAN，用于培养硝化细菌。`)
}

export function doseBacteria(state: TankState): TankState {
  const cap = filterCapacity(state.volumeL, state.equipment.filter)
  const bacteria = {
    aob: clamp(state.bacteria.aob + cap * 0.12, 0, cap),
    nob: clamp(state.bacteria.nob + cap * 0.08, 0, cap * 0.92),
  }
  return pushLog({ ...state, bacteria }, 'info', '添加瓶装硝化菌。能加速，但不能代替过滤表面积。')
}

export function cleanFilter(state: TankState): TankState {
  const cap = filterCapacity(state.volumeL, state.equipment.filter)
  const bacteria = {
    aob: state.bacteria.aob * 0.45,
    nob: state.bacteria.nob * 0.4,
  }
  const water = { ...state.water, leftoverFood: state.water.leftoverFood * 0.3 }
  return pushLog(
    { ...state, bacteria, water },
    'warn',
    `清洗滤材（自来水/过力）。生物膜从 ${(cap > 0 ? (state.bacteria.aob / cap) * 100 : 0).toFixed(0)}% 被打掉一半以上。`
  )
}

export function addFish(state: TankState, speciesId: string, count: number): TankState {
  const s = requireSpecies(speciesId)
  const created: Fish[] = Array.from({ length: count }, () => ({
    id: uid(),
    speciesId,
    sizeCm: s.adultSizeCm * (0.55 + Math.random() * 0.3),
    health: 92 + Math.random() * 8,
    stress: 18,
    satiation: 60,
    ageHours: 0,
  }))
  let next: TankState = { ...state, fish: [...state.fish, ...created] }
  const issues = analyzeStocking(next).filter((i) => i.severity === 'danger')
  next = pushLog(
    next,
    issues.length ? 'warn' : 'info',
    `放入 ${s.nameZh} × ${count}${issues.length ? `。警告：${issues[0].title}` : ''}`
  )
  return next
}

export function removeFish(state: TankState, id: string): TankState {
  const target = state.fish.find((f) => f.id === id)
  if (!target) return state
  const s = requireSpecies(target.speciesId)
  return pushLog(
    { ...state, fish: state.fish.filter((f) => f.id !== id) },
    'info',
    `移出 ${s.nameZh}`
  )
}

export function setSpeed(state: TankState, speed: number): TankState {
  return { ...state, speed }
}

export function setHeater(state: TankState, on: boolean, setC: number): TankState {
  return { ...state, equipment: { ...state.equipment, heaterOn: on, heaterSetC: setC } }
}

export function setLights(state: TankState, hours: number, intensity: number): TankState {
  return {
    ...state,
    equipment: {
      ...state.equipment,
      lightHours: clamp(hours, 0, 24),
      lightIntensity: clamp(intensity, 0.2, 1.4),
    },
  }
}

export function setFilter(state: TankState, filter: FilterType): TankState {
  return pushLog(
    { ...state, equipment: { ...state.equipment, filter } },
    'info',
    `更换过滤：${filter}。生物容量改变，旧滤膜不会完全迁移。`
  )
}

export function setPlants(state: TankState, plants: number): TankState {
  return { ...state, equipment: { ...state.equipment, plants: clamp(plants, 0, 100) } }
}

export function setTap(state: TankState, tap: Partial<TankState['tap']>): TankState {
  return { ...state, tap: { ...state.tap, ...tap } }
}

export function setVolume(state: TankState, volumeL: number): TankState {
  return { ...state, volumeL }
}
