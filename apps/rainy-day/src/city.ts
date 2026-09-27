export interface SkylinePoint {
  x: number
  roof: number
}

export interface SkylineLight {
  x: number
  y: number
  w: number
  h: number
  warm: boolean
  phase: number
  speed: number
}

export interface SkylineLayer {
  points: SkylinePoint[]
  fill: string
}

export interface Skyline {
  horizon: number
  far: SkylineLayer
  near: SkylineLayer
  lights: SkylineLight[]
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface LayerOptions {
  minW: number
  maxW: number
  minH: number
  maxH: number
  tower: number
  towerH: number
  lights: boolean
  plain: boolean
}

function pushRoof(points: SkylinePoint[], x: number, roof: number) {
  const prev = points[points.length - 1]
  if (!prev) {
    points.push({ x, roof })
    return
  }
  if (x < prev.x - 0.01) return
  const nextX = Math.max(x, prev.x)
  if (Math.abs(prev.x - nextX) < 0.01 && Math.abs(prev.roof - roof) < 0.01) return
  if (nextX > prev.x + 0.01) points.push({ x: nextX, roof: prev.roof })
  points.push({ x: nextX, roof })
}

function buildLayer(
  width: number,
  horizon: number,
  rng: () => number,
  options: LayerOptions,
): { points: SkylinePoint[]; lights: SkylineLight[] } {
  const points: SkylinePoint[] = [{ x: -8, roof: horizon }]
  const lights: SkylineLight[] = []
  let x = -8
  let height = horizon * (options.minH + options.maxH) * 0.5

  while (x < width + 8) {
    const block = options.minW + rng() * (options.maxW - options.minW)
    const drift = (rng() - 0.46) * horizon * 0.16
    height = Math.min(horizon * options.maxH, Math.max(horizon * options.minH, height + drift))
    if (rng() < options.tower) height = horizon * (options.towerH + rng() * 0.16)

    const roof = horizon - height
    const right = x + block
    const hasCrown = !options.plain && rng() > 0.62 && block > options.minW * 1.4
    const inset = hasCrown ? block * (0.22 + rng() * 0.12) : 0
    const crown = hasCrown ? roof - Math.min(28, height * 0.16) : roof
    const crownLeft = x + inset
    const crownRight = right - inset

    pushRoof(points, x, roof)
    if (hasCrown) {
      pushRoof(points, crownLeft, roof)
      pushRoof(points, crownLeft, crown)
    }

    if (!options.plain && options.tower > 0 && height > horizon * 0.34 && rng() > 0.55) {
      const mast = crown - (14 + rng() * 30)
      const ax = (crownLeft + crownRight) * 0.5
      pushRoof(points, ax - 1, crown)
      pushRoof(points, ax - 1, mast)
      pushRoof(points, ax + 1, mast)
      pushRoof(points, ax + 1, crown)
    }

    if (hasCrown) {
      pushRoof(points, crownRight, crown)
      pushRoof(points, crownRight, roof)
    }
    pushRoof(points, right, roof)

    if (options.lights && height > 64 && rng() > 0.22) {
      const count = 2 + Math.floor(rng() * (height > 180 ? 4 : 2))
      for (let i = 0; i < count; i++) {
        const span = Math.max(8, crownRight - crownLeft)
        lights.push({
          x: crownLeft + 6 + rng() * Math.max(1, span - 12),
          y: crown + 14 + rng() * Math.max(8, height * 0.55),
          w: 2.2 + rng() * 1.6,
          h: 3 + rng() * 2.2,
          warm: rng() > 0.22,
          phase: rng() * Math.PI * 2,
          speed: 0.6 + rng() * 1.4,
        })
      }
    }

    x = right
  }

  pushRoof(points, width + 8, horizon)
  points.push({ x: width + 8, roof: horizon })
  return { points, lights }
}

export function createSkyline(width: number, horizon: number): Skyline {
  const seed = Math.round(width) * 997 + Math.round(horizon) * 13
  const unit = Math.max(26, Math.min(54, width / 26))
  const far = buildLayer(width, horizon, mulberry32(seed ^ 0x9e3779b9), {
    minW: unit * 2.6,
    maxW: unit * 4.6,
    minH: 0.04,
    maxH: 0.16,
    tower: 0,
    towerH: 0.16,
    lights: false,
    plain: true,
  })
  const near = buildLayer(width, horizon, mulberry32(seed), {
    minW: unit * 0.85,
    maxW: unit * 2.1,
    minH: 0.07,
    maxH: 0.36,
    tower: 0.14,
    towerH: 0.48,
    lights: true,
    plain: false,
  })

  return {
    horizon,
    far: { fill: '#0c1420', points: far.points },
    near: { fill: '#07090f', points: near.points },
    lights: near.lights,
  }
}

export function roofAt(skyline: Skyline, x: number): number {
  const points = skyline.near.points
  const first = points[0]
  if (!first) return skyline.horizon
  if (x <= first.x) return first.roof

  for (let i = 1; i < points.length; i++) {
    const left = points[i - 1]
    const right = points[i]
    if (!left || !right || x > right.x) continue
    const span = right.x - left.x
    if (span <= 0.001) return Math.min(left.roof, right.roof)
    const t = (x - left.x) / span
    return left.roof + (right.roof - left.roof) * t
  }

  return points[points.length - 1]?.roof ?? skyline.horizon
}

function fillLayer(ctx: CanvasRenderingContext2D, points: SkylinePoint[], horizon: number) {
  const first = points[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, horizon)
  for (const point of points) ctx.lineTo(point.x, point.roof)
  const last = points[points.length - 1]
  if (last) ctx.lineTo(last.x, horizon)
  ctx.closePath()
}

export interface FlashFocus {
  x: number
  y: number
  radius: number
}

function strokeRoofs(ctx: CanvasRenderingContext2D, points: SkylinePoint[], horizon: number, focus?: FlashFocus) {
  ctx.beginPath()
  for (let i = 1; i < points.length; i++) {
    const left = points[i - 1]
    const right = points[i]
    if (!left || !right) continue
    if (left.roof > horizon - 2 || right.roof > horizon - 2) continue
    const dx = Math.abs(right.x - left.x)
    const dy = Math.abs(right.roof - left.roof)
    if (dx < 10 || dy > dx * 0.2) continue
    if (focus) {
      const midX = (left.x + right.x) / 2
      const midY = (left.roof + right.roof) / 2
      if (Math.hypot(midX - focus.x, midY - focus.y) > focus.radius) continue
    }
    ctx.moveTo(left.x, left.roof)
    ctx.lineTo(right.x, right.roof)
  }
}

export function drawSkyline(
  ctx: CanvasRenderingContext2D,
  skyline: Skyline,
  time: number,
  flash: number,
  focus?: FlashFocus,
) {
  const { horizon } = skyline

  ctx.fillStyle = skyline.far.fill
  fillLayer(ctx, skyline.far.points, horizon)
  ctx.fill()

  ctx.fillStyle = skyline.near.fill
  fillLayer(ctx, skyline.near.points, horizon)
  ctx.fill()

  ctx.save()
  fillLayer(ctx, skyline.near.points, horizon)
  ctx.clip()
  for (const light of skyline.lights) {
    const twinkle = 0.55 + 0.45 * Math.sin(time * light.speed + light.phase)
    let boost = 0
    if (focus && flash > 0) {
      const dist = Math.hypot(light.x - focus.x, light.y - focus.y)
      boost = flash * 0.9 * Math.max(0, 1 - dist / focus.radius)
    }
    const alpha = Math.min(1, twinkle * 0.7 + boost)
    ctx.fillStyle = light.warm ? `rgba(255, 198, 128, ${alpha})` : `rgba(186, 216, 255, ${alpha})`
    ctx.fillRect(light.x, light.y, light.w, light.h)
  }
  ctx.restore()

  if (flash > 0.04 && focus) {
    ctx.save()
    fillLayer(ctx, skyline.near.points, horizon)
    ctx.clip()
    const glow = ctx.createRadialGradient(focus.x, focus.y, focus.radius * 0.05, focus.x, focus.y, focus.radius)
    glow.addColorStop(0, `rgba(236, 244, 255, ${flash * 0.22})`)
    glow.addColorStop(0.28, `rgba(206, 224, 255, ${flash * 0.1})`)
    glow.addColorStop(0.62, `rgba(176, 204, 240, ${flash * 0.03})`)
    glow.addColorStop(1, 'rgba(176, 204, 240, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(focus.x, focus.y, focus.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.lineWidth = 1.25
  ctx.strokeStyle = 'rgba(214, 226, 242, 0.16)'
  strokeRoofs(ctx, skyline.near.points, horizon)
  ctx.stroke()

  if (flash > 0.04 && focus) {
    ctx.strokeStyle = `rgba(244, 248, 255, ${Math.min(1, flash)})`
    strokeRoofs(ctx, skyline.near.points, horizon, focus)
    ctx.stroke()
  }
}
