import { createScene } from './scene'
import './style.css'

const stage = document.querySelector<HTMLElement>('#stage')
const canvas = document.querySelector<HTMLCanvasElement>('#scene')
const flashEl = document.querySelector<HTMLElement>('.flash')
const hint = document.querySelector<HTMLElement>('.hint')

if (!stage || !canvas || !flashEl || !hint) {
  throw new Error('Rainy day stage is missing')
}

const root: HTMLElement = stage
const view: HTMLCanvasElement = canvas
const flash: HTMLElement = flashEl
const caption: HTMLElement = hint
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const scene = createScene(view, root, flash, reduced)

function resize() {
  const rect = root.getBoundingClientRect()
  scene.resize(rect.width, rect.height)
}

let lastPointerX = 0
let frame = 0

function loop(now: number) {
  scene.frame(now)
  frame = requestAnimationFrame(loop)
}

function hideHint() {
  caption.style.animation = 'none'
  caption.style.opacity = '0'
}

root.addEventListener('pointerdown', (event) => {
  const rect = view.getBoundingClientRect()
  lastPointerX = event.clientX
  scene.strike(event.clientX - rect.left, event.clientY - rect.top)
  hideHint()
})

root.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' && event.buttons === 0) return
  const rect = view.getBoundingClientRect()
  const delta = (event.clientX - lastPointerX) / Math.max(1, rect.width)
  lastPointerX = event.clientX
  if (Math.abs(delta) > 0) scene.nudgeWind(delta * 18)
})

window.addEventListener('keydown', (event) => {
  if (event.key !== ' ' && event.key !== 'Enter') return
  event.preventDefault()
  scene.strike()
  hideHint()
})

const resizeObserver = new ResizeObserver(resize)
resizeObserver.observe(root)
window.addEventListener('orientationchange', resize)
resize()
frame = requestAnimationFrame(loop)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    scene.destroy()
  })
}
