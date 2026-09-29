export const MAX_DROPS = 720
export const INSTANCE_STRIDE = 8
export const MAX_INSTANCES = MAX_DROPS * 2

export interface Drop {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  seed: number
  resting: boolean
  settle: number
  deposit: number
  side: number
  wander: number
  wanderTime: number
  wet: number
  trail: boolean
  active: boolean
}

export interface Sim {
  drops: Drop[]
  width: number
  height: number
  time: number
  impact: number
  cursor: number
  cell: number
  cols: number
  rows: number
  heads: Int32Array
  next: Int32Array
  wet: Float32Array
  reduced: boolean
}

function makeDrop(): Drop {
  return {
    x: 0,
    y: 0,
    r: 0,
    vx: 0,
    vy: 0,
    seed: 0,
    resting: true,
    settle: 0,
    deposit: 0,
    side: 1,
    wander: 0,
    wanderTime: 0,
    wet: 1,
    trail: false,
    active: false,
  }
}

function unit(sim: Sim, value: number) {
  return value * (sim.height / 1700)
}

function pinRadius(sim: Sim, drop: Drop) {
  const column = Math.sin(drop.x * 0.015 + drop.seed * 6.2) * 0.5 + 0.5
  return unit(sim, 8.2 + column * 5.2)
}

function allocateGrid(sim: Sim) {
  sim.cell = Math.max(18, unit(sim, 30))
  sim.cols = Math.max(1, Math.ceil(sim.width / sim.cell))
  sim.rows = Math.max(1, Math.ceil(sim.height / sim.cell))
  sim.heads = new Int32Array(sim.cols * sim.rows)
  sim.heads.fill(-1)
  sim.next = new Int32Array(MAX_DROPS)
  sim.next.fill(-1)
  sim.wet = new Float32Array(sim.cols * sim.rows)
}

function acquire(sim: Sim): Drop | null {
  for (let step = 0; step < sim.drops.length; step += 1) {
    const index = (sim.cursor + step) % sim.drops.length
    const drop = sim.drops[index]
    if (drop && !drop.active) {
      sim.cursor = (index + 1) % sim.drops.length
      return drop
    }
  }
  return null
}

function claim(drop: Drop, x: number, y: number, radius: number, wet: number) {
  drop.x = x
  drop.y = y
  drop.r = radius
  drop.vx = 0
  drop.vy = 0
  drop.seed = Math.random()
  drop.resting = true
  drop.settle = 0
  drop.deposit = 0
  drop.side = Math.random() < 0.5 ? -1 : 1
  drop.wander = 0
  drop.wanderTime = 0.6 + Math.random() * 1.2
  drop.wet = wet
  drop.trail = false
  drop.active = true
}

function tooClose(sim: Sim, x: number, y: number, radius: number) {
  const limit = radius * 1.7
  for (const other of sim.drops) {
    if (!other.active) continue
    const dx = other.x - x
    const dy = other.y - y
    const reach = Math.max(limit, (other.r + radius) * 0.82)
    if (dx * dx + dy * dy < reach * reach) return true
  }
  return false
}

function cellIndex(sim: Sim, x: number, y: number) {
  const col = Math.min(sim.cols - 1, Math.max(0, Math.floor(x / sim.cell)))
  const row = Math.min(sim.rows - 1, Math.max(0, Math.floor(y / sim.cell)))
  return row * sim.cols + col
}

function sampleWet(sim: Sim, x: number, y: number) {
  return sim.wet[cellIndex(sim, x, y)] ?? 0
}

function paintWet(sim: Sim, x: number, y: number, amount: number) {
  const col = Math.floor(x / sim.cell)
  const row = Math.floor(y / sim.cell)
  for (let yy = row - 1; yy <= row + 1; yy += 1) {
    if (yy < 0 || yy >= sim.rows) continue
    for (let xx = col - 1; xx <= col + 1; xx += 1) {
      if (xx < 0 || xx >= sim.cols) continue
      const index = yy * sim.cols + xx
      sim.wet[index] = Math.min(1, (sim.wet[index] ?? 0) + amount)
    }
  }
}

