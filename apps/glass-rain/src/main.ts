import {
  INSTANCE_STRIDE,
  MAX_INSTANCES,
  createSim,
  resizeSim,
  spawnImpactAt,
  stepSim,
  wipe,
  writeInstances,
  type Sim,
} from './drops'
import { createRenderer } from './renderer'
import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#glass')
if (!canvas) throw new Error('Glass stage is missing')

const view: HTMLCanvasElement = canvas
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const batch = new Float32Array(MAX_INSTANCES * INSTANCE_STRIDE)

async function boot() {
  let renderer: ReturnType<typeof createRenderer>
  try {
    renderer = createRenderer(view)
  } catch (error) {
    console.error(error)
    return
  }

  const image = new Image()
  image.src = `${import.meta.env.BASE_URL}bg.jpg`
  try {
    await image.decode()
  } catch (error) {
    console.error(error)
    renderer.destroy()
    return
  }
  renderer.setPhoto(image)

  const firstRect = view.getBoundingClientRect()
  const firstSize = renderer.resize(firstRect.width, firstRect.height)
  const sim: Sim = createSim(firstSize.width, firstSize.height, reduced)
  const resize = () => {
    const rect = view.getBoundingClientRect()
    const next = renderer.resize(rect.width, rect.height)
    resizeSim(sim, next.width, next.height)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(view)

  const pointFrom = (event: PointerEvent) => {
    const rect = view.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * sim.width,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * sim.height,
    }
  }

  view.addEventListener('pointerdown', (event) => {
    view.setPointerCapture(event.pointerId)
    const point = pointFrom(event)
    wipe(sim, point.x, point.y, sim.width * 0.045)
    spawnImpactAt(sim, point.x, point.y)
  })

  view.addEventListener('pointermove', (event) => {
    if (event.buttons === 0) return
    const point = pointFrom(event)
    wipe(sim, point.x, point.y, sim.width * 0.055)
  })

  let last = performance.now()
  let frameId = 0
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!document.hidden) {
      stepSim(sim, dt)
      renderer.draw(batch, writeInstances(sim, batch), sim.time)
    }
    frameId = requestAnimationFrame(frame)
  }

  stepSim(sim, 1 / 60)
  renderer.draw(batch, writeInstances(sim, batch), sim.time)
  frameId = requestAnimationFrame(frame)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      renderer.destroy()
    })
  }
}

void boot()
