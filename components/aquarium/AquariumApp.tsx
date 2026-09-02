'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  FILTER_LABELS,
  PRESETS,
  SPECIES,
  TANK_SIZES,
  formatGameTime,
  getSpecies,
  incomingCompatibility,
  lightsAreOn,
  type FilterType,
} from '@/lib/aquarium'
import { useAquarium } from '@/hooks/useAquarium'
import { TankCanvas } from '@/components/aquarium/TankCanvas'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Droplets,
  Pause,
  Play,
  Thermometer,
  Trash2,
  Waves,
} from 'lucide-react'

const SPEEDS = [
  { v: 0, label: '暂停' },
  { v: 1, label: '1× 时' },
  { v: 6, label: '6×' },
  { v: 24, label: '1 天/秒' },
  { v: 168, label: '1 周/秒' },
]

export function AquariumApp() {
  const aq = useAquarium()
  const { state, derived, stocking } = aq
  const [picker, setPicker] = useState<string>('neon-tetra')
  const [count, setCount] = useState(6)
  const [help, setHelp] = useState(true)

  const pick = getSpecies(picker)
  const incoming = useMemo(
    () => (pick ? incomingCompatibility(state, picker) : []),
    [state, picker, pick]
  )
  const dayNight = lightsAreOn(state) ? '灯开' : '灯关 / 夜间'
  const dangerCount = stocking.filter((i) => i.severity === 'danger').length

  return (
    <div className="min-h-screen bg-[#07141c] text-slate-100">
      <header className="border-b border-cyan-900/40 bg-[#0a1c27]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80">AquaLab</p>
            <h1 className="text-lg font-semibold text-cyan-50">淡水真水模拟</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-cyan-200">
              {formatGameTime(state.gameHours)}
            </span>
            <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-300">{dayNight}</span>
            <CycleBadge cycle={derived.cycle} label={derived.cycleLabel} />
            {SPEEDS.map((s) => (
              <button
                key={s.v}
                onClick={() => aq.setSpeed(s.v)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs',
                  state.speed === s.v
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                )}
              >
                {s.v === 0 ? <Pause className="inline h-3 w-3" /> : null}
                {s.v === 1 ? <Play className="inline h-3 w-3" /> : null} {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="relative h-[380px] overflow-hidden rounded-2xl border border-cyan-900/50 bg-slate-900 shadow-inner sm:h-[460px]">
            <TankCanvas state={state} />
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-xs text-cyan-100">
              {state.volumeL} L · {FILTER_LABELS[state.equipment.filter]} · 草量 {state.equipment.plants}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <Meter label="TAN 总氨" value={state.water.tan} unit="mg/L" warn={0.25} danger={1} digits={2} />
            <Meter
              label="NH₃ 非离子氨"
              value={derived.nh3}
              unit="mg/L"
              warn={0.02}
              danger={0.05}
              digits={3}
              hint="随 pH、温度升高而剧毒"
            />
            <Meter label="NO₂ 亚盐" value={state.water.no2} unit="mg/L" warn={0.25} danger={1} digits={2} />
            <Meter label="NO₃ 硝盐" value={state.water.no3} unit="mg/L" warn={40} danger={80} digits={1} />
            <Meter label="pH" value={state.water.pH} unit="" warn={0} danger={0} digits={2} plain />
            <Meter label="GH" value={state.water.gh} unit="°d" warn={0} danger={0} digits={1} plain />
            <Meter label="KH" value={state.water.kh} unit="°d" warn={2} danger={0.8} digits={1} invert />
            <Meter
              label="温度"
              value={state.water.tempC}
              unit="°C"
              warn={0}
              danger={0}
              digits={1}
              plain
              icon={<Thermometer className="h-3 w-3" />}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="硝化细菌 / 藻类">
              <Bar
                label="AOB 氨氧化菌"
                value={state.bacteria.aob / Math.max(0.05, derived.filterCapacity)}
                color="bg-amber-400"
              />
              <Bar
                label="NOB 亚硝酸盐氧化菌"
                value={state.bacteria.nob / Math.max(0.05, derived.filterCapacity * 0.92)}
                color="bg-lime-400"
              />
              <Bar label="藻类覆盖" value={state.water.algae / 100} color="bg-emerald-600" />
              <Bar
                label="生物负荷 / 过滤容量"
                value={Math.min(1.5, derived.crowding) / 1.5}
                color={derived.crowding > 1 ? 'bg-red-500' : 'bg-cyan-400'}
              />
              <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
                氨 → 亚硝酸盐 → 硝酸盐。新缸 AOB 先起峰，NOB 滞后，所以会先看到亚盐峰。KH
                被硝化作用消耗；KH 见底则 pH 崩溃。
              </p>
            </Panel>
            <Panel title="操作">
              <div className="flex flex-wrap gap-2">
                <Act onClick={aq.feed}>投喂</Act>
                <Act onClick={() => aq.waterChange(30)}>换水 30%</Act>
                <Act onClick={() => aq.waterChange(50)}>换水 50%</Act>
                <Act onClick={aq.doseAmmonia}>鱼less 加氨 2ppm</Act>
                <Act onClick={aq.doseBacteria}>瓶装硝化菌</Act>
                <Act danger onClick={aq.cleanFilter}>
                  清洗滤材
                </Act>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1 text-slate-400">
                  加热棒 °C
                  <input
                    type="range"
                    min={18}
                    max={32}
                    value={state.equipment.heaterSetC}
                    onChange={(e) => aq.setHeater(true, Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-cyan-200">{state.equipment.heaterSetC}°C</span>
                </label>
                <label className="space-y-1 text-slate-400">
                  光照时长
                  <input
                    type="range"
                    min={0}
                    max={16}
                    value={state.equipment.lightHours}
                    onChange={(e) =>
                      aq.setLights(Number(e.target.value), state.equipment.lightIntensity)
                    }
                    className="w-full"
                  />
                  <span className="text-cyan-200">{state.equipment.lightHours} h/天</span>
                </label>
                <label className="space-y-1 text-slate-400">
                  光照强度
                  <input
                    type="range"
                    min={20}
                    max={140}
                    value={Math.round(state.equipment.lightIntensity * 100)}
                    onChange={(e) =>
                      aq.setLights(state.equipment.lightHours, Number(e.target.value) / 100)
                    }
                    className="w-full"
                  />
                </label>
                <label className="space-y-1 text-slate-400">
                  水草量
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.equipment.plants}
                    onChange={(e) => aq.setPlants(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="space-y-1 text-slate-400">
                  缸体积
                  <select
                    className="w-full rounded bg-slate-800 px-2 py-1 text-slate-100"
                    value={String(state.volumeL)}
                    onChange={(e) => aq.setVolume(Number(e.target.value))}
                  >
                    {TANK_SIZES.map((t) => (
                      <option key={t.key} value={t.liters}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-slate-400">
                  过滤
                  <select
                    className="w-full rounded bg-slate-800 px-2 py-1 text-slate-100"
                    value={state.equipment.filter}
                    onChange={(e) => aq.setFilter(e.target.value as FilterType)}
                  >
                    {(Object.keys(FILTER_LABELS) as FilterType[]).map((k) => (
                      <option key={k} value={k}>
                        {FILTER_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                <Num
                  label="源水 pH"
                  value={state.tap.pH}
                  step={0.1}
                  onChange={(v) => aq.setTap({ pH: v })}
                />
                <Num
                  label="源水 GH"
                  value={state.tap.gh}
                  step={0.5}
                  onChange={(v) => aq.setTap({ gh: v })}
                />
                <Num
                  label="源水 KH"
                  value={state.tap.kh}
                  step={0.5}
                  onChange={(v) => aq.setTap({ kh: v })}
                />
              </div>
            </Panel>
          </div>
        </section>

        <aside className="space-y-4">
          <Panel title="场景">
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => aq.reset(p.create())}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-left hover:border-cyan-600"
                >
                  <div className="text-sm text-cyan-100">{p.name}</div>
                  <div className="text-[11px] text-slate-400">{p.blurb}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="混养评估"
            badge={
              dangerCount > 0 ? (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="h-3 w-3" /> {dangerCount}
                </span>
              ) : null
            }
          >
            <ul className="space-y-2">
              {stocking.map((i, idx) => (
                <li
                  key={`${i.title}-${idx}`}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-xs',
                    i.severity === 'danger' && 'bg-red-950/70 text-red-200',
                    i.severity === 'warn' && 'bg-amber-950/50 text-amber-100',
                    i.severity === 'ok' && 'bg-slate-800/80 text-slate-300'
                  )}
                >
                  <div className="font-medium">{i.title}</div>
                  <div className="mt-0.5 opacity-80">{i.detail}</div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="放入生物">
            <select
              className="w-full rounded bg-slate-800 px-2 py-2 text-sm"
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
            >
              {SPECIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameZh} · {s.nameLatin}
                </option>
              ))}
            </select>
            {pick && (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                {pick.tempMin}–{pick.tempMax}°C · pH {pick.pHMin}–{pick.pHMax} · GH {pick.ghMin}–
                {pick.ghMax} · 成体 {pick.adultSizeCm} cm · 最少 {pick.minGroup} 条
              </p>
            )}
            {incoming.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-300">
                加入后：{incoming.map((i) => i.title).join('；')}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-16 rounded bg-slate-800 px-2 py-1 text-sm"
              />
              <button
                onClick={() => aq.addFish(picker, count)}
                className="flex-1 rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-cyan-400"
              >
                放入
              </button>
            </div>
            <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-xs">
              {state.fish.length === 0 && <li className="text-slate-500">缸内无鱼</li>}
              {state.fish.map((f) => {
                const s = getSpecies(f.speciesId)
                if (!s) return null
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded bg-slate-800/70 px-2 py-1"
                  >
                    <span>
                      <span className="text-slate-200">{s.nameZh}</span>
                      <span className="ml-2 text-slate-500">
                        {f.sizeCm.toFixed(1)}cm 健康{f.health.toFixed(0)} 应激
                        {f.stress.toFixed(0)}
                      </span>
                    </span>
                    <button
                      onClick={() => aq.removeFish(f.id)}
                      className="text-slate-500 hover:text-red-400"
                      aria-label="移出"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="日志">
            <ul className="max-h-48 space-y-1 overflow-auto text-[11px]">
              {state.logs.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    l.level === 'danger' && 'text-red-300',
                    l.level === 'warn' && 'text-amber-300',
                    l.level === 'info' && 'text-slate-400'
                  )}
                >
                  {formatGameTime(l.gameHours)} {l.message}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>

      {help && (
        <div className="mx-auto max-w-[1400px] px-4 pb-8">
          <div className="rounded-2xl border border-cyan-900/40 bg-[#0c2230] p-4 text-sm leading-relaxed text-slate-300">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-medium text-cyan-100">
                <Waves className="h-4 w-4" /> 今天这一版在模拟什么
              </h2>
              <button className="text-xs text-slate-500" onClick={() => setHelp(false)}>
                收起
              </button>
            </div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                <strong className="text-slate-100">氮循环：</strong>
                鱼和残饵产生 TAN → AOB 氧化成 NO₂ → NOB 氧化成 NO₃。新缸请先「加氨」并开到 1 天/秒观察双峰。
              </li>
              <li>
                <strong className="text-slate-100">非离子氨：</strong>
                同样的总氨，pH 越高、越热，NH₃ 占比越高（Emerson 公式）。这是灯鱼暴毙的常见原因。
              </li>
              <li>
                <strong className="text-slate-100">KH / pH：</strong>
                硝化消耗碱度。KH 掉光后 pH 会坠机，所有鱼同时应激。
              </li>
              <li>
                <strong className="text-slate-100">混养相克：</strong>
                金鱼×热带、马鲷×灯鱼、斗鱼互养、虎皮啄尾、神仙吞小鱼、鱼吃虾，都会持续掉血。
              </li>
              <li>
                <strong className="text-slate-100">爆藻：</strong>
                强光 × 硝酸盐/磷酸盐（过喂）− 水草竞争。绿水会糊住视野。
              </li>
            </ol>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
              <Droplets className="h-3 w-3" /> 状态保存在浏览器本地。这是教学模拟，不是实验室级水化学引擎。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function CycleBadge({ cycle, label }: { cycle: string; label: string }) {
  const color =
    cycle === 'cycled'
      ? 'bg-emerald-500/20 text-emerald-300'
      : cycle === 'crashed'
        ? 'bg-red-500/20 text-red-300'
        : cycle === 'cycling'
          ? 'bg-amber-500/20 text-amber-200'
          : 'bg-slate-700 text-slate-300'
  return <span className={cn('rounded-md px-2 py-1 text-xs', color)}>{label}</span>
}

function Panel({
  title,
  children,
  badge,
}: {
  title: string
  children: ReactNode
  badge?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0c1a22] p-3">
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-cyan-100">
        {title}
        {badge}
      </div>
      {children}
    </section>
  )
}

function Act({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1.5 text-xs',
        danger
          ? 'bg-red-900/70 text-red-100 hover:bg-red-800'
          : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
      )}
    >
      {children}
    </button>
  )
}

function Meter({
  label,
  value,
  unit,
  warn,
  danger,
  digits,
  plain,
  invert,
  hint,
  icon,
}: {
  label: string
  value: number
  unit: string
  warn: number
  danger: number
  digits: number
  plain?: boolean
  invert?: boolean
  hint?: string
  icon?: ReactNode
}) {
  let tone = 'text-cyan-100'
  if (!plain) {
    if (invert) {
      if (value <= danger) tone = 'text-red-400'
      else if (value <= warn) tone = 'text-amber-300'
    } else {
      if (value >= danger) tone = 'text-red-400'
      else if (value >= warn) tone = 'text-amber-300'
    }
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0c1a22] px-2 py-2" title={hint}>
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        {icon}
        {label}
      </div>
      <div className={cn('font-mono text-lg', tone)}>
        {value.toFixed(digits)}
        <span className="ml-0.5 text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  )
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-800">
        <div className={cn('h-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Num({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-slate-100"
      />
    </label>
  )
}