function spawnRest(sim: Sim, x: number, y: number, radius: number, wet: number) {
  const drop = acquire(sim)
  if (!drop) return null
  claim(drop, x, y, radius, wet)
  return drop
}

function shedBead(sim: Sim, drop: Drop) {
  const bead = acquire(sim)
  if (!bead) return
  const speed = Math.hypot(drop.vx, drop.vy) || 1
  const dirX = drop.vx / speed
  const dirY = drop.vy / speed
  drop.side = -drop.side
  const lateral = drop.side * drop.r * (0.12 + Math.random() * 0.28)
  const behind = drop.r * (2.05 + Math.random() * 0.35)
  const radius = unit(sim, 1.7 + Math.random() * 1.45)
  claim(
    bead,
    drop.x - dirX * behind - dirY * lateral,
    drop.y - dirY * behind + dirX * lateral,
    radius,
    1,
  )
  bead.trail = true
  const kept = Math.max(unit(sim, 3.2) ** 2, drop.r * drop.r - radius * radius * 0.22)
  drop.r = Math.sqrt(kept)
}

function spawnSlider(sim: Sim, x: number, y: number, radius: number) {
  const drop = acquire(sim)
  if (!drop) return
  claim(drop, x, y, radius, 1)
  drop.resting = false
  drop.vy = unit(sim, 150 + Math.random() * 70)
  drop.vx = unit(sim, (Math.random() - 0.5) * 8)
  drop.wander = drop.vx
  let beadX = x
  let beadY = y - radius * 1.8
  const beads = 4 + Math.floor(Math.random() * 4)
  for (let index = 0; index < beads; index += 1) {
    beadX += (Math.random() - 0.5) * radius * 0.4
    beadY -= radius * (1.45 + Math.random() * 0.55)
    if (beadY < unit(sim, 6)) break
    const bead = spawnRest(sim, beadX, beadY, unit(sim, 1.15 + Math.random() * 1.2), 1)
    if (!bead) break
    bead.trail = true
    paintWet(sim, beadX, beadY, 0.55)
  }
}

function populate(sim: Sim) {
  const mist = Math.min(210, Math.round((sim.width * sim.height) / (unit(sim, 86) ** 2)))
  let placed = 0
  let tries = 0
  while (placed < mist && tries < mist * 8) {
    tries += 1
    const radius = unit(sim, 1.15 + Math.random() ** 3 * 3.4)
    const x = radius + Math.random() * (sim.width - radius * 2)
    const y = radius + Math.random() * (sim.height - radius * 2)
    if (tooClose(sim, x, y, radius)) continue
    if (spawnRest(sim, x, y, radius, 1)) placed += 1
  }
  const sliders = sim.reduced ? 2 : 6
  for (let index = 0; index < sliders; index += 1) {
    const radius = unit(sim, 11 + Math.random() * 6)
    const x = unit(sim, 36) + Math.random() * (sim.width - unit(sim, 72))
    const y = sim.height * (0.22 + Math.random() * 0.62)
    spawnSlider(sim, x, y, radius)
  }
}

export function createSim(width: number, height: number, reduced: boolean): Sim {
  const drops: Drop[] = []
  for (let index = 0; index < MAX_DROPS; index += 1) drops.push(makeDrop())
  const sim: Sim = {
    drops,
    width: Math.max(1, width),
    height: Math.max(1, height),
    time: 0,
    impact: 0.4,
    cursor: 0,
    cell: 30,
    cols: 1,
    rows: 1,
    heads: new Int32Array(1),
    next: new Int32Array(MAX_DROPS),
    wet: new Float32Array(1),
    reduced,
  }
  allocateGrid(sim)
  populate(sim)
  return sim
}

