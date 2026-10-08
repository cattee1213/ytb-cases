import { TAU, hash, mixHex, mulberry32, pick, smoothstep, valueNoise } from './math'

export interface View {
  width: number
  height: number
  time: number
  local: number
  reduced: boolean
}

export interface Room {
  id: string
  roman: string
  title: string
  line: string
  paint: (ctx: CanvasRenderingContext2D, view: View) => void
}

function unitOf(view: View) {
  return Math.min(view.width, view.height)
}

function paintGilt(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, time, reduced } = view
  const unit = unitOf(view)
  const cx = width * 0.5
  const cy = height * 0.36
  const sunR = unit * (0.22 + Math.sin(time * 0.32) * 0.006)

  const ground = ctx.createRadialGradient(cx, cy, unit * 0.02, cx, height * 0.45, Math.max(width, height) * 0.78)
  ground.addColorStop(0, '#7a5230')
  ground.addColorStop(0.18, '#3a2216')
  ground.addColorStop(0.48, '#160d10')
  ground.addColorStop(1, '#070506')
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, width, height)

  const sun = ctx.createRadialGradient(cx, cy, sunR * 0.08, cx, cy, sunR)
  sun.addColorStop(0, 'rgba(255, 250, 236, 0.98)')
  sun.addColorStop(0.28, 'rgba(255, 214, 140, 0.82)')
  sun.addColorStop(0.62, 'rgba(210, 140, 62, 0.28)')
  sun.addColorStop(1, 'rgba(210, 140, 62, 0)')
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(cx, cy, sunR, 0, TAU)
  ctx.fill()

  for (let i = 0; i < 4; i++) {
    const p = (time * 0.06 + i / 4) % 1
    ctx.beginPath()
    ctx.arc(cx, cy, sunR * (0.62 + p * 1.35), 0, TAU)
    ctx.strokeStyle = `rgba(243, 214, 160, ${0.2 * (1 - p)})`
    ctx.lineWidth = 1.15
    ctx.stroke()
  }

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(time * 0.035)
  ctx.strokeStyle = 'rgba(243, 214, 160, 0.38)'
  ctx.lineWidth = 1.6
  const ticks = 42
  for (let i = 0; i < ticks; i++) {
    const a0 = (i / ticks) * TAU
    ctx.beginPath()
    ctx.arc(0, 0, sunR * 1.12, a0, a0 + (TAU / ticks) * 0.42)
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(212, 168, 90, 0.09)'
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.arc(cx, cy, sunR * (1.45 + i * 0.22), 0, TAU)
    ctx.stroke()
  }

  const hill = new Path2D()
  hill.moveTo(0, height)
  hill.lineTo(0, height * 0.8)
  hill.bezierCurveTo(width * 0.18, height * 0.7, width * 0.32, height * 0.88, width * 0.5, height * 0.76)
  hill.bezierCurveTo(width * 0.7, height * 0.62, width * 0.84, height * 0.82, width, height * 0.72)
  hill.lineTo(width, height)
  hill.closePath()
  ctx.fillStyle = '#100908'
  ctx.fill(hill)
  ctx.save()
  ctx.clip(hill)
  const sheen = ctx.createLinearGradient(0, height * 0.7, 0, height)
  sheen.addColorStop(0, 'rgba(232, 186, 96, 0.16)')
  sheen.addColorStop(0.18, 'rgba(232, 186, 96, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
  ctx.strokeStyle = 'rgba(236, 204, 140, 0.45)'
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.moveTo(0, height * 0.8)
  ctx.bezierCurveTo(width * 0.18, height * 0.7, width * 0.32, height * 0.88, width * 0.5, height * 0.76)
  ctx.bezierCurveTo(width * 0.7, height * 0.62, width * 0.84, height * 0.82, width, height * 0.72)
  ctx.stroke()

  const place = (t: number) => {
    const sway = Math.sin(t * Math.PI * 3.15 + time * 0.28)
    return {
      x: cx + sway * width * 0.16,
      y: height * 0.7 - t * height * 0.46,
      rot: sway * 0.9,
    }
  }

  ctx.beginPath()
  ctx.strokeStyle = 'rgba(226, 184, 96, 0.42)'
  ctx.lineWidth = 1.3
  for (let i = 0; i <= 90; i++) {
    const point = place(i / 90)
    if (i === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  }
  ctx.stroke()

  const ornaments = reduced ? 10 : 17
  for (let i = 0; i < ornaments; i++) {
    const t = i / (ornaments - 1)
    const point = place(t)
    const size = unit * (0.058 - t * 0.026)
    const spin = point.rot + time * 0.04
    if (i % 3 === 0) medallion(ctx, point.x, point.y, size * 0.92, spin, i)
    else leaf(ctx, point.x, point.y, size * 0.62, size * 1.15, spin, i)
  }

  for (let i = 0; i < 4; i++) {
    const p = (time * 0.08 + i / 4) % 1
    ctx.beginPath()
    ctx.ellipse(cx, height * 0.78, width * 0.16 * (0.25 + p), unit * 0.035 * (0.35 + p), 0, 0, TAU)
    ctx.strokeStyle = `rgba(236, 204, 140, ${0.16 * (1 - p)})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const dust = reduced ? 36 : Math.round(Math.min(200, 70 + (width * height) / 32000))
  for (let i = 0; i < dust; i++) {
    const seed = hash(i, 7)
    const speed = 16 + seed * 46
    const x = (hash(i, 4) * width + time * (6 + (i % 5) * 3)) % width
    const y = height - ((hash(i, 8) * height + time * speed) % height)
    const flake = unit * (0.0016 + seed * 0.0045)
    const alpha = 0.18 + 0.7 * (0.5 + 0.5 * Math.sin(time * 1.7 + i))
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(time * 0.4 + i)
    ctx.fillStyle = `rgba(255, 228, 170, ${alpha})`
    ctx.fillRect(-flake, -flake * 1.6, flake * 2, flake * 3.2)
    ctx.restore()
  }
}

function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  index: number,
) {
  const gold = ['#fff1c4', '#f0cb78', '#e2b14e', '#c4893a', '#fff8e4']
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.moveTo(0, -ry)
  ctx.bezierCurveTo(rx, -ry * 0.45, rx, ry * 0.42, 0, ry)
  ctx.bezierCurveTo(-rx, ry * 0.42, -rx, -ry * 0.45, 0, -ry)
  ctx.closePath()
  const tone = ctx.createLinearGradient(0, -ry, 0, ry)
  tone.addColorStop(0, pick(gold, index + 1))
  tone.addColorStop(0.48, pick(gold, index))
  tone.addColorStop(1, '#8a5a22')
  ctx.fillStyle = tone
  ctx.fill()
  ctx.strokeStyle = 'rgba(92, 48, 16, 0.35)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(0, -ry * 0.72)
  ctx.quadraticCurveTo(rx * 0.12, 0, 0, ry * 0.78)
  ctx.stroke()
  ctx.restore()
}

function medallion(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rot: number, index: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot * 0.25)
  const disc = ctx.createRadialGradient(-radius * 0.2, -radius * 0.25, radius * 0.05, 0, 0, radius)
  disc.addColorStop(0, '#fff8e6')
  disc.addColorStop(0.42, index % 2 === 0 ? '#f0c56a' : '#e7b45a')
  disc.addColorStop(1, '#7a4e1c')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.7)'
  ctx.lineWidth = Math.max(1, radius * 0.045)
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.68, 0, TAU)
  ctx.stroke()
  ctx.fillStyle = '#fff6df'
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * radius * 0.82, Math.sin(angle) * radius * 0.82, radius * 0.07, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function paintInk(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, time, local, reduced } = view
  const unit = unitOf(view)

  ctx.fillStyle = '#efe4d0'
  ctx.fillRect(0, 0, width, height)

  const wash = ctx.createRadialGradient(width * 0.48, height * 0.46, unit * 0.05, width * 0.5, height * 0.5, Math.max(width, height) * 0.72)
  wash.addColorStop(0, 'rgba(255, 252, 246, 0.55)')
  wash.addColorStop(0.7, 'rgba(214, 196, 166, 0.08)')
  wash.addColorStop(1, 'rgba(150, 122, 90, 0.28)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#fffaf2' : '#6d5b48'
    ctx.fillRect(hash(i, 3) * width, hash(i, 4) * height, 8 + hash(i, 5) * 46, 0.7)
  }
  ctx.restore()

  inkWash(ctx, width * 0.28, height * 0.3, unit * 0.18, time, 1.2)
  inkWash(ctx, width * 0.5, height * 0.38, unit * 0.26, time * 0.7, 2.6)
  inkWash(ctx, width * 0.76, height * 0.58, unit * 0.12, time * 0.5, 4.1)

  const drawn = reduced ? 1 : smoothstep(0.15, 3.1, local)
  const tip = enso(ctx, width * 0.48, height * 0.38, unit * 0.22, drawn, unit)
  if (tip && drawn > 0.12) {
    for (let i = 0; i < 10; i++) {
      const ang = hash(i, 12) * TAU
      const dist = hash(i, 13) * unit * 0.05
      ctx.fillStyle = `rgba(22, 18, 20, ${0.25 + hash(i, 15) * 0.6})`
      ctx.beginPath()
      ctx.arc(tip.x + Math.cos(ang) * dist, tip.y + Math.sin(ang) * dist, 0.7 + hash(i, 14) * unit * 0.004, 0, TAU)
      ctx.fill()
    }
  }

  const sealAlpha = reduced ? 0.92 : smoothstep(3.2, 4.4, local)
  if (sealAlpha > 0.01) {
    ctx.save()
    ctx.globalAlpha = sealAlpha
    seal(ctx, width * 0.78, height * 0.6, unit * 0.062)
    ctx.restore()
  }
}

function inkWash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  seed: number,
) {
  const blooms = 6
  for (let i = 0; i < blooms; i++) {
    const n = valueNoise(seed, i * 0.35 + time * 0.04)
    const reach = radius * (0.35 + (i / blooms) * 0.7) * (0.92 + n * 0.12)
    const ox = Math.cos(seed + i * 1.7) * radius * 0.12
    const oy = Math.sin(seed * 1.3 + i) * radius * 0.08
    const tone = ctx.createRadialGradient(x + ox, y + oy, reach * 0.08, x + ox, y + oy, reach)
    const alpha = 0.05 + (1 - i / blooms) * 0.16
    tone.addColorStop(0, `rgba(28, 26, 32, ${alpha + 0.12})`)
    tone.addColorStop(0.45, `rgba(42, 46, 58, ${alpha * 0.55})`)
    tone.addColorStop(1, 'rgba(42, 46, 58, 0)')
    ctx.fillStyle = tone
    ctx.beginPath()
    ctx.ellipse(x + ox, y + oy, reach, reach * (0.78 + n * 0.12), i * 0.4, 0, TAU)
    ctx.fill()
  }
}

interface BrushPoint {
  x: number
  y: number
  pressure: number
}

function enso(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  drawn: number,
  unit: number,
): BrushPoint | null {
  const steps = 140
  const visible = Math.max(2, Math.floor(steps * drawn))
  const start = -0.7
  const end = Math.PI * 1.55
  const points: BrushPoint[] = []
  for (let i = 0; i < visible; i++) {
    const u = i / (steps - 1)
    const angle = start + (end - start) * u
    const n = valueNoise(u * 2.4, 1.7)
    const rad = radius * (0.98 + (n - 0.5) * 0.035)
    points.push({
      x: cx + Math.cos(angle) * rad,
      y: cy + Math.sin(angle) * rad * 0.9,
      pressure: 0.28 + 0.85 * Math.sin(Math.min(1, u / 0.97) * Math.PI),
    })
  }
  inkRibbon(ctx, points, unit * 0.034, 'rgba(36, 34, 40, 0.16)')
  inkRibbon(ctx, points, unit * 0.016, 'rgba(16, 14, 18, 0.94)')
  return points[points.length - 1] ?? null
}

function inkRibbon(ctx: CanvasRenderingContext2D, points: BrushPoint[], width: number, color: string) {
  if (points.length < 2) return
  const left: { x: number; y: number }[] = []
  const right: { x: number; y: number }[] = []
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    if (!point || !prev || !next) continue
    let dx = next.x - prev.x
    let dy = next.y - prev.y
    const span = Math.hypot(dx, dy) || 1
    dx /= span
    dy /= span
    const half = width * point.pressure
    left.push({ x: point.x + -dy * half, y: point.y + dx * half })
    right.push({ x: point.x - -dy * half, y: point.y - dx * half })
  }
  const first = left[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (const point of left) ctx.lineTo(point.x, point.y)
  for (let i = right.length - 1; i >= 0; i--) {
    const point = right[i]
    if (point) ctx.lineTo(point.x, point.y)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function seal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.12)
  ctx.fillStyle = '#c44536'
  ctx.beginPath()
  ctx.rect(-size / 2, -size / 2, size, size)
  ctx.moveTo(size * 0.2, 0)
  ctx.arc(0, 0, size * 0.2, 0, TAU, true)
  ctx.fill('evenodd')
  ctx.fillStyle = '#f4e7d4'
  ctx.beginPath()
  ctx.moveTo(0, -size * 0.09)
  ctx.lineTo(size * 0.09, 0)
  ctx.lineTo(0, size * 0.09)
  ctx.lineTo(-size * 0.09, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const JEWELS = ['#8e1d3a', '#c4552a', '#e0a24a', '#f3e2bc', '#1e4c86', '#1f6a52', '#6d3878', '#b8892e'] as const

function paintGlass(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, time } = view
  const unit = unitOf(view)
  const cx = width * 0.5
  const cy = height * 0.45
  const radius = unit * 0.36

  const night = ctx.createLinearGradient(0, 0, 0, height)
  night.addColorStop(0, '#070814')
  night.addColorStop(0.55, '#0c101c')
  night.addColorStop(1, '#07060c')
  ctx.fillStyle = night
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 48; i++) {
    const x = hash(i, 21) * width
    const y = hash(i, 22) * height * 0.62
    if (y > cy - radius * 0.2 && x > cx - radius * 1.5 && x < cx + radius * 1.5) continue
    const twinkle = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * 1.4 + i))
    ctx.fillStyle = `rgba(244, 236, 220, ${0.35 * twinkle})`
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1.2, i % 5 === 0 ? 2 : 1.2)
  }

  ctx.fillStyle = '#12101a'
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(0, cy + radius * 0.15)
  ctx.lineTo(cx - radius * 1.45, cy + radius * 0.15)
  ctx.arc(cx, cy + radius * 0.15, radius * 1.45, Math.PI, 0)
  ctx.lineTo(width, cy + radius * 0.15)
  ctx.lineTo(width, height)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#1a1724'
  ctx.beginPath()
  ctx.moveTo(cx - radius * 1.16, height)
  ctx.lineTo(cx - radius * 1.16, cy + radius * 0.28)
  ctx.arc(cx, cy + radius * 0.28, radius * 1.16, Math.PI, 0)
  ctx.lineTo(cx + radius * 1.16, height)
  ctx.closePath()
  ctx.fill()

  const glow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.35)
  glow.addColorStop(0, 'rgba(255, 214, 160, 0.22)')
  glow.addColorStop(0.45, 'rgba(120, 150, 220, 0.08)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 1.35, 0, TAU)
  ctx.fill()

  ctx.fillStyle = '#0b0a10'
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.78, 0, TAU)
  ctx.fill()

  const rings = [
    { inner: 0.1, outer: 0.22, count: 12, petal: false },
    { inner: 0.24, outer: 0.4, count: 18, petal: false },
    { inner: 0.42, outer: 0.58, count: 24, petal: false },
    { inner: 0.6, outer: 0.9, count: 12, petal: true },
  ] as const

  let serial = 0
  const total = rings.reduce((sum, ring) => sum + ring.count, 0)
  const spark = Math.floor(time * 2.4) % total
  const spin = time * 0.045

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const sweep = TAU / ring.count
      const a0 = spin * (ring.petal ? 0.35 : 1) + i * sweep
      const gap = sweep * (ring.petal ? 0.08 : 0.1)
      const color = pick(JEWELS, i * 3 + ring.count)
      const lit = serial === spark
      pane(
        ctx,
        cx,
        cy,
        radius * ring.inner,
        radius * ring.outer,
        a0 + gap,
        a0 + sweep - gap,
        color,
        ring.petal,
        lit,
      )
      serial += 1
    }
  }

  ctx.strokeStyle = 'rgba(232, 196, 130, 0.42)'
  ctx.lineWidth = 1.15
  for (const ring of [0.1, 0.23, 0.41, 0.59]) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius * ring, 0, TAU)
    ctx.stroke()
  }

  const boss = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.085)
  boss.addColorStop(0, '#fff8e8')
  boss.addColorStop(0.55, '#e8c27a')
  boss.addColorStop(1, '#8a5a28')
  ctx.fillStyle = boss
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.085, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = 'rgba(92, 52, 18, 0.45)'
  ctx.lineWidth = 1
  ctx.stroke()
}

function pane(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  color: string,
  petal: boolean,
  spark: boolean,
) {
  const mid = (a0 + a1) / 2
  const reach = (r0 + r1) / 2
  const gx = cx + Math.cos(mid) * reach
  const gy = cy + Math.sin(mid) * reach
  const glass = ctx.createRadialGradient(gx, gy, 1, gx, gy, Math.max(8, (r1 - r0) * 0.85))
  glass.addColorStop(0, mixHex(color, '#fff6e4', spark ? 0.72 : 0.4))
  glass.addColorStop(0.55, color)
  glass.addColorStop(1, mixHex(color, '#120c0a', 0.5))

  ctx.beginPath()
  if (petal) {
    const tipX = cx + Math.cos(mid) * r1
    const tipY = cy + Math.sin(mid) * r1
    ctx.arc(cx, cy, r0, a1, a0, true)
    ctx.quadraticCurveTo(cx + Math.cos(a0) * ((r0 + r1) * 0.52), cy + Math.sin(a0) * ((r0 + r1) * 0.52), tipX, tipY)
    ctx.quadraticCurveTo(cx + Math.cos(a1) * ((r0 + r1) * 0.52), cy + Math.sin(a1) * ((r0 + r1) * 0.52), cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0)
  } else {
    ctx.arc(cx, cy, r1, a0, a1)
    ctx.arc(cx, cy, r0, a1, a0, true)
  }
  ctx.closePath()
  ctx.fillStyle = glass
  ctx.fill()
  ctx.strokeStyle = 'rgba(18, 12, 14, 0.92)'
  ctx.lineWidth = Math.max(1.4, (r1 - r0) * 0.045)
  ctx.stroke()
}

interface Mark {
  x: number
  y: number
  len: number
  rot: number
  weight: number
  color: string
  phase: number
  drift: number
}

interface Pad {
  x: number
  y: number
  rx: number
  ry: number
  rot: number
}

interface Blossom {
  x: number
  y: number
  size: number
  spin: number
  outer: readonly [string, string, string]
  inner: readonly [string, string, string]
}

interface GardenLayout {
  key: string
  sky: Mark[]
  water: Mark[]
  pads: Pad[]
  blossoms: Blossom[]
}

let gardenLayout: GardenLayout | null = null

const SKY = ['#f4c7b4', '#e7a3b6', '#f6d3a4', '#e7c4d6', '#f8e6d0', '#d9898e', '#f2b89a', '#c98baf', '#ffe9c8']
const WATER = ['#1a4e56', '#246068', '#163e46', '#2f6f66', '#1d5550', '#3c7d72', '#0f3338', '#4d8a78', '#d5e0c4', '#8fb8b0', '#e7d5c4']
const BLOSSOMS: readonly Blossom[] = [
  { x: 0.32, y: 0.66, size: 0.055, spin: 0.2, outer: ['#e7a3b8', '#f8e4ea', '#fffaf6'], inner: ['#fff6ea', '#ffe1c4', '#f6d98a'] },
  { x: 0.5, y: 0.6, size: 0.078, spin: 0.6, outer: ['#f4d5dc', '#fffaf6', '#ffe8c8'], inner: ['#fff8ee', '#f6d98a', '#fffaf2'] },
  { x: 0.66, y: 0.68, size: 0.06, spin: 1.1, outer: ['#e7b56a', '#f6d98a', '#fff6de'], inner: ['#fffaf0', '#ffe1a8', '#f3c1b0'] },
  { x: 0.78, y: 0.6, size: 0.048, spin: 0.4, outer: ['#d4a8c8', '#f4e4f2', '#fff6fa'], inner: ['#fff4ea', '#f6d0dc', '#ffe8c8'] },
]

function paintGarden(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, time } = view
  const unit = unitOf(view)
  const layout = gardenFor(view)

  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.52)
  sky.addColorStop(0, '#f6d0c4')
  sky.addColorStop(0.45, '#e7b0c0')
  sky.addColorStop(1, '#efd2b4')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height * 0.52)

  wash(ctx, width * 0.22, height * 0.16, unit * 0.28, 'rgba(244, 170, 164, 0.38)')
  wash(ctx, width * 0.58, height * 0.1, unit * 0.24, 'rgba(230, 150, 176, 0.28)')
  wash(ctx, width * 0.8, height * 0.22, unit * 0.2, 'rgba(255, 214, 168, 0.34)')

  ctx.lineCap = 'round'
  for (const mark of layout.sky) dab(ctx, mark, time)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const sun = ctx.createRadialGradient(width * 0.74, height * 0.16, 0, width * 0.74, height * 0.16, unit * 0.22)
  sun.addColorStop(0, 'rgba(255, 250, 240, 0.9)')
  sun.addColorStop(0.35, 'rgba(255, 206, 160, 0.28)')
  sun.addColorStop(1, 'rgba(255, 206, 160, 0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, width, height * 0.5)
  ctx.restore()

  const water = ctx.createLinearGradient(0, height * 0.48, 0, height)
  water.addColorStop(0, '#d7c2a4')
  water.addColorStop(0.12, '#1d5960')
  water.addColorStop(1, '#0c2e34')
  ctx.fillStyle = water
  ctx.fillRect(0, height * 0.48, width, height * 0.52)
  wash(ctx, width * 0.32, height * 0.62, unit * 0.22, 'rgba(46, 120, 108, 0.28)')
  wash(ctx, width * 0.7, height * 0.7, unit * 0.2, 'rgba(18, 70, 74, 0.3)')

  for (const mark of layout.water) dab(ctx, mark, time)

  ctx.strokeStyle = 'rgba(255, 244, 230, 0.35)'
  ctx.lineWidth = unit * 0.006
  ctx.beginPath()
  ctx.moveTo(0, height * 0.5)
  ctx.lineTo(width, height * 0.5)
  ctx.stroke()

  for (const pad of layout.pads) lilyPad(ctx, pad)

  for (let i = 0; i < 5; i++) {
    const x = width * (0.04 + i * 0.045)
    const sway = Math.sin(time * 0.4 + i * 0.8) * unit * 0.018
    ctx.strokeStyle = `rgba(24, 72, 54, ${0.28 + (i % 2) * 0.1})`
    ctx.lineWidth = Math.max(1.4, unit * 0.005)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.bezierCurveTo(x + sway, height * 0.16, x - sway, height * 0.3, x + sway * 0.4, height * 0.42)
    ctx.stroke()
  }

  for (const blossom of layout.blossoms) drawBlossom(ctx, blossom, time, height)

  for (let i = 0; i < 14; i++) {
    const y = height * (0.56 + ((time * 0.03 + hash(i, 30)) % 1) * 0.36)
    const x = (hash(i, 31) * width + Math.sin(time * 0.5 + i) * 12) % width
    ctx.strokeStyle = `rgba(236, 228, 210, ${0.15 + 0.2 * Math.sin(time * 2 + i)})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + unit * 0.03, y)
    ctx.stroke()
  }
}

