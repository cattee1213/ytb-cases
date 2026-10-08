export const TAU = Math.PI * 2

export function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const span = edge1 - edge0
  const t = clamp01(span === 0 ? 1 : (value - edge0) / span)
  return t * t * (3 - 2 * t)
}

export function hash(ix: number, iy: number) {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)
  n = (n ^ (n >>> 13)) >>> 0
  n = Math.imul(n, 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export function valueNoise(x: number, y: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = fade(x - x0)
  const ty = fade(y - y0)
  const a = hash(x0, y0)
  const b = hash(x0 + 1, y0)
  const c = hash(x0, y0 + 1)
  const d = hash(x0 + 1, y0 + 1)
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}

function fade(t: number) {
  return t * t * (3 - 2 * t)
}

export function mixHex(from: string, to: string, amount: number) {
  const t = clamp01(amount)
  const r = Math.round(channel(from, 0) + (channel(to, 0) - channel(from, 0)) * t)
  const g = Math.round(channel(from, 1) + (channel(to, 1) - channel(from, 1)) * t)
  const b = Math.round(channel(from, 2) + (channel(to, 2) - channel(from, 2)) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function channel(color: string, index: number) {
  return Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16)
}

export function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick(list: readonly string[], index: number) {
  return list[index % list.length] ?? list[0] ?? '#ffffff'
}