export function resizeSim(sim: Sim, width: number, height: number) {
  const nextWidth = Math.max(1, width)
  const nextHeight = Math.max(1, height)
  const scaleX = nextWidth / sim.width
  const scaleY = nextHeight / sim.height
  const scale = (scaleX + scaleY) * 0.5
  for (const drop of sim.drops) {
    drop.x *= scaleX
    drop.y *= scaleY
    drop.r *= scale
    drop.vx *= scale
    drop.vy *= scale
    drop.wander *= scale
  }
  sim.width = nextWidth
  sim.height = nextHeight
  allocateGrid(sim)
}

export function wipe(sim: Sim, x: number, y: number, radius: number) {
  for (const drop of sim.drops) {
    if (!drop.active) continue
    const dx = drop.x - x
    const dy = drop.y - y
    const distance = Math.hypot(dx, dy)
    if (distance > radius + drop.r) continue
    if (distance < radius * 0.38) {
      drop.active = false
      continue
    }
    const push = (radius + drop.r - distance) / radius
    const inv = 1 / (distance || 1)
    drop.resting = false
    drop.settle = 0
    drop.vx += dx * inv * unit(sim, 36) * push
    drop.vy = Math.max(drop.vy, unit(sim, 28) * push)
    drop.wander = drop.vx
  }
  paintWet(sim, x, y, 0.4)
}

export function spawnImpactAt(sim: Sim, x: number, y: number) {
  const radius = unit(sim, 10 + Math.random() * 5)
  const drop = spawnRest(sim, x, y, radius, 0.2)
  if (!drop) return
  drop.settle = 0.08 + Math.random() * 0.12
}

function rebuildGrid(sim: Sim) {
  sim.heads.fill(-1)
  for (let index = 0; index < sim.drops.length; index += 1) {
    const drop = sim.drops[index]
    if (!drop?.active) continue
    const cell = cellIndex(sim, drop.x, drop.y)
    sim.next[index] = sim.heads[cell] ?? -1
    sim.heads[cell] = index
  }
}

function absorb(sim: Sim, drop: Drop, index: number) {
  const col = Math.min(sim.cols - 1, Math.max(0, Math.floor(drop.x / sim.cell)))
  const row = Math.min(sim.rows - 1, Math.max(0, Math.floor(drop.y / sim.cell)))
  for (let yy = row - 1; yy <= row + 1; yy += 1) {
    if (yy < 0 || yy >= sim.rows) continue
    for (let xx = col - 1; xx <= col + 1; xx += 1) {
      if (xx < 0 || xx >= sim.cols) continue
      let otherIndex = sim.heads[yy * sim.cols + xx] ?? -1
      while (otherIndex >= 0) {
        const nextIndex = sim.next[otherIndex] ?? -1
        const other = sim.drops[otherIndex]
        if (other?.active && otherIndex !== index) {
          const dx = other.x - drop.x
          const dy = other.y - drop.y
          const distance = Math.hypot(dx, dy)
          const limit = drop.r * 0.8 + other.r * 0.45
          const ahead = dy > -drop.r * 0.25
          const smaller = other.resting || other.r <= drop.r * 0.9
          if (ahead && smaller && distance < limit && distance > 0.001) {
            const mass = drop.r * drop.r
            const otherMass = other.r * other.r
            const total = mass + otherMass
            drop.vx = (drop.vx * mass + other.vx * otherMass) / total
            drop.vy = (drop.vy * mass + other.vy * otherMass) / total
            drop.r = Math.min(unit(sim, 24), Math.sqrt(total))
            other.active = false
          }
        }
        otherIndex = nextIndex
      }
    }
  }
}