function dab(ctx: CanvasRenderingContext2D, mark: Mark, time: number) {
  const shift = Math.sin(time * 0.65 + mark.phase) * mark.drift
  const dx = Math.cos(mark.rot) * mark.len * 0.5
  const dy = Math.sin(mark.rot) * mark.len * 0.5
  ctx.strokeStyle = mark.color
  ctx.lineWidth = mark.weight
  ctx.beginPath()
  ctx.moveTo(mark.x - dx, mark.y + shift - dy)
  ctx.lineTo(mark.x + dx, mark.y + shift + dy)
  ctx.stroke()
}

function lilyPad(ctx: CanvasRenderingContext2D, pad: Pad) {
  ctx.save()
  ctx.translate(pad.x, pad.y)
  ctx.rotate(pad.rot)
  ctx.beginPath()
  ctx.ellipse(0, 0, pad.rx, pad.ry, 0, 0.5, TAU - 0.15)
  ctx.lineTo(0, 0)
  ctx.closePath()
  const tone = ctx.createRadialGradient(-pad.rx * 0.25, -pad.ry * 0.2, pad.rx * 0.1, 0, 0, pad.rx)
  tone.addColorStop(0, '#67b07a')
  tone.addColorStop(0.6, '#2f7a52')
  tone.addColorStop(1, '#184834')
  ctx.fillStyle = tone
  ctx.fill()
  ctx.strokeStyle = 'rgba(232, 220, 180, 0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(pad.rx * 0.82, pad.ry * 0.05)
  ctx.stroke()
  ctx.restore()
}

