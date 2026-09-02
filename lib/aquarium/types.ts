export type Temperament = 'peaceful' | 'semi-aggressive' | 'aggressive'
export type WaterProfile = 'soft-acid' | 'neutral' | 'hard-alkaline' | 'cold'
export type WaterLayer = 'top' | 'mid' | 'bottom'
export type FilterType = 'none' | 'sponge' | 'hob' | 'canister'
export type TankSizeKey = '20' | '45' | '60' | '90' | '120' | '200'

export interface Species {
  id: string
  nameZh: string
  nameLatin: string
  adultSizeCm: number
  bioload: number
  tempMin: number
  tempMax: number
  pHMin: number
  pHMax: number
  ghMin: number
  ghMax: number
  temperament: Temperament
  profile: WaterProfile
  layer: WaterLayer
  minGroup: number
  finNipper: boolean
  longFins: boolean
  eatsSmallFish: boolean
  eatsShrimp: boolean
  isShrimp: boolean
  isSnail: boolean
  algaeEater: boolean
  sensitive: boolean
  color: string
  accent: string
}

export interface Fish {
  id: string
  speciesId: string
  sizeCm: number
  health: number
  stress: number
  satiation: number
  ageHours: number
}

export interface Water {
  /** Total ammonia nitrogen, mg/L as N */
  tan: number
  /** Nitrite, mg/L as N */
  no2: number
  /** Nitrate, mg/L as N */
  no3: number
  pH: number
  /** General hardness, °dGH */
  gh: number
  /** Carbonate hardness, °dKH */
  kh: number
  tempC: number
  /** Phosphate, mg/L — drives algae with nitrate + light */
  po4: number
  /** 0–100 green water / glass algae */
  algae: number
  /** Uneaten food mass, arbitrary units */
  leftoverFood: number
}

export interface Bacteria {
  /** Ammonia-oxidizing bacteria biomass 0–capacity */
  aob: number
  /** Nitrite-oxidizing bacteria biomass 0–capacity */
  nob: number
}

export interface Equipment {
  filter: FilterType
  heaterOn: boolean
  heaterSetC: number
  /** Photoperiod length in hours, starting at 08:00 */
  lightHours: number
  lightIntensity: number
  /** Plant biomass 0–100, competes with algae for nutrients */
  plants: number
}

export interface TapWater {
  pH: number
  gh: number
  kh: number
  tempC: number
}

export interface TankLog {
  id: string
  gameHours: number
  level: 'info' | 'warn' | 'danger'
  message: string
}

export interface TankState {
  volumeL: number
  gameHours: number
  water: Water
  bacteria: Bacteria
  equipment: Equipment
  tap: TapWater
  fish: Fish[]
  logs: TankLog[]
  speed: number
}

export type StockingSeverity = 'ok' | 'warn' | 'danger'

export interface StockingIssue {
  severity: StockingSeverity
  title: string
  detail: string
}

export interface DerivedWater {
  /** Unionized ammonia NH3, mg/L as N */
  nh3: number
  nh3Fraction: number
  cycle: 'new' | 'cycling' | 'cycled' | 'crashed'
  cycleLabel: string
  filterCapacity: number
  bioLoad: number
  crowding: number
}

export const TANK_SIZES: { key: TankSizeKey; liters: number; label: string }[] = [
  { key: '20', liters: 20, label: '20 L 桌面缸' },
  { key: '45', liters: 45, label: '45 L 小缸' },
  { key: '60', liters: 60, label: '60 L 标准缸' },
  { key: '90', liters: 90, label: '90 L 长缸' },
  { key: '120', liters: 120, label: '120 L 主缸' },
  { key: '200', liters: 200, label: '200 L 大缸' },
]

export const FILTER_LABELS: Record<FilterType, string> = {
  none: '无过滤（仅水体）',
  sponge: '海绵滤（气动）',
  hob: '上部过滤 HOB',
  canister: '桶滤',
}