function stepDrop(sim: Sim, drop: Drop, dt: number) {
  if (drop.wet < 1) drop.wet = Math.min(1, drop.wet + dt * 5)
  if (drop.settle > 0) drop.settle = Math.max(0, drop.settle - dt)

  if (drop.resting) {
    drop.vx = 0
    drop.vy = 0
    if (Math.random() < dt * 0.03) drop.r += unit(sim, 0.05)
    if (drop.settle <= 0 && drop.r > pinRadius(sim, drop)) {
      drop.resting = false
      drop.trail = false
      drop.vy = unit(sim, 10)
      drop.vx = unit(sim, (drop.seed - 0.5) * 5)
      drop.wander = drop.vx
      drop.deposit = drop.r
    }
    return
  }

  const pin = pinRadius(sim, drop)
  const drive = Math.min(1, Math.max(0, (drop.r - pin * 0.7) / (pin * 0.62)))
  const terminal = unit(sim, 80 + 400 * drive)
  drop.vy += (terminal - drop.vy) * Math.min(1, dt * (1.3 + drive * 2.2))

  drop.wanderTime -= dt
  if (drop.wanderTime <= 0) {
    drop.wanderTime = 0.8 + Math.random() * 1.5
    const left = sampleWet(sim, drop.x - sim.cell, drop.y + sim.cell * 0.8)
    const right = sampleWet(sim, drop.x + sim.cell, drop.y + sim.cell * 0.8)
    const side = unit(sim, (right - left) * 28 + (Math.random() - 0.5) * 22)
    const cap = unit(sim, 26)
    drop.wander = Math.max(-cap, Math.min(cap, side))
  }
  drop.vx += (drop.wander - drop.vx) * Math.min(1, dt * 0.85)

  if (drive < 0.05) {
    drop.vy += (0 - drop.vy) * Math.min(1, dt * 3.2)
    drop.vx += (0 - drop.vx) * Math.min(1, dt * 3.2)
    if (drop.vy < unit(sim, 22)) {
      drop.resting = true
      drop.trail = true
      drop.vx = 0
      drop.vy = 0
      return
    }
  }

  drop.x += drop.vx * dt
  drop.y += drop.vy * dt
  if (drop.y - drop.r > sim.height + unit(sim, 24) || drop.x < -unit(sim, 60) || drop.x > sim.width + unit(sim, 60)) {
    drop.active = false
    return
  }
  paintWet(sim, drop.x, drop.y, dt * 1.8)
  if (drop.vy > unit(sim, 36)) {
    drop.deposit += Math.hypot(drop.vx, drop.vy) * dt
    const spacing = drop.r * (1.25 + drop.seed * 0.4)
    if (drop.deposit >= spacing) {
      drop.deposit = 0
      shedBead(sim, drop)
    }
  }
}

function freeSlots(sim: Sim) {
  let free = 0
  for (const drop of sim.drops) if (!drop.active) free += 1
  return free
}

function recycleBeads(sim: Sim) {
  let removed = 0
  for (const drop of sim.drops) {
    if (removed >= 10) break
    if (drop.active && drop.resting && drop.trail && drop.r < unit(sim, 2.4)) {
      drop.active = false
      removed += 1
    }
  }
}

function slidingCount(sim: Sim) {
  let count = 0
  for (const drop of sim.drops) if (drop.active && !drop.resting) count += 1
  return count
}

function spawnHit(sim: Sim, fromTop: boolean) {
  const sliding = slidingCount(sim)
  const large = !fromTop && sliding < (sim.reduced ? 2 : 7) && Math.random() < 0.34
  const radius = large ? unit(sim, 10.5 + Math.random() * 5.5) : unit(sim, 1.5 + Math.random() ** 1.7 * 3.8)
  const x = radius + Math.random() * Math.max(1, sim.width - radius * 2)
  const y = fromTop ? -radius : radius + Math.random() * sim.height * 0.92
  if (!fromTop) {
    for (const other of sim.drops) {
      if (!other.active || !other.resting) continue
      const dx = other.x - x
      const dy = other.y - y
      if (dx * dx + dy * dy > (other.r + radius) * (other.r + radius)) continue
      other.r = Math.min(unit(sim, 24), Math.hypot(other.r, radius * 0.65))
      other.wet = Math.min(1, other.wet + 0.35)
      return
    }
  }
  if (fromTop) {
    const drop = acquire(sim)
    if (!drop) return
    claim(drop, x, y, unit(sim, 10 + Math.random() * 4), 1)
    drop.resting = false
    drop.vy = unit(sim, 120 + Math.random() * 50)
    drop.vx = unit(sim, (Math.random() - 0.5) * 6)
    drop.wander = drop.vx
    return
  }
  const drop = spawnRest(sim, x, y, radius, 0.15)
  if (!drop) return
  drop.settle = large ? 0.1 + Math.random() * 0.16 : 0
}