function gardenFor(view: View): GardenLayout {
  const key = `${Math.round(view.width)}x${Math.round(view.height)}`
  if (gardenLayout?.key === key) return gardenLayout

  const { width, height, reduced } = view
  const unit = unitOf(view)
  const rng = mulberry32(41)
  const sky: Mark[] = []
  const water: Mark[] = []
  const pads: Pad[] = []
  const skyCount = reduced ? 70 : 180
  const waterCount = reduced ? 80 : 200

  for (let i = 0; i < skyCount; i++) {
    sky.push({
      x: rng() * width,
      y: rng() * height * 0.46,
      len: unit * (0.045 + rng() * 0.07),
      rot: rng() * 0.55 - 0.27,
      weight: unit * (0.01 + rng() * 0.016),
      color: pick(SKY, i + Math.floor(rng() * 3)),
      phase: rng() * TAU,
      drift: rng() * 0.6,
    })
  }

  for (let i = 0; i < waterCount; i++) {
    water.push({
      x: rng() * width,
      y: height * (0.52 + rng() * 0.44),
      len: unit * (0.03 + rng() * 0.055),
      rot: (rng() - 0.5) * 0.45,
      weight: unit * (0.007 + rng() * 0.012),
      color: pick(WATER, i + Math.floor(rng() * 4)),
      phase: rng() * TAU,
      drift: 0.4 + rng() * 1.2,
    })
  }

  const blossoms = BLOSSOMS.map((blossom) => ({
    ...blossom,
    x: blossom.x * width,
    y: blossom.y * height,
    size: blossom.size * unit,
  }))

  for (const blossom of blossoms) {
    pads.push({
      x: blossom.x + unit * 0.012,
      y: blossom.y + blossom.size * 0.55,
      rx: blossom.size * 1.7,
      ry: blossom.size * 0.62,
      rot: (blossom.x / width - 0.5) * 0.5,
    })
  }
  pads.push({
    x: width * 0.2,
    y: height * 0.62,
    rx: unit * 0.07,
    ry: unit * 0.026,
    rot: -0.3,
  })

  gardenLayout = { key, sky, water, pads, blossoms }
  return gardenLayout
}

