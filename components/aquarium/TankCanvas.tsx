'use client'

import { useEffect, useRef } from 'react'
import { getSpecies, hourOfDay, lightsAreOn, type Fish, type TankState } from '@/lib/aquarium'

interface Sprite {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  facing: number
  phase: number
}

interface TankCanvasProps {
  state: TankState
}

function layerY(layer: 'top' | 'mid' | 'bottom', h: number): number {
  if (layer === 'top') return h * 0.22
  if (layer === 'bottom') return h * 0.78
  return h * 0.5
}

export function TankCanvas({ state }: TankCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sprites = useRef<Map<string, Sprite>>(new Map())
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const syncSprites = (fish: Fish[], w: number, h: number, dt: number) => {
      const map = sprites.current
      const ids = new Set(fish.map((f) => f.id))
      for (const id of map.keys()) {
        if (!ids.has(id)) map.delete(id)
      }
      for (const f of fish) {
        const spec = getSpecies(f.speciesId)
        if (!spec) continue
        let sp = map.get(f.id)
        if (!sp) {
          sp = {
            id: f.id,
            x: 40 + Math.random() * Math.max(40, w - 80),
            y: layerY(spec.layer, h) + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 10,
            facing: 1,
            phase: Math.random() * Math.PI * 2,
          }
          map.set(f.id, sp)
        }
        const speedMul = 0.35 + (f.health / 100) * 0.8 - f.stress / 250
        const targetY = layerY(spec.layer, h)
        sp.phase += dt * (3 + speedMul * 4)
        sp.vx += (Math.random() - 0.5) * 28 * dt
        sp.vy += (targetY - sp.y) * 0.35 * dt + (Math.random() - 0.5) * 16 * dt
        const maxV = spec.isSnail ? 8 : spec.isShrimp ? 22 : 55 * speedMul
        sp.vx = clamp(sp.vx, -maxV, maxV)
        sp.vy = clamp(sp.vy, -maxV * 0.35, maxV * 0.35)
        if (spec.isSnail) {
          sp.y = h - 28
          sp.vx = 6 + Math.sin(sp.phase) * 4
        }
        sp.x += sp.vx * dt * 8
        sp.y += sp.vy * dt * 8
        if (sp.x < 24) {
          sp.x = 24
          sp.vx = Math.abs(sp.vx)
        }
        if (sp.x > w - 24) {
          sp.x = w - 24
          sp.vx = -Math.abs(sp.vx)
        }
        if (sp.y < 36) {
          sp.y = 36
          sp.vy = Math.abs(sp.vy)
        }
        if (sp.y > h - 36) {
          sp.y = h - 36
          sp.vy = -Math.abs(sp.vy)
        }
        if (Math.abs(sp.vx) > 2) sp.facing = sp.vx >= 0 ? 1 : -1
      }
    }

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = stateRef.current
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const hour = hourOfDay(s.gameHours)
      const on = lightsAreOn(s)
      const night = !on

      syncSprites(s.fish, w, h, dt)

      const algae = s.water.algae / 100
      const cloudy = Math.min(1, s.water.tan * 0.18 + s.water.no2 * 0.1 + s.water.leftoverFood * 0.06)
      const sky = night ? 0.22 : 0.55 + 0.2 * Math.sin(((hour - 8) / 12) * Math.PI)
      const g1 = night ? '#061018' : mix('#0b3a4a', '#164e63', sky)
      const g2 = night ? '#0a1f2a' : mix('#0e7490', '#155e75', 0.6)

      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, g1)
      bg.addColorStop(1, g2)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      drawCaustics(ctx, w, h, now, night)
      drawPlants(ctx, w, h, s.equipment.plants, now)
      drawWood(ctx, w, h)
      drawSubstrate(ctx, w, h)

      for (const fish of s.fish) {
        const sp = sprites.current.get(fish.id)
        if (!sp) continue
        drawCreature(ctx, fish, sp, now)
      }

      if (algae > 0.04) {
        ctx.fillStyle = `rgba(34, 120, 40, ${0.08 + algae * 0.42})`
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = `rgba(40, 90, 30, ${algae * 0.45})`
        ctx.lineWidth = 10
        ctx.strokeRect(6, 6, w - 12, h - 12)
      }
      if (cloudy > 0.05) {
        ctx.fillStyle = `rgba(210, 220, 200, ${cloudy * 0.28})`
        ctx.fillRect(0, 0, w, h)
      }

      drawSurface(ctx, w, now, night)
      drawGlass(ctx, w, h)
      drawBubbles(ctx, w, h, now, s.equipment.filter !== 'none')

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-xl"
      aria-label="鱼缸视图"
    />
  )
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function mix(a: string, b: string, t: number): string {
  return t > 0.5 ? b : a
}

