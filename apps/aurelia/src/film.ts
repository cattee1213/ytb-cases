import { rooms, type Room } from './paint'
import { smoothstep } from './math'

export interface Shot {
  current: Room
  previous: Room | null
  reveal: number
  local: number
  previousLocal: number
  index: number
  generation: number
}

export interface Film {
  shot(now: number): Shot
  next(): void
  prev(): void
  jump(index: number): void
}

function mod(index: number) {
  return ((index % rooms.length) + rooms.length) % rooms.length
}

function roomAt(index: number): Room {
  const room = rooms[index]
  if (!room) throw new Error(`Unknown room ${index}`)
  return room
}

export function createFilm(reduced: boolean, startIndex = 0): Film {
  const dwell = reduced ? 22 : 18
  const fade = reduced ? 0.4 : 3.15
  let index = mod(startIndex)
  let previousIndex = index
  let fading = false
  let generation = 0
  let started = performance.now()

  function go(to: number) {
    const nextIndex = mod(to)
    previousIndex = index
    generation += 1
    started = performance.now()
    if (nextIndex === index) {
      fading = false
      return
    }
    index = nextIndex
    fading = true
  }

  function shot(now: number): Shot {
    let age = (now - started) / 1000
    if (age >= dwell) {
      const steps = Math.floor(age / dwell)
      previousIndex = mod(index + steps - 1)
      index = mod(index + steps)
      fading = true
      generation += 1
      started += steps * dwell * 1000
      age = (now - started) / 1000
    }

    const reveal = fading ? smoothstep(0, fade, age) : 1
    const previous = fading && reveal < 1 && previousIndex !== index ? roomAt(previousIndex) : null

    return {
      current: roomAt(index),
      previous,
      reveal,
      local: age,
      previousLocal: age + dwell,
      index,
      generation,
    }
  }

  return {
    shot,
    next: () => go(index + 1),
    prev: () => go(index - 1),
    jump: (nextIndex) => go(nextIndex),
  }
}