function wash(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const tone = ctx.createRadialGradient(x, y, 0, x, y, radius)
  tone.addColorStop(0, color)
  tone.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = tone
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.fill()
}

function drawBlossom(ctx: CanvasRenderingContext2D, blossom: Blossom, time: number, height: number) {
  const breathe = 1 + Math.sin(time * 0.7 + blossom.spin) * 0.015
  ctx.save()
  ctx.translate(blossom.x, blossom.y)
  for (let i = 0; i < 8; i++) {
    ctx.save()
    ctx.rotate((i / 8) * TAU + blossom.spin)
    petal(ctx, blossom.size * breathe, blossom.size * 0.32, blossom.outer)
    ctx.restore()
  }
  for (let i = 0; i < 6; i++) {
    ctx.save()
    ctx.rotate((i / 6) * TAU + blossom.spin + 0.35)
    petal(ctx, blossom.size * 0.58 * breathe, blossom.size * 0.24, blossom.inner)
    ctx.restore()
  }
  const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, blossom.size * 0.16)
  disc.addColorStop(0, '#fff6d2')
  disc.addColorStop(1, '#e2a24e')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, blossom.size * 0.13, 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(12, 42, 46, 0.28)'
  ctx.lineWidth = Math.max(2, blossom.size * 0.08)
  ctx.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const y = blossom.y + blossom.size * (0.9 + i * 0.22)
    if (y > height * 0.96) continue
    ctx.globalAlpha = 0.35 - i * 0.05
    ctx.beginPath()
    ctx.moveTo(blossom.x - blossom.size * 0.15, y)
    ctx.lineTo(blossom.x + blossom.size * 0.2, y + 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

interface Ribbon {
  y: number
  amp: number
  freq: number
  phase: number
  speed: number
  thick: number
  main: string
  mid: string
  core: string
}

const RIBBONS: readonly Ribbon[] = [
  { y: 0.36, amp: 0.07, freq: 1.55, phase: 0.4, speed: 0.55, thick: 0.09, main: '#b15e74', mid: '#f3c9cc', core: '#fff6f2' },
  { y: 0.5, amp: 0.1, freq: 2.05, phase: 2.1, speed: -0.42, thick: 0.11, main: '#c5ceda', mid: '#f7f3ee', core: '#ffffff' },
  { y: 0.64, amp: 0.06, freq: 1.25, phase: 1.2, speed: 0.33, thick: 0.078, main: '#2f7a68', mid: '#e4d09a', core: '#fff8ea' },
]

function paintSilk(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height } = view
  const unit = unitOf(view)

  const wall = ctx.createLinearGradient(0, 0, 0, height)
  wall.addColorStop(0, '#241820')
  wall.addColorStop(0.42, '#3c2c32')
  wall.addColorStop(1, '#120e12')
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.beginPath()
  ctx.moveTo(width * 0.18, height)
  ctx.lineTo(width * 0.18, height * 0.28)
  ctx.quadraticCurveTo(width * 0.5, height * 0.05, width * 0.82, height * 0.28)
  ctx.lineTo(width * 0.82, height)
  ctx.closePath()
  ctx.fill()

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, unit * 0.55)
  glow.addColorStop(0, 'rgba(255, 220, 196, 0.08)')
  glow.addColorStop(1, 'rgba(255, 220, 196, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 236, 220, 0.045)'
  ctx.lineWidth = unit * 0.02
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(width * hash(i, 40), height * 0.1)
    ctx.quadraticCurveTo(width * (0.2 + hash(i, 41) * 0.6), height * (0.3 + hash(i, 42) * 0.4), width * hash(i, 43), height * 0.95)
    ctx.stroke()
  }

  for (const ribbon of RIBBONS) drawRibbon(ctx, view, ribbon)
}

