import type { Bacteria, DerivedWater, Equipment, TankState, Water } from './types'

/** Filter biological capacity relative to a 60 L HOB baseline. */
const FILTER_FACTOR: Record<Equipment['filter'], number> = {
  none: 0.18,
  sponge: 0.7,
  hob: 1.0,
  canister: 1.85,
}

/**
 * Emerson formula approximation: fraction of TAN that is toxic NH3.
 * pKa ≈ 0.09018 + 2729.92 / T(K)
 */
export function unionizedAmmoniaFraction(pH: number, tempC: number): number {
  const tK = tempC + 273.15
  const pKa = 0.09018 + 2729.92 / tK
  return 1 / (Math.pow(10, pKa - pH) + 1)
}

export function unionizedAmmonia(tan: number, pH: number, tempC: number): number {
  return tan * unionizedAmmoniaFraction(pH, tempC)
}

export function filterCapacity(volumeL: number, filter: Equipment['filter']): number {
  return Math.max(0.08, FILTER_FACTOR[filter] * (volumeL / 60))
}

export function deriveWater(state: TankState, bioLoad: number): DerivedWater {
  const { water, bacteria, equipment, volumeL } = state
  const nh3Fraction = unionizedAmmoniaFraction(water.pH, water.tempC)
  const nh3 = water.tan * nh3Fraction
  const cap = filterCapacity(volumeL, equipment.filter)
  const aobRatio = bacteria.aob / cap
  const nobRatio = bacteria.nob / cap

  let cycle: DerivedWater['cycle'] = 'new'
  if (aobRatio > 0.55 && nobRatio > 0.5 && water.tan < 0.25 && water.no2 < 0.25) {
    cycle = 'cycled'
  } else if (
    (aobRatio > 0.12 || water.no2 > 0.4 || water.no3 > 8) &&
    (water.tan > 0.4 || water.no2 > 0.4)
  ) {
    cycle = 'cycling'
  } else if (aobRatio > 0.12 || nobRatio > 0.12 || water.no3 > 5) {
    cycle = aobRatio < 0.2 && (water.tan > 1 || water.no2 > 1) ? 'crashed' : 'cycling'
  }

  if (cycle === 'cycled' && (water.tan > 1.2 || water.no2 > 1.2) && aobRatio < 0.35) {
    cycle = 'crashed'
  }

  const cycleLabel =
    cycle === 'new'
      ? '未建立硝化'
      : cycle === 'cycling'
        ? '硝化循环中'
        : cycle === 'cycled'
          ? '循环已建立'
          : '循环崩溃'

  return {
    nh3,
    nh3Fraction,
    cycle,
    cycleLabel,
    filterCapacity: cap,
    bioLoad,
    crowding: bioLoad / Math.max(0.2, cap),
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function monod(substrate: number, k: number): number {
  return substrate / (k + substrate + 1e-6)
}

/**
 * Advance nitrogen cycle, hardness buffers, algae and leftover food by `dtHours`.
 * Numbers are tuned so a fishless 60 L cycle completes in ~3–5 in-game weeks.
 */
export function stepChemistry(
  water: Water,
  bacteria: Bacteria,
  equipment: Equipment,
  volumeL: number,
  bioLoad: number,
  lightsOn: boolean,
  dtHours: number
): { water: Water; bacteria: Bacteria } {
  const cap = filterCapacity(volumeL, equipment.filter)
  const nextWater = { ...water }
  const nextBacteria = { ...bacteria }

  const leftoverToAmmonia = nextWater.leftoverFood * 0.12 * dtHours
  nextWater.leftoverFood = Math.max(0, nextWater.leftoverFood - leftoverToAmmonia)
  nextWater.po4 += leftoverToAmmonia * 0.08

  const basalAmmonia = (bioLoad * 0.055) / Math.max(10, volumeL)
  const leftoverAmmonia = leftoverToAmmonia * 0.55 / Math.max(10, volumeL)
  nextWater.tan += (basalAmmonia + leftoverAmmonia) * dtHours

  const aobRate = 0.42 * nextBacteria.aob * monod(nextWater.tan, 0.45) * dtHours
  const convertedTan = Math.min(nextWater.tan, aobRate)
  nextWater.tan -= convertedTan
  nextWater.no2 += convertedTan

  const nobRate = 0.36 * nextBacteria.nob * monod(nextWater.no2, 0.4) * dtHours
  const convertedNo2 = Math.min(nextWater.no2, nobRate)
  nextWater.no2 -= convertedNo2
  nextWater.no3 += convertedNo2

  // Nitrification consumes alkalinity (~7.14 mg CaCO3 per mg NH3-N) ≈ 0.4 °dKH
  const khConsumed = convertedTan * 0.38
  nextWater.kh = Math.max(0, nextWater.kh - khConsumed)

  const aobFood = monod(water.tan + leftoverAmmonia, 0.35)
  const nobFood = monod(water.no2 + convertedTan, 0.35)
  const tempFactor = clamp(1 - Math.abs(nextWater.tempC - 26) / 18, 0.25, 1.15)
  const aobGrowth = (0.003 + 0.01 * aobFood) * tempFactor * dtHours
  const nobGrowth = (0.002 + 0.007 * nobFood) * tempFactor * dtHours
  const decay = 0.0015 * dtHours

  nextBacteria.aob = clamp(
    nextBacteria.aob + nextBacteria.aob * aobGrowth - decay * 0.4,
    0.002,
    cap
  )
  nextBacteria.nob = clamp(
    nextBacteria.nob + nextBacteria.nob * nobGrowth - decay,
    0.0015,
    cap * 0.92
  )

  const plants = equipment.plants / 100
  const plantUptake = plants * 0.018 * dtHours
  nextWater.tan = Math.max(0, nextWater.tan - plantUptake * 0.35)
  nextWater.no3 = Math.max(0, nextWater.no3 - plantUptake * 1.8)
  nextWater.po4 = Math.max(0, nextWater.po4 - plantUptake * 0.25)

  const light = lightsOn ? equipment.lightIntensity : 0.05
  const photo = lightsOn ? 1 : 0.15
  const algaeGrow =
    photo *
    light *
    (0.004 + nextWater.no3 * 0.00045 + nextWater.po4 * 0.004) *
    (1.15 - plants * 0.7) *
    dtHours *
    18
  const algaeEat = bioLoadAlgaeGrazing(bioLoad, dtHours) + plants * 0.08 * dtHours
  nextWater.algae = clamp(nextWater.algae + algaeGrow - algaeEat, 0, 100)

  // Slow nitrate loss / plant denitrification
  nextWater.no3 = Math.max(0, nextWater.no3 - 0.004 * dtHours)
  nextWater.po4 = Math.max(0, nextWater.po4 - 0.001 * dtHours)

  // pH: KH buffers; 0 KH allows crash. Target from KH vs open-air CO2.
  const khForPh = Math.max(0.15, nextWater.kh)
  const khTarget = 6.5 + Math.log10(khForPh) * 0.85
  const acidFromNitrification = convertedTan * 0.12
  const targetPh = clamp(khTarget - acidFromNitrification - nextWater.algae * 0.004, 4.8, 8.8)
  if (nextWater.kh < 0.8) {
    nextWater.pH = clamp(nextWater.pH + (5.6 - nextWater.pH) * 0.08 * dtHours, 4.6, 8.5)
  } else {
    nextWater.pH += (targetPh - nextWater.pH) * 0.06 * dtHours
  }
  nextWater.pH = clamp(nextWater.pH, 4.6, 9.0)

  nextWater.tan = clamp(nextWater.tan, 0, 16)
  nextWater.no2 = clamp(nextWater.no2, 0, 16)
  nextWater.no3 = clamp(nextWater.no3, 0, 250)
  nextWater.po4 = clamp(nextWater.po4, 0, 12)
  nextWater.gh = clamp(nextWater.gh, 0, 40)
  nextWater.kh = clamp(nextWater.kh, 0, 30)

  return { water: nextWater, bacteria: nextBacteria }
}

function bioLoadAlgaeGrazing(bioLoad: number, dtHours: number): number {
  return bioLoad * 0.015 * dtHours
}

export function mixWaterChange(
  water: Water,
  tap: TankState['tap'],
  fraction: number
): Water {
  const keep = 1 - fraction
  return {
    tan: water.tan * keep,
    no2: water.no2 * keep,
    no3: water.no3 * keep,
    po4: water.po4 * keep,
    leftoverFood: water.leftoverFood * keep,
    algae: water.algae * (1 - fraction * 0.55),
    pH: water.pH * keep + tap.pH * fraction,
    gh: water.gh * keep + tap.gh * fraction,
    kh: water.kh * keep + tap.kh * fraction,
    tempC: water.tempC * (1 - fraction * 0.5) + tap.tempC * fraction * 0.5,
  }
}
