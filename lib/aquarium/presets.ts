import type { TankState } from './types'

const DEFAULT_TAP = { pH: 7.4, gh: 8, kh: 6, tempC: 18 }

function base(volumeL: number): Omit<TankState, 'water' | 'bacteria' | 'fish' | 'logs' | 'gameHours'> {
  return {
    volumeL,
    equipment: {
      filter: 'hob',
      heaterOn: true,
      heaterSetC: 25,
      lightHours: 8,
      lightIntensity: 0.85,
      plants: 25,
    },
    tap: { ...DEFAULT_TAP },
    speed: 1,
  }
}

export function emptyCyclingTank(): TankState {
  return {
    ...base(60),
    gameHours: 0,
    water: {
      tan: 0.05,
      no2: 0,
      no3: 0,
      pH: 7.4,
      gh: 8,
      kh: 6,
      tempC: 25,
      po4: 0.05,
      algae: 2,
      leftoverFood: 0,
    },
    bacteria: { aob: 0.012, nob: 0.008 },
    fish: [],
    logs: [
      {
        id: 'start',
        gameHours: 0,
        level: 'info',
        message: '60 L 新缸。过滤已开，硝化细菌几乎为零。先做鱼less循环，再放鱼。',
      },
    ],
  }
}

export function crashedTank(): TankState {
  return {
    ...base(45),
    gameHours: 48,
    volumeL: 45,
    equipment: {
      filter: 'sponge',
      heaterOn: true,
      heaterSetC: 26,
      lightHours: 14,
      lightIntensity: 1.2,
      plants: 5,
    },
    water: {
      tan: 3.2,
      no2: 4.1,
      no3: 12,
      pH: 6.2,
      gh: 5,
      kh: 1.2,
      tempC: 26,
      po4: 1.8,
      algae: 62,
      leftoverFood: 4,
    },
    bacteria: { aob: 0.04, nob: 0.02 },
    fish: [
      {
        id: 'g1',
        speciesId: 'goldfish',
        sizeCm: 12,
        health: 48,
        stress: 80,
        satiation: 90,
        ageHours: 48,
      },
      {
        id: 'n1',
        speciesId: 'neon-tetra',
        sizeCm: 3.2,
        health: 35,
        stress: 92,
        satiation: 40,
        ageHours: 48,
      },
      {
        id: 'n2',
        speciesId: 'neon-tetra',
        sizeCm: 3.0,
        health: 28,
        stress: 95,
        satiation: 30,
        ageHours: 48,
      },
    ],
    logs: [
      {
        id: 'crash',
        gameHours: 48,
        level: 'danger',
        message: '教学场景：小缸 + 金鱼 + 灯鱼 + 过喂 + 强光。氨和亚盐都在致死区。',
      },
    ],
  }
}

export function cycledCommunity(): TankState {
  return {
    ...base(120),
    volumeL: 120,
    gameHours: 24 * 40,
    equipment: {
      filter: 'canister',
      heaterOn: true,
      heaterSetC: 25,
      lightHours: 7,
      lightIntensity: 0.7,
      plants: 55,
    },
    water: {
      tan: 0.04,
      no2: 0.02,
      no3: 18,
      pH: 6.8,
      gh: 6,
      kh: 4.5,
      tempC: 25,
      po4: 0.2,
      algae: 8,
      leftoverFood: 0.1,
    },
    bacteria: { aob: 16, nob: 13.5 },
    fish: [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `neon-${i}`,
        speciesId: 'neon-tetra',
        sizeCm: 3.5 + (i % 3) * 0.2,
        health: 96,
        stress: 8,
        satiation: 55,
        ageHours: 200,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `cory-${i}`,
        speciesId: 'cory-panda',
        sizeCm: 4.2,
        health: 94,
        stress: 10,
        satiation: 50,
        ageHours: 180,
      })),
      {
        id: 'pleco',
        speciesId: 'bristlenose',
        sizeCm: 9,
        health: 97,
        stress: 6,
        satiation: 40,
        ageHours: 400,
      },
    ],
    logs: [
      {
        id: 'ok',
        gameHours: 24 * 40,
        level: 'info',
        message: '已循环的 120 L 草缸社区：灯鱼 + 鼠鱼 + 异型。可用来对比「正确开缸」。',
      },
    ],
  }
}

export const PRESETS = [
  { id: 'empty', name: '新缸循环', blurb: '60 L 空缸，从氨开始学氮循环', create: emptyCyclingTank },
  { id: 'community', name: '已循环社区缸', blurb: '120 L 灯鱼鼠鱼，参数稳定', create: cycledCommunity },
  { id: 'crash', name: '崩溃教学缸', blurb: '金鱼混灯鱼 + 过喂，看毒性', create: crashedTank },
] as const