function drawRibbon(ctx: CanvasRenderingContext2D, view: View, ribbon: Ribbon) {
  const { width, height, time } = view
  const unit = unitOf(view)
  const thick = unit * ribbon.thick * (0.94 + 0.06 * Math.sin(time * 0.7 + ribbon.phase))
  const points: { x: number; y: number }[] = []

  for (let x = -30; x <= width + 30; x += 16) {
    const u = x / width
    const y =
      height * ribbon.y +
      Math.sin(u * Math.PI * ribbon.freq + time * ribbon.speed + ribbon.phase) * height * ribbon.amp +
      Math.sin(u * Math.PI * ribbon.freq * 2.15 - time * ribbon.speed * 0.65) * height * ribbon.amp * 0.38
    points.push({ x, y })
  }

  const trace = (from: number, to: number, offsetY: number, widthScale: number, color: string) => {
    ctx.beginPath()
    for (let i = from; i <= to; i++) {
      const point = points[i]
      if (!point) continue
      const y = point.y + offsetY
      if (i === from) ctx.moveTo(point.x, y)
      else ctx.lineTo(point.x, y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, thick * widthScale)
    ctx.stroke()
  }

  const last = points.length - 1
  trace(0, last, unit * 0.02, 1.05, 'rgba(0, 0, 0, 0.2)')
  trace(0, last, 0, 1, ribbon.main)
  trace(0, last, -thick * 0.12, 0.55, ribbon.mid)
  trace(0, last, -thick * 0.2, 0.14, ribbon.core)

  const glint = (time * 0.07 * Math.sign(ribbon.speed || 1) + ribbon.phase * 0.13) % 1
  const center = Math.floor((glint < 0 ? glint + 1 : glint) * last)
  const span = Math.max(3, Math.floor(points.length * 0.08))
  trace(Math.max(0, center - span), Math.min(last, center + span), -thick * 0.2, 0.16, 'rgba(255, 252, 248, 0.85)')
}

function paintBloom(ctx: CanvasRenderingContext2D, view: View) {
  const { width, height, time, local, reduced } = view
  const unit = unitOf(view)
  const cx = width * 0.5
  const cy = height * 0.45

  const night = ctx.createRadialGradient(cx, cy, unit * 0.04, cx, cy, Math.max(width, height) * 0.75)
  night.addColorStop(0, '#321628')
  night.addColorStop(0.38, '#140910')
  night.addColorStop(1, '#07060b')
  ctx.fillStyle = night
  ctx.fillRect(0, 0, width, height)

  const bokeh = reduced ? 10 : 24
  for (let i = 0; i < bokeh; i++) {
    const x = hash(i, 51) * width
    const y = hash(i, 52) * height
    const r = unit * (0.02 + hash(i, 53) * 0.07)
    const alpha = 0.035 + 0.06 * (0.5 + 0.5 * Math.sin(time * 0.8 + i))
    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 186, 170, ${alpha})` : `rgba(255, 214, 150, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, r * (1 + Math.sin(time * 0.6 + i) * 0.06), 0, TAU)
    ctx.fill()
  }

  const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.42)
  aura.addColorStop(0, 'rgba(255, 186, 150, 0.18)')
  aura.addColorStop(0.5, 'rgba(160, 40, 70, 0.08)')
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = aura
  ctx.fillRect(0, 0, width, height)

  const breathe = 1 + Math.sin(time * 0.85) * 0.012
  const outer = reduced ? 10 : 16
  for (let i = 0; i < outer; i++) {
    const open = reduced ? 1 : smoothstep(0.15 + (i % 5) * 0.16, 6.4, local)
    const len = unit * 0.31 * open * breathe
    const wid = len * (0.28 + (i % 3) * 0.025)
    const angle = (i / outer) * TAU
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle - Math.PI / 2)
    petal(ctx, len, wid, ['#4a1024', '#9a3450', '#e7b0c0'])
    ctx.restore()
  }

  const inner = reduced ? 7 : 10
  for (let i = 0; i < inner; i++) {
    const open = reduced ? 1 : smoothstep(1.3 + (i % 4) * 0.12, 7.2, local)
    const len = unit * 0.2 * open * breathe
    const angle = (i / inner) * TAU + TAU / inner / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle - Math.PI / 2)
    petal(ctx, len, len * 0.34, ['#f0c8aa', '#fff1dc', '#e7b4c6'])
    ctx.restore()
  }

  const openCenter = reduced ? 1 : smoothstep(0.8, 5.5, local)
  const discR = unit * 0.052 * Math.max(0.2, openCenter)
  const disc = ctx.createRadialGradient(cx - discR * 0.2, cy - discR * 0.2, 0, cx, cy, discR)
  disc.addColorStop(0, '#fff6d4')
  disc.addColorStop(0.55, '#e8b45c')
  disc.addColorStop(1, '#a86b2c')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, discR, 0, TAU)
  ctx.fill()

  if (openCenter > 0.2) {
    ctx.strokeStyle = 'rgba(255, 232, 180, 0.75)'
    ctx.lineWidth = 1
    const stamens = 16
    for (let i = 0; i < stamens; i++) {
      const angle = (i / stamens) * TAU + time * 0.08
      const rad = unit * 0.05 * openCenter
      const x = cx + Math.cos(angle) * rad
      const y = cy + Math.sin(angle) * rad * 0.72
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.fillStyle = '#fff6de'
      ctx.beginPath()
      ctx.arc(x, y, unit * 0.0055, 0, TAU)
      ctx.fill()
    }
  }

  const pollen = reduced ? 0 : 18
  for (let i = 0; i < pollen; i++) {
    const life = (time * 0.11 + hash(i, 61)) % 1
    const angle = hash(i, 62) * TAU
    const x = cx + Math.cos(angle) * unit * 0.04 + Math.sin(time + i) * 10
    const y = cy - life * unit * 0.38
    ctx.fillStyle = `rgba(255, 226, 170, ${0.85 * (1 - life)})`
    ctx.beginPath()
    ctx.arc(x, y, 1.35, 0, TAU)
    ctx.fill()
  }

  if (!reduced && smoothstep(0.2, 6.4, local) > 0.45) {
    for (let i = 0; i < 12; i++) {
      const cycle = (time * (0.045 + (i % 4) * 0.008) + i * 0.137) % 1
      const x = cx + Math.sin(i * 2.2) * unit * 0.22 + Math.sin(time * 0.55 + i) * 18
      const y = cy - unit * 0.02 + cycle * height * 0.55
      const alpha = Math.sin(cycle * Math.PI) * 0.75
      if (alpha <= 0) continue
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(time * 0.7 + i)
      ctx.globalAlpha = alpha
      petal(ctx, unit * 0.045, unit * 0.016, ['#6a2038', '#c46b86', '#f4d0da'])
      ctx.restore()
    }
  }
}

