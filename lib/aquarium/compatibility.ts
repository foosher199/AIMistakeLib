import { requireSpecies } from './species'
import type { Fish, StockingIssue, TankState, WaterProfile } from './types'

const PROFILE_LABEL: Record<WaterProfile, string> = {
  'soft-acid': '软水偏酸（草缸 / 灯鱼 / 七彩）',
  neutral: '中性宽耐',
  'hard-alkaline': '硬水偏碱（马鲷 / 玛丽 / 螺）',
  cold: '冷水（金鱼）',
}

export function totalBioLoad(fish: Fish[]): number {
  return fish.reduce((sum, f) => {
    const s = requireSpecies(f.speciesId)
    const sizeRatio = Math.max(0.35, f.sizeCm / s.adultSizeCm)
    return sum + s.bioload * sizeRatio * (f.health / 100)
  }, 0)
}

export function analyzeStocking(state: TankState): StockingIssue[] {
  const issues: StockingIssue[] = []
  const { fish, volumeL, water } = state
  if (fish.length === 0) {
    return [
      {
        severity: 'ok',
        title: '空缸',
        detail: '适合鱼less循环：加氨源，等硝化细菌建立后再放鱼。',
      },
    ]
  }

  const counts = new Map<string, number>()
  const profiles = new Map<WaterProfile, number>()
  for (const f of fish) {
    counts.set(f.speciesId, (counts.get(f.speciesId) ?? 0) + 1)
    const s = requireSpecies(f.speciesId)
    profiles.set(s.profile, (profiles.get(s.profile) ?? 0) + 1)
  }

  const distinctProfiles = [...profiles.keys()]
  const hasCold = distinctProfiles.includes('cold')
  const hasSoft = distinctProfiles.includes('soft-acid')
  const hasHard = distinctProfiles.includes('hard-alkaline')
  if (hasCold && distinctProfiles.length > 1) {
    issues.push({
      severity: 'danger',
      title: '金鱼不应与热带鱼混养',
      detail: '金鱼要低温、高溶氧、巨大负荷；热带鱼 24°C+ 会让金鱼缺氧并加速代谢。',
    })
  }
  if (hasSoft && hasHard) {
    issues.push({
      severity: 'danger',
      title: '水质需求冲突',
      detail: `${PROFILE_LABEL['soft-acid']} 与 ${PROFILE_LABEL['hard-alkaline']} 无法在同一套参数里同时健康。`,
    })
  }

  for (const [speciesId, count] of counts) {
    const s = requireSpecies(speciesId)
    if (count < s.minGroup) {
      issues.push({
        severity: s.minGroup >= 6 ? 'warn' : 'ok',
        title: `${s.nameZh} 数量不足`,
        detail: `群游种建议至少 ${s.minGroup} 条，现在 ${count} 条。孤单会长期应激。`,
      })
    }
  }

  const bettas = counts.get('betta') ?? 0
  if (bettas > 1) {
    issues.push({
      severity: 'danger',
      title: '斗鱼不可同缸两条',
      detail: '雄性暹罗斗鱼会互相攻击至死。雌性群养也需要大缸与经验，本模拟按危险处理。',
    })
  }

  const hasNipper = fish.some((f) => requireSpecies(f.speciesId).finNipper)
  const hasLongFins = fish.some((f) => requireSpecies(f.speciesId).longFins)
  if (hasNipper && hasLongFins) {
    issues.push({
      severity: 'danger',
      title: '啄尾风险',
      detail: '虎皮等会追咬斗鱼、孔雀、神仙的长鳍，导致烂鳍和二次感染。',
    })
  }

  const predators = fish.filter((f) => requireSpecies(f.speciesId).eatsSmallFish)
  if (predators.length > 0) {
    for (const prey of fish) {
      const ps = requireSpecies(prey.speciesId)
      if (ps.adultSizeCm <= 3.5 && !ps.isSnail) {
        issues.push({
          severity: 'danger',
          title: `${ps.nameZh} 可能被吞食`,
          detail: '神仙鱼等口裂较大的鱼会把余烬灯、幼虾和小灯鱼当成食物。',
        })
        break
      }
    }
  }

  const shrimp = fish.filter((f) => requireSpecies(f.speciesId).isShrimp)
  const shrimpEaters = fish.filter((f) => requireSpecies(f.speciesId).eatsShrimp)
  if (shrimp.length > 0 && shrimpEaters.length > 0) {
    issues.push({
      severity: 'warn',
      title: '虾类存活率低',
      detail: '斗鱼、虎皮、神仙、马鲷、金鱼都会捕食樱桃虾；大和藻虾稍大但仍有风险。',
    })
  }

  const snails = fish.filter((f) => requireSpecies(f.speciesId).isSnail)
  if (snails.length > 0 && water.kh < 4) {
    issues.push({
      severity: 'warn',
      title: '螺壳会溶',
      detail: 'KH 过低、pH 偏酸时钙质螺壳变薄。斑马螺需要偏硬、偏碱的水。',
    })
  }

  const load = totalBioLoad(fish)
  const loadPerL = load / volumeL
  if (loadPerL > 0.16) {
    issues.push({
      severity: 'danger',
      title: '生物负荷过高',
      detail: `当前负荷 ${load.toFixed(1)} / ${volumeL} L。过滤来不及处理氨，循环容易崩溃。`,
    })
  } else if (loadPerL > 0.11) {
    issues.push({
      severity: 'warn',
      title: '生物负荷偏高',
      detail: '需要更勤换水、更强过滤，不建议再加鱼。',
    })
  }

  const sensitiveInNewTank = fish.some((f) => requireSpecies(f.speciesId).sensitive)
  if (sensitiveInNewTank && (water.tan > 0.25 || water.no2 > 0.25)) {
    issues.push({
      severity: 'danger',
      title: '敏感种在未循环缸中',
      detail: '奥托、蓝羊、七彩、宝莲灯对氨和亚硝酸盐极敏感，应等循环完成再引入。',
    })
  }

  if (issues.length === 0) {
    issues.push({
      severity: 'ok',
      title: '混养评估通过',
      detail: '当前组合在水质需求、体型与性情上没有明显硬伤。仍需盯紧氨和亚盐。',
    })
  }

  return issues
}

export function incomingCompatibility(
  state: TankState,
  speciesId: string
): StockingIssue[] {
  const ghost: Fish = {
    id: 'preview',
    speciesId,
    sizeCm: requireSpecies(speciesId).adultSizeCm * 0.85,
    health: 100,
    stress: 0,
    satiation: 70,
    ageHours: 0,
  }
  return analyzeStocking({ ...state, fish: [...state.fish, ghost] }).filter(
    (i) => i.severity !== 'ok'
  )
}
