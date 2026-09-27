interface Drop {
  x: number
  y: number
  z: number
  vy: number
  splashY: number
}

interface Ripple {
  x: number
  y: number
  depth: number
  age: number
  life: number
  maxR: number
  active: boolean
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  z: number
  active: boolean
}

export interface Rain {
  drops: Drop[]
  ripples: Ripple[]
  sparks: Spark[]
  rippleCursor: number
  sparkCursor: number
  width: number
  height: number
  horizon: number
}

const GRAVITY = 420
const SPARK_GRAVITY = 760

export function dropBudget(width: number, height: number) {
  return Math.round(Math.min(300, Math.max(72, (width * height) / 7000)))
}

function placeDrop(drop: Drop, width: number, height: number, horizon: number, randomY: boolean) {
  drop.z = 0.18 + Math.random() ** 1.7 * 0.82
  drop.x = Math.random() * (width + 80) - 40
  const water = Math.max(1, height - horizon)
  drop.splashY = horizon + drop.z * water * 0.96
  drop.y = randomY ? Math.random() * drop.splashY : -20 - Math.random() * 160
  drop.vy = 30 + drop.z * 90
}

function makeRipple(): Ripple {
  return { x: 0, y: 0, depth: 0, age: 0, life: 1, maxR: 1, active: false }
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, z: 0, active: false }
}

export function createRain(width: number, height: number, horizon: number): Rain {
  const count = dropBudget(width, height)
  const drops = Array.from({ length: count }, () => {
    const drop: Drop = { x: 0, y: 0, z: 0, vy: 0, splashY: 0 }
    placeDrop(drop, width, height, horizon, true)
    return drop
  })
  return {
    drops,
    ripples: Array.from({ length: 36 }, makeRipple),
    sparks: Array.from({ length: 70 }, makeSpark),
    rippleCursor: 0,
    sparkCursor: 0,
    width,
    height,
    horizon,
  }
}

function spawnRipple(rain: Rain, x: number, y: number, depth: number, scale = 1) {
  const ripple = rain.ripples[rain.rippleCursor]
  if (!ripple) return
  rain.rippleCursor = (rain.rippleCursor + 1) % rain.ripples.length
  ripple.x = x
  ripple.y = y
  ripple.depth = depth
  ripple.age = 0
  ripple.life = 0.7 + depth * 0.7
  ripple.maxR = (4 + depth * 16) * scale
  ripple.active = true
}

function spawnSpark(rain: Rain, x: number, y: number, z: number) {
  const spark = rain.sparks[rain.sparkCursor]
  if (!spark) return
  rain.sparkCursor = (rain.sparkCursor + 1) % rain.sparks.length
  const spread = 20 + z * 90
  spark.x = x
  spark.y = y
  spark.vx = (Math.random() - 0.5) * spread
  spark.vy = -(20 + Math.random() * 70) * (0.4 + z)
  spark.life = 0.25 + Math.random() * 0.28
  spark.max = spark.life
  spark.z = z
  spark.active = true
}

export function splash(rain: Rain, x: number, y: number, power: number) {
  const depth = Math.min(1, Math.max(0, (y - rain.horizon) / Math.max(1, rain.height - rain.horizon)))
  spawnRipple(rain, x, y, Math.max(depth, 0.35), power)
  const sparks = 3 + Math.floor(power * 4)
  for (let i = 0; i < sparks; i++) spawnSpark(rain, x, y, 0.7 + power * 0.3)
}

export function stepRain(rain: Rain, dt: number, wind: number) {
  const { width, height, horizon } = rain

  for (const drop of rain.drops) {
    drop.vy = Math.min(220 + drop.z * 620, drop.vy + GRAVITY * (0.35 + drop.z) * dt)
    drop.x += wind * (28 + drop.z * 130) * dt
    drop.y += drop.vy * dt

    if (drop.y >= drop.splashY) {
      const depth = (drop.splashY - horizon) / Math.max(1, height - horizon)
      if (Math.random() < 0.55 + drop.z * 0.4) spawnRipple(rain, drop.x, drop.splashY, depth)
      if (drop.z > 0.62 && Math.random() < 0.7) {
        spawnSpark(rain, drop.x, drop.splashY, drop.z)
        if (drop.z > 0.82) spawnSpark(rain, drop.x, drop.splashY, drop.z)
      }
      placeDrop(drop, width, height, horizon, false)
    } else if (drop.x < -60 || drop.x > width + 60) {
      placeDrop(drop, width, height, horizon, false)
    }
  }

  for (const ripple of rain.ripples) {
    if (!ripple.active) continue
    ripple.age += dt
    if (ripple.age >= ripple.life) ripple.active = false
  }

  for (const spark of rain.sparks) {
    if (!spark.active) continue
    spark.vy += SPARK_GRAVITY * dt
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
    spark.life -= dt
    if (spark.life <= 0) spark.active = false
  }
}

export function drawRain(ctx: CanvasRenderingContext2D, rain: Rain, wind: number) {
  ctx.lineCap = 'round'
  const slant = wind * 0.55 + 0.16
  for (const drop of rain.drops) {
    const alpha = 0.16 + drop.z * 0.5
    const len = 11 + drop.z * 26
    const dx = slant * len * 0.34
    ctx.strokeStyle = `rgba(210, 224, 246, ${alpha * 0.28})`
    ctx.lineWidth = 1.5 + drop.z * 1.1
    ctx.beginPath()
    ctx.moveTo(drop.x - dx, drop.y - len)
    ctx.lineTo(drop.x, drop.y)
    ctx.stroke()
    ctx.strokeStyle = `rgba(232, 240, 255, ${alpha})`
    ctx.lineWidth = 0.55 + drop.z * 0.7
    ctx.beginPath()
    ctx.moveTo(drop.x - dx * 0.72, drop.y - len * 0.62)
    ctx.lineTo(drop.x, drop.y)
    ctx.stroke()
  }
}

export function drawSurface(ctx: CanvasRenderingContext2D, rain: Rain) {
  for (const ripple of rain.ripples) {
    if (!ripple.active) continue
    const t = ripple.age / ripple.life
    const radius = ripple.maxR * (0.3 + t * 0.85)
    const flatten = 0.14 + ripple.depth * 0.1
    ctx.beginPath()
    ctx.ellipse(ripple.x, ripple.y, radius, Math.max(0.7, radius * flatten), 0, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(214, 228, 255, ${(1 - t) * (0.32 + ripple.depth * 0.4)})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.lineCap = 'round'
  for (const spark of rain.sparks) {
    if (!spark.active) continue
    const alpha = Math.max(0, spark.life / spark.max) * 0.75
    ctx.strokeStyle = `rgba(236, 244, 255, ${alpha})`
    ctx.lineWidth = 0.8 + spark.z * 0.6
    ctx.beginPath()
    ctx.moveTo(spark.x, spark.y)
    ctx.lineTo(spark.x - spark.vx * 0.02, spark.y - spark.vy * 0.02)
    ctx.stroke()
  }
}