function petal(ctx: CanvasRenderingContext2D, len: number, wid: number, colors: readonly [string, string, string]) {
  if (len < 1) return
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(wid, len * 0.18, wid * 0.72, len * 0.72, 0, len)
  ctx.bezierCurveTo(-wid * 0.72, len * 0.72, -wid, len * 0.18, 0, 0)
  ctx.closePath()
  const tone = ctx.createLinearGradient(0, 0, 0, len)
  tone.addColorStop(0, colors[0])
  tone.addColorStop(0.5, colors[1])
  tone.addColorStop(1, colors[2])
  ctx.fillStyle = tone
  ctx.fill()
  ctx.strokeStyle = 'rgba(70, 16, 32, 0.18)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 228, 190, 0.28)'
  ctx.beginPath()
  ctx.moveTo(0, len * 0.12)
  ctx.quadraticCurveTo(wid * 0.04, len * 0.5, 0, len * 0.9)
  ctx.stroke()
}

export const rooms: readonly Room[] = [
  {
    id: 'gilt',
    roman: 'I',
    title: 'Gilt',
    line: 'Leaf remembering the sun',
    paint: paintGilt,
  },
  {
    id: 'ink',
    roman: 'II',
    title: 'Ink',
    line: 'The circle almost closes',
    paint: paintInk,
  },
  {
    id: 'glass',
    roman: 'III',
    title: 'Glass',
    line: 'A window made of prayers',
    paint: paintGlass,
  },
  {
    id: 'garden',
    roman: 'IV',
    title: 'Garden',
    line: 'Water learning every color',
    paint: paintGarden,
  },
  {
    id: 'silk',
    roman: 'V',
    title: 'Silk',
    line: 'Cloth that learned to breathe',
    paint: paintSilk,
  },
  {
    id: 'bloom',
    roman: 'VI',
    title: 'Bloom',
    line: 'The night opens one flower',
    paint: paintBloom,
  },
]
