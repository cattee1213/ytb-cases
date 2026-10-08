import { createFilm } from './film'
import { rooms, type Room, type View } from './paint'
import './style.css'

const stage = document.querySelector<HTMLElement>('#stage')
const canvas = document.querySelector<HTMLCanvasElement>('#scene')
const roman = document.querySelector<HTMLElement>('.plaque-roman')
const title = document.querySelector<HTMLElement>('.plaque-title')
const line = document.querySelector<HTMLElement>('.plaque-line')
const plaque = document.querySelector<HTMLElement>('.plaque')
const pager = document.querySelector<HTMLElement>('.pager')
const overture = document.querySelector<HTMLElement>('.overture')
const hint = document.querySelector<HTMLElement>('.hint')
const ripple = document.querySelector<HTMLElement>('.ripple')
const motes = document.querySelector<HTMLElement>('.motes')

if (!stage || !canvas || !roman || !title || !line || !plaque || !pager || !overture || !hint || !ripple || !motes) {
  throw new Error('Aurelia stage is missing')
}

const root: HTMLElement = stage
const viewCanvas: HTMLCanvasElement = canvas
const romanEl: HTMLElement = roman
const titleEl: HTMLElement = title
const lineEl: HTMLElement = line
const plaqueEl: HTMLElement = plaque
const pagerEl: HTMLElement = pager
const overtureEl: HTMLElement = overture
const hintEl: HTMLElement = hint
const rippleEl: HTMLElement = ripple
const moteField: HTMLElement = motes

const buffer = document.createElement('canvas')
const bufferContext = buffer.getContext('2d')
const context = viewCanvas.getContext('2d')
if (!context || !bufferContext) throw new Error('Canvas 2D is not available')
const ctx: CanvasRenderingContext2D = context
const bctx: CanvasRenderingContext2D = bufferContext

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const params = new URLSearchParams(window.location.search)
const skipTitle = params.get('title') === '0' || reduced

function startIndex() {
  const requested = params.get('room')
  if (!requested) return 0
  const numeric = Number(requested)
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= rooms.length) return numeric - 1
  const found = rooms.findIndex((room) => room.id === requested.toLowerCase())
  return found >= 0 ? found : 0
}

const film = createFilm(reduced, startIndex())

let width = 1
let height = 1
let dpr = 1
let frame = 0
let seen = -1
let ready = false
let spotX = 0.5
let spotY = 0.4
let aimX = 0.5
let aimY = 0.4
let idle = 0
let last = performance.now()

for (let i = 0; i < 16; i++) {
  const mote = document.createElement('span')
  mote.style.left = `${Math.random() * 100}%`
  mote.style.animationDelay = `${-Math.random() * 24}s`
  mote.style.animationDuration = `${16 + Math.random() * 18}s`
  mote.style.setProperty('--drift', `${-28 + Math.random() * 56}px`)
  mote.style.setProperty('--size', `${1.5 + Math.random() * 2.4}px`)
  moteField.append(mote)
}

rooms.forEach((room, index) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', room.title)
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    film.jump(index)
    hideHint()
  })
  pagerEl.append(button)
})

function resize() {
  const rect = root.getBoundingClientRect()
  width = Math.max(1, rect.width)
  height = Math.max(1, rect.height)
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pixels = width * height * dpr * dpr
  const cap = 1920 * 1080 * 2.2
  if (pixels > cap) dpr *= Math.sqrt(cap / pixels)
  const bitmapW = Math.max(1, Math.round(width * dpr))
  const bitmapH = Math.max(1, Math.round(height * dpr))
  viewCanvas.width = bitmapW
  viewCanvas.height = bitmapH
  buffer.width = bitmapW
  buffer.height = bitmapH
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  bctx.lineCap = 'round'
  bctx.lineJoin = 'round'
}

function blit(room: Room, alpha: number, view: View) {
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  bctx.clearRect(0, 0, width, height)
  bctx.save()
  room.paint(bctx, view)
  bctx.restore()
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(buffer, 0, 0, width, height)
  ctx.restore()
}

function armPlaque() {
  plaqueEl.classList.remove('is-shown')
  void plaqueEl.offsetWidth
  plaqueEl.classList.add('is-shown')
}

function present(index: number) {
  const room = rooms[index]
  if (!room) return
  romanEl.textContent = room.roman
  titleEl.textContent = room.title
  lineEl.textContent = room.line
  root.dataset.room = room.id
  const buttons = pagerEl.querySelectorAll('button')
  buttons.forEach((button, buttonIndex) => {
    if (buttonIndex === index) button.setAttribute('aria-current', 'true')
    else button.removeAttribute('aria-current')
  })
  if (ready) armPlaque()
}

function markReady() {
  if (ready) return
  ready = true
  root.classList.add('is-ready')
  armPlaque()
}

function hideHint() {
  hintEl.style.animation = 'none'
  hintEl.style.opacity = '0'
}

function render(now: number) {
  const shot = film.shot(now)
  if (shot.generation !== seen) {
    seen = shot.generation
    present(shot.index)
  }

  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  idle += dt
  if (!reduced) {
    if (idle > 3) {
      root.classList.add('is-still')
      aimX = 0.5 + Math.sin(now / 1000 * 0.15) * 0.12
      aimY = 0.4 + Math.cos(now / 1000 * 0.11) * 0.08
    }
    spotX += (aimX - spotX) * Math.min(1, dt * 1.6)
    spotY += (aimY - spotY) * Math.min(1, dt * 1.6)
    root.style.setProperty('--spot-x', `${spotX * 100}%`)
    root.style.setProperty('--spot-y', `${spotY * 100}%`)
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const base = { width, height, time: now / 1000, reduced }
  if (shot.previous && shot.reveal < 1) {
    blit(shot.previous, 1, { ...base, local: shot.previousLocal })
    blit(shot.current, shot.reveal, { ...base, local: shot.local })
  } else {
    ctx.save()
    shot.current.paint(ctx, { ...base, local: shot.local })
    ctx.restore()
  }

  frame = requestAnimationFrame(render)
}

function turn(clientX: number, clientY: number) {
  rippleEl.style.left = `${clientX}px`
  rippleEl.style.top = `${clientY}px`
  rippleEl.classList.remove('is-on')
  void rippleEl.offsetWidth
  rippleEl.classList.add('is-on')
  film.next()
  hideHint()
}

root.addEventListener('pointerdown', (event) => {
  const target = event.target
  if (target instanceof Element && target.closest('.pager')) return
  turn(event.clientX, event.clientY)
})

root.addEventListener('pointermove', (event) => {
  const rect = root.getBoundingClientRect()
  aimX = (event.clientX - rect.left) / Math.max(1, rect.width)
  aimY = (event.clientY - rect.top) / Math.max(1, rect.height)
  idle = 0
  root.classList.remove('is-still')
})

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault()
    film.next()
    hideHint()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    film.prev()
    hideHint()
  } else if (event.key === 'f' || event.key === 'F') {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => undefined)
  }
}

window.addEventListener('keydown', onKey)

function onOvertureEnd(event: AnimationEvent) {
  if (event.target !== overtureEl) return
  markReady()
}

overtureEl.addEventListener('animationend', onOvertureEnd)

if (skipTitle) {
  root.classList.add('no-title')
  markReady()
} else {
  window.setTimeout(markReady, 8200)
}

const resizeObserver = new ResizeObserver(resize)
resizeObserver.observe(root)
resize()
frame = requestAnimationFrame(render)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    window.removeEventListener('keydown', onKey)
    overtureEl.removeEventListener('animationend', onOvertureEnd)
  })
}