export function stepSim(sim: Sim, delta: number) {
  const dt = Math.min(0.033, Math.max(0, delta)) * (sim.reduced ? 0.22 : 1)
  if (dt <= 0) return
  sim.time += dt

  for (const drop of sim.drops) {
    if (!drop.active) continue
    stepDrop(sim, drop, dt)
  }
  rebuildGrid(sim)
  for (let index = 0; index < sim.drops.length; index += 1) {
    const drop = sim.drops[index]
    if (!drop?.active || drop.resting) continue
    absorb(sim, drop, index)
  }

  if (freeSlots(sim) < 36) recycleBeads(sim)

  sim.impact -= dt
  if (sim.impact <= 0) {
    sim.impact = sim.reduced ? 1.4 + Math.random() : 0.45 + Math.random() * 0.7
    spawnHit(sim, false)
    if (Math.random() < 0.18) spawnHit(sim, true)
  }

  const keep = Math.exp(-dt * 0.045)
  for (let index = 0; index < sim.wet.length; index += 1) {
    sim.wet[index] = (sim.wet[index] ?? 0) * keep
  }
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const span = edge1 - edge0
  const amount = span === 0 ? 0 : Math.min(1, Math.max(0, (value - edge0) / span))
  return amount * amount * (3 - 2 * amount)
}

function heading(vx: number, vy: number) {
  const speed = Math.hypot(vx, vy) || 1
  return {
    x: vx / speed,
    y: vy / speed,
    angle: Math.atan2(-vx / speed, vy / speed),
  }
}

export function writeInstances(sim: Sim, out: Float32Array): number {
  let count = 0
  const limit = Math.floor(out.length / INSTANCE_STRIDE)
  const push = (x: number, y: number, rx: number, ry: number, angle: number, height: number, shape: number) => {
    if (count >= limit) return
    const offset = count * INSTANCE_STRIDE
    out[offset] = x
    out[offset + 1] = y
    out[offset + 2] = rx
    out[offset + 3] = ry
    out[offset + 4] = angle
    out[offset + 5] = height
    out[offset + 6] = shape
    out[offset + 7] = 0
    count += 1
  }

  for (const drop of sim.drops) {
    if (!drop.active || drop.r < 0.5 || drop.wet < 0.02) continue
    const speed = Math.hypot(drop.vx, drop.vy)
    const stretch = drop.resting ? 0 : Math.min(1, speed / unit(sim, 280))
    const flow = stretch > 0.08 ? heading(drop.vx, drop.vy) : { x: 0, y: 1, angle: 0 }
    const rx = drop.r * (1 - stretch * 0.1)
    const ry = drop.r * (1 + stretch * 0.55)
    const height = (0.12 + 0.72 * smoothstep(unit(sim, 4.5), unit(sim, 13), drop.r)) * drop.wet
    push(drop.x, drop.y, rx, ry, flow.angle, height, 0)
    if (!drop.resting && drop.vy > unit(sim, 48)) {
      const length = drop.r * (1.35 + stretch * 1.5)
      const cx = drop.x - flow.x * (drop.r * 0.85 + length * 0.42)
      const cy = drop.y - flow.y * (drop.r * 0.85 + length * 0.42)
      push(cx, cy, drop.r * 0.34, length * 0.5, flow.angle, Math.min(height, 0.34) * 0.28, 1)
    }
  }
  return count
}
