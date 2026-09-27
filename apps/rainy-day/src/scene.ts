import { createSkyline, drawSkyline, roofAt, type FlashFocus, type Skyline } from './city'
import { createClimate, createStorm, drawBoltGlow, drawBolts, strikeAt, type Storm } from './lightning'
import { createRain, drawRain, drawSurface, splash, stepRain, type Rain } from './rain'

export interface Scene {
  resize(width: number, height: number): void
  frame(now: number): void
  strike(x?: number, y?: number): void
  nudgeWind(amount: number): void
  destroy(): void
}

function horizonFor(width: number, height: number) {
  const aspect = width / Math.max(1, height)
  if (aspect < 0.75) return height * 0.84
  if (aspect < 1.05) return height * 0.8
  if (height < 520) return height * 0.78
  return height * 0.82
}

function strikeRoof(skyline: Skyline, width: number) {
  let x = width * (0.2 + Math.random() * 0.6)
  let y = roofAt(skyline, x)
  for (let i = 0; i < 7; i++) {
    const sample = width * (0.08 + Math.random() * 0.84)
    const roof = roofAt(skyline, sample)
    if (roof < y) {
      x = sample
      y = roof
    }
  }
  return { x, y }
}

export function createScene(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  flashEl: HTMLElement,
  reduced: boolean,
): Scene {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available')
  const ctx: CanvasRenderingContext2D = context

  let width = 1
  let height = 1
  let dpr = 1
  let horizon = 1
  let skyline: Skyline = createSkyline(1, 1)
  let rain: Rain = createRain(1, 1, 1)
  const storm: Storm = createStorm()
  const climate = createClimate(reduced)
  let pointerWind = 0
  let last = performance.now()
  let timer = reduced ? 10_000 : 2.4
  let running = true
  let strikeGlow: FlashFocus = { x: 0, y: 0, radius: 160 }

  function percent(value: number, span: number) {
    return `${(value / Math.max(1, span)) * 100}%`
  }

  function placeFlash(startY: number, endX: number, endY: number) {
    const points = storm.bolts[0]?.points ?? []
    const anchor = points[Math.round((points.length - 1) * 0.42)] ?? {
      x: endX,
      y: startY + (endY - startY) * 0.42,
    }
    const impact = points[points.length - 1] ?? { x: endX, y: endY }
    let minX = anchor.x
    let maxX = anchor.x
    let minY = anchor.y
    let maxY = anchor.y
    for (const point of points) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    const flashRx = Math.min(width * 0.34, Math.max(width * 0.2, (maxX - minX) / 2 + width * 0.14))
    const flashRy = Math.min(height * 0.46, Math.max(height * 0.28, (maxY - minY) * 0.55))
    const hitR = Math.min(width, height) * 0.28
    flashEl.style.setProperty('--flash-x', percent(anchor.x, width))
    flashEl.style.setProperty('--flash-y', percent(anchor.y, height))
    flashEl.style.setProperty('--flash-rx', percent(flashRx, width))
    flashEl.style.setProperty('--flash-ry', percent(flashRy, height))
    flashEl.style.setProperty('--hit-x', percent(impact.x, width))
    flashEl.style.setProperty('--hit-y', percent(impact.y, height))
    flashEl.style.setProperty('--hit-rx', percent(hitR, width))
    flashEl.style.setProperty('--hit-ry', percent(hitR, height))
    strikeGlow = {
      x: impact.x,
      y: impact.y,
      radius: Math.min(Math.max(width, height) * 0.38, Math.max(180, Math.min(width, height) * 0.46)),
    }
  }

  function resize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, nextWidth)
    height = Math.max(1, nextHeight)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    horizon = horizonFor(width, height)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    skyline = createSkyline(width, horizon)
    rain = createRain(width, height, horizon)
  }

  function strike(x?: number, y = 0) {
    const pointed = x !== undefined
    const onGround = pointed && y > horizon + 8
    const roof = pointed ? null : strikeRoof(skyline, width)
    const endX = pointed ? x : (roof?.x ?? width * 0.5)
    const endY = onGround ? Math.min(height - 12, y) : pointed ? roofAt(skyline, endX) : (roof?.y ?? roofAt(skyline, endX))
    const startX = Math.min(width - 8, Math.max(8, endX + (Math.random() - 0.5) * 36))
    const startY = height * (0.02 + Math.random() * 0.06)
    strikeAt(storm, startX, endX, startY, endY, reduced)
    placeFlash(startY, endX, endY)
    if (endY >= horizon - 1) splash(rain, endX, endY, reduced ? 1 : 1.8)
    timer = reduced ? 14 : 6.5 + Math.random() * 6
  }

  function frame(now: number) {
    if (!running) return
    const dt = Math.min(0.033, (now - last) / 1000)
    last = now
    pointerWind += (0 - pointerWind) * Math.min(1, dt * 1.4)
    const wind = climate.state.wind + pointerWind

    timer -= dt
    if (timer <= 0) strike()

    stepRain(rain, dt, wind)

    ctx.clearRect(0, 0, width, height)

    drawBoltGlow(ctx, storm, width, height)
    drawSkyline(ctx, skyline, now / 1000, storm.sky, strikeGlow)

    const groundTop = '#04060c'
    ctx.fillStyle = groundTop
    ctx.fillRect(0, horizon, width, height - horizon)

    const span = Math.max(1, height - horizon)
    const ground = ctx.createLinearGradient(0, horizon, 0, horizon + span)
    ground.addColorStop(0, 'rgba(22, 32, 48, 0.28)')
    ground.addColorStop(0.4, 'rgba(6, 8, 14, 0.16)')
    ground.addColorStop(1, 'rgba(2, 3, 6, 0)')
    ctx.fillStyle = ground
    ctx.fillRect(0, horizon, width, span)

    ctx.strokeStyle = 'rgba(186, 206, 230, 0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, horizon + 0.5)
    ctx.lineTo(width, horizon + 0.5)
    ctx.stroke()

    if (storm.sky > 0.04) {
      const reach = strikeGlow.radius
      const horizonGlow = ctx.createLinearGradient(strikeGlow.x - reach, 0, strikeGlow.x + reach, 0)
      horizonGlow.addColorStop(0, 'rgba(214, 228, 255, 0)')
      horizonGlow.addColorStop(0.22, `rgba(214, 228, 255, ${storm.sky * 0.12})`)
      horizonGlow.addColorStop(0.5, `rgba(240, 246, 255, ${storm.sky * 0.55})`)
      horizonGlow.addColorStop(0.78, `rgba(214, 228, 255, ${storm.sky * 0.12})`)
      horizonGlow.addColorStop(1, 'rgba(214, 228, 255, 0)')
      ctx.strokeStyle = horizonGlow
      ctx.beginPath()
      ctx.moveTo(strikeGlow.x - reach, horizon + 0.5)
      ctx.lineTo(strikeGlow.x + reach, horizon + 0.5)
      ctx.stroke()
    }

    drawSurface(ctx, rain)
    drawRain(ctx, rain, wind)
    drawBolts(ctx, storm)

    flashEl.style.opacity = String(Math.min(0.88, storm.sky * 0.8))
    if (!reduced && Math.abs(storm.shake) > 0.02) {
      stage.style.transform = `translate3d(${(storm.shake * 7).toFixed(2)}px, ${(Math.abs(storm.shake) * 2).toFixed(2)}px, 0)`
    } else if (stage.style.transform) {
      stage.style.transform = ''
    }
  }

  return {
    resize,
    frame,
    strike,
    nudgeWind(amount: number) {
      pointerWind = Math.max(-1.4, Math.min(1.4, amount))
    },
    destroy() {
      running = false
      climate.stop()
    },
  }
}