function drawCaustics(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  night: boolean
) {
  if (night) return
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.strokeStyle = '#ecfeff'
  ctx.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    ctx.beginPath()
    const ox = (now / 40 + i * 80) % (w + 100) - 50
    ctx.moveTo(ox, 0)
    ctx.quadraticCurveTo(ox + 40, h * 0.4, ox - 20, h)
    ctx.stroke()
  }
  ctx.restore()
}

function drawPlants(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  plants: number,
  now: number
) {
  const n = Math.round(4 + plants / 12)
  for (let i = 0; i < n; i++) {
    const x = (w * (i + 0.4)) / (n + 1)
    const sway = Math.sin(now / 900 + i) * 10
    ctx.strokeStyle = i % 2 === 0 ? '#166534' : '#15803d'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x, h - 18)
    ctx.quadraticCurveTo(x + sway, h * 0.55, x + sway * 0.4, h * 0.28)
    ctx.stroke()
    ctx.fillStyle = '#22c55e'
    ctx.globalAlpha = 0.55
    for (let leaf = 0; leaf < 5; leaf++) {
      const ly = h - 40 - leaf * (h * 0.1)
      ctx.beginPath()
      ctx.ellipse(x + sway * (leaf / 5), ly, 14, 5, -0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

function drawWood(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#44403c'
  ctx.beginPath()
  ctx.moveTo(w * 0.12, h - 22)
  ctx.quadraticCurveTo(w * 0.22, h * 0.55, w * 0.38, h - 28)
  ctx.quadraticCurveTo(w * 0.28, h * 0.7, w * 0.14, h - 20)
  ctx.fill()
}

function drawSubstrate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, h - 34, 0, h)
  g.addColorStop(0, '#57534e')
  g.addColorStop(1, '#292524')
  ctx.fillStyle = g
  ctx.fillRect(0, h - 28, w, 28)
  ctx.fillStyle = '#78716c'
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 47) % w, h - 10 - (i % 5), 3, 2)
  }
}

function drawSurface(
  ctx: CanvasRenderingContext2D,
  w: number,
  now: number,
  night: boolean
) {
  ctx.fillStyle = night ? 'rgba(8,20,30,0.45)' : 'rgba(186,230,253,0.22)'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  for (let x = 0; x <= w; x += 8) {
    const y = 10 + Math.sin(x / 30 + now / 700) * 3
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, 0)
  ctx.closePath()
  ctx.fill()
}

function drawGlass(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, w - 4, h - 4)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(10, 12, 18, h * 0.5)
}

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  on: boolean
) {
  if (!on) return
  ctx.fillStyle = 'rgba(224,242,254,0.45)'
  for (let i = 0; i < 12; i++) {
    const x = w * 0.86 + Math.sin(i + now / 400) * 6
    const y = (h - ((now / 8 + i * 40) % (h - 20))) 
    ctx.beginPath()
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCreature(ctx: CanvasRenderingContext2D, fish: Fish, sp: Sprite, now: number) {
  const spec = getSpecies(fish.speciesId)
  if (!spec) return
  const sick = fish.health < 45
  const size = Math.max(6, fish.sizeCm * (spec.isShrimp || spec.isSnail ? 2.2 : 1.6))
  ctx.save()
  ctx.translate(sp.x, sp.y)
  ctx.scale(sp.facing, 1)
  ctx.rotate(Math.sin(sp.phase) * 0.12)
  ctx.globalAlpha = sick ? 0.55 : 0.95

  if (spec.isSnail) {
    ctx.fillStyle = spec.color
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = spec.accent
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
    return
  }

  if (spec.isShrimp) {
    ctx.fillStyle = spec.color
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.7, size * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = spec.accent
    ctx.beginPath()
    ctx.moveTo(-size * 0.5, 0)
    ctx.lineTo(-size * 0.9, -size * 0.3)
    ctx.stroke()
    ctx.restore()
    return
  }

  ctx.fillStyle = spec.color
  ctx.beginPath()
  ctx.ellipse(0, 0, size, size * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = spec.accent
  ctx.beginPath()
  ctx.moveTo(-size, 0)
  ctx.lineTo(-size * 1.45, Math.sin(now / 80 + sp.phase) * size * 0.35)
  ctx.lineTo(-size * 0.7, 0)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(size * 0.55, -size * 0.08, Math.max(1.2, size * 0.08), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
