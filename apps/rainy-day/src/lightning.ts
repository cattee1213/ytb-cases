import { animate, type JSAnimation } from 'animejs'

export interface Point {
  x: number
  y: number
}

export interface Bolt {
  points: Point[]
  branches: Point[][]
}

export interface Storm {
  sky: number
  bolt: number
  shake: number
  bolts: Bolt[]
}

function segment(from: Point, to: Point, displace: number, depth: number, out: Point[], branches: Point[][]) {
  if (depth <= 0 || displace < 7) {
    out.push(to)
    return
  }

  const mid = {
    x: (from.x + to.x) / 2 + (Math.random() - 0.5) * displace,
    y: (from.y + to.y) / 2 + (Math.random() - 0.5) * displace * 0.45,
  }
  segment(from, mid, displace * 0.55, depth - 1, out, branches)

  if (depth >= 3 && Math.random() < 0.45) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.7)
    const length = 28 + Math.random() * (70 + depth * 16)
    const branch: Point[] = [mid]
    segment(
      mid,
      { x: mid.x + Math.cos(angle) * length, y: mid.y + Math.sin(angle) * length },
      displace * 0.45,
      depth - 2,
      branch,
      [],
    )
    branches.push(branch)
  }

  segment(mid, to, displace * 0.55, depth - 1, out, branches)
}

function buildBolt(x0: number, y0: number, x1: number, y1: number): Bolt {
  const points: Point[] = [{ x: x0, y: y0 }]
  const branches: Point[][] = []
  const distance = Math.hypot(x1 - x0, y1 - y0)
  segment(points[0]!, { x: x1, y: y1 }, Math.min(90, distance * 0.28), 6, points, branches)
  return { points, branches }
}

function trace(ctx: CanvasRenderingContext2D, points: Point[]) {
  const first = points[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    if (point) ctx.lineTo(point.x, point.y)
  }
}

export function createStorm(): Storm {
  return { sky: 0, bolt: 0, shake: 0, bolts: [] }
}

let flashAnim: JSAnimation | null = null

export function strikeAt(storm: Storm, startX: number, endX: number, startY: number, endY: number, reduced: boolean) {
  flashAnim?.cancel()
  const bolts = [buildBolt(startX, startY, endX, endY)]
  if (!reduced && Math.random() > 0.62) {
    bolts.push(buildBolt(startX + (Math.random() - 0.5) * 70, startY + 8, endX + (Math.random() - 0.5) * 50, endY))
  }
  storm.bolts = bolts

  const sky = reduced
    ? [{ to: 0.35, duration: 80 }, { to: 0, duration: 260 }]
    : [
        { to: 1, duration: 30 },
        { to: 0.08, duration: 80 },
        { to: 0.72, duration: 40 },
        { to: 0.72, duration: 90 },
        { to: 0, duration: 640 },
      ]
  const bolt = reduced
    ? [{ to: 0.7, duration: 70 }, { to: 0, duration: 220 }]
    : [
        { to: 1, duration: 24 },
        { to: 1, duration: 70 },
        { to: 0.05, duration: 70 },
        { to: 0.9, duration: 36 },
        { to: 0.9, duration: 100 },
        { to: 0, duration: 480 },
      ]
  const shake = reduced
    ? [{ to: 0, duration: 1 }]
    : [
        { to: 1, duration: 36 },
        { to: -0.55, duration: 70 },
        { to: 0.28, duration: 90 },
        { to: 0, duration: 240 },
      ]

  flashAnim = animate(storm, {
    sky,
    bolt,
    shake,
    ease: 'linear',
  })
}

function fillSkyGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, strength: number) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
  glow.addColorStop(0, `rgba(255, 255, 255, ${strength * 0.2})`)
  glow.addColorStop(0.08, `rgba(228, 240, 255, ${strength * 0.12})`)
  glow.addColorStop(0.2, `rgba(196, 220, 255, ${strength * 0.06})`)
  glow.addColorStop(0.4, `rgba(160, 196, 245, ${strength * 0.026})`)
  glow.addColorStop(0.65, `rgba(140, 176, 228, ${strength * 0.01})`)
  glow.addColorStop(0.86, `rgba(128, 164, 216, ${strength * 0.003})`)
  glow.addColorStop(1, 'rgba(128, 164, 216, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

export function drawBoltGlow(ctx: CanvasRenderingContext2D, storm: Storm, width: number, height: number) {
  if (storm.sky <= 0.01 || storm.bolts.length === 0) return
  const reach = Math.min(width, height) * 1.15
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const bolt of storm.bolts) {
    const points = bolt.points
    const steps = 6
    for (let i = 0; i < steps; i++) {
      const t = 0.06 + (0.9 * i) / (steps - 1)
      const point = points[Math.round((points.length - 1) * t)]
      if (!point) continue
      const along = Math.sin(Math.PI * t)
      fillSkyGlow(ctx, point.x, point.y, reach * (0.78 + along * 0.22), storm.sky * (0.45 + along * 0.35))
    }
  }
  ctx.restore()
}

export function drawBolts(ctx: CanvasRenderingContext2D, storm: Storm) {
  if (storm.bolt < 0.02) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(210, 228, 255, 0.9)'
  ctx.shadowBlur = 18

  for (const bolt of storm.bolts) {
    ctx.globalAlpha = storm.bolt * 0.45
    ctx.strokeStyle = 'rgba(198, 220, 255, 1)'
    ctx.lineWidth = 5
    trace(ctx, bolt.points)
    ctx.stroke()

    ctx.globalAlpha = storm.bolt
    ctx.strokeStyle = 'rgba(244, 248, 255, 1)'
    ctx.lineWidth = 2.1
    trace(ctx, bolt.points)
    ctx.stroke()

    ctx.globalAlpha = storm.bolt
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.05
    ctx.shadowBlur = 0
    trace(ctx, bolt.points)
    ctx.stroke()
    ctx.shadowBlur = 16

    for (const branch of bolt.branches) {
      ctx.globalAlpha = storm.bolt * 0.8
      ctx.strokeStyle = 'rgba(236, 244, 255, 1)'
      ctx.lineWidth = 1.15
      trace(ctx, branch)
      ctx.stroke()
    }

    const impact = bolt.points[bolt.points.length - 1]
    if (impact) {
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      const bloomRadius = 240
      const bloom = ctx.createRadialGradient(impact.x, impact.y, 0, impact.x, impact.y, bloomRadius)
      bloom.addColorStop(0, `rgba(255, 255, 255, ${storm.bolt * 0.85})`)
      bloom.addColorStop(0.08, `rgba(232, 242, 255, ${storm.bolt * 0.28})`)
      bloom.addColorStop(0.24, `rgba(196, 220, 255, ${storm.bolt * 0.08})`)
      bloom.addColorStop(0.55, `rgba(170, 200, 245, ${storm.bolt * 0.02})`)
      bloom.addColorStop(1, 'rgba(170, 200, 245, 0)')
      ctx.fillStyle = bloom
      ctx.beginPath()
      ctx.arc(impact.x, impact.y, bloomRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

export function createClimate(reduced: boolean) {
  const state = { wind: reduced ? 0.05 : 0.2 }
  let stopped = false
  let running: JSAnimation | null = null

  const loop = () => {
    if (stopped) return
    const target = reduced ? (Math.random() - 0.5) * 0.2 : (Math.random() - 0.36) * 1.45
    running = animate(state, {
      wind: target,
      duration: reduced ? 4200 : 1700 + Math.random() * 2100,
      delay: reduced ? 400 : 280 + Math.random() * 1500,
      ease: 'inOutSine',
      onComplete: loop,
    })
  }

  loop()

  return {
    state,
    stop() {
      stopped = true
      running?.cancel()
    },
  }
}
