import gsap from 'gsap'
import { CLEAN, catalog, rest } from './cuts'
import { frames, paint, warm } from './frames'
import { restFx } from './fx'

export type Root = {
  stage: HTMLElement
  a: HTMLElement
  b: HTMLElement
  fx: HTMLElement
  glow: HTMLElement
}

const BPM = 80
const BEAT = 60 / BPM
const INTRO = 3
const BODY = 27

let master: gsap.core.Timeline | null = null

function slots(): number[] {
  const list: number[] = []
  const beats = Math.round(BODY / BEAT)
  for (let i = 0; i < beats; i++) {
    if (i !== 0 && i % 8 === 0) list.push(BEAT / 2, BEAT / 2)
    else list.push(BEAT)
  }
  return list
}

function dim(plate: HTMLElement) {
  gsap.set(plate, {
    scale: 1.08,
    autoAlpha: 1,
    zIndex: 2,
    xPercent: 0,
    yPercent: 0,
    rotation: 0,
    rotationY: 0,
    clipPath: 'inset(0% 0% 0% 0%)',
    filter: 'blur(0px) brightness(0.14) contrast(1.1) saturate(0.78) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))',
    transformOrigin: '50% 30%',
  })
}

function pulse(tl: gsap.core.Timeline, plate: HTMLElement, glow: HTMLElement) {
  const flash = glow.querySelector<HTMLElement>('.flash')
  const haze = glow.querySelector<HTMLElement>('.haze')
  const grain = glow.querySelector<HTMLElement>('.grain')
  tl.set(plate, {
    scale: 1.08,
    autoAlpha: 1,
    zIndex: 2,
    xPercent: 0,
    yPercent: 0,
    rotation: 0,
    rotationY: 0,
    clipPath: 'inset(0% 0% 0% 0%)',
    filter: 'blur(0px) brightness(0.14) contrast(1.1) saturate(0.78) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))',
    transformOrigin: '50% 30%',
  })
  for (let i = 0; i < 3; i++) {
    const t = i * 1
    const peak = 0.55 + i * 0.28
    tl.to(
      plate,
      {
        scale: 1.16 + i * 0.03,
        filter: `blur(0px) brightness(${peak}) contrast(1.18) saturate(1.05) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))`,
        duration: 0.07,
        ease: 'power3.out',
      },
      t,
    )
    if (flash) {
      tl.fromTo(
        flash,
        { opacity: 0 },
        { opacity: 0.38 + i * 0.22, duration: 0.05, ease: 'power3.out', immediateRender: false },
        t,
      )
      tl.to(flash, { opacity: 0, duration: 0.26, ease: 'power2.in' }, t + 0.05)
    }
    if (haze) {
      tl.fromTo(
        haze,
        { opacity: 0, scale: 0.4 },
        { opacity: 0.55 + i * 0.15, scale: 4 + i * 2, duration: 0.08, ease: 'power2.out', immediateRender: false },
        t,
      )
      tl.to(haze, { opacity: 0, scale: 10 + i * 3, duration: 0.42, ease: 'power2.in' }, t + 0.08)
    }
    if (grain) {
      tl.fromTo(grain, { opacity: 0.11 }, { opacity: 0.22, duration: 0.06, ease: 'power2.out', immediateRender: false }, t)
      tl.to(grain, { opacity: 0.11, duration: 0.4, ease: 'power1.out' }, t + 0.08)
    }
    tl.to(
      plate,
      {
        scale: 1.08,
        filter: `blur(0px) brightness(${0.18 + i * 0.16}) contrast(1.08) saturate(0.86) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))`,
        duration: 0.93,
        ease: 'power1.inOut',
      },
      t + 0.07,
    )
  }
  tl.to(
    plate,
    {
      scale: 1,
      filter: CLEAN,
      duration: 0.12,
      ease: 'back.out(2.2)',
    },
    2.88,
  )
  if (flash) {
    tl.fromTo(flash, { opacity: 0 }, { opacity: 0.85, duration: 0.05, ease: 'power4.out', immediateRender: false }, 2.88)
    tl.to(flash, { opacity: 0, duration: 0.18, ease: 'power2.in' }, 2.93)
  }
}

function arm(root: Root) {
  const { a, b, fx, glow, stage } = root
  const first = frames[0]
  const second = frames[1] ?? first
  if (!first || !second) return gsap.timeline({ paused: true })

  paint(a, first)
  paint(b, second)
  rest(a, 2)
  dim(a)
  gsap.set(b, { autoAlpha: 0, zIndex: 1 })
  restFx(glow, stage, fx)

  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
    onRepeat: () => {
      paint(a, first)
      paint(b, second)
      rest(a, 2)
      dim(a)
      gsap.set(b, { autoAlpha: 0, zIndex: 1 })
      restFx(glow, stage, fx)
    },
  })

  pulse(tl, a, glow)

  let front = a
  let back = b
  let index = 0
  let t = INTRO
  const plan = slots()

  for (let i = 0; i < plan.length; i++) {
    const slot = plan[i] ?? BEAT
    const motion = slot >= BEAT ? 0.38 : 0.24
    const hold = Math.max(slot - motion, 0.04)
    const next = frames[(index + 1) % frames.length]
    if (!next) break
    const out = front
    const inn = back
    const cut = catalog[i % catalog.length]
    if (!cut) break

    tl.call(() => paint(inn, next), undefined, t)
    cut({ out, inn, fx, glow, stage, dur: motion, step: i }, tl, t)
    tl.to(
      inn,
      {
        scale: 1.1,
        yPercent: -1.4,
        duration: hold,
        ease: 'none',
      },
      t + motion,
    )

    front = inn
    back = out
    index += 1
    t += slot
  }

  if (t < INTRO + BODY) {
    const pad = { n: 0 }
    tl.to(pad, { n: 1, duration: INTRO + BODY - t, ease: 'none' }, t)
  }

  return tl
}

export async function boot(root: Root) {
  halt()
  gsap.defaults({ force3D: true })
  gsap.ticker.lagSmoothing(0)
  gsap.set([root.a, root.b], { autoAlpha: 0 })
  await warm(frames)
  master = arm(root)
  master.play(0)
}

export function halt() {
  master?.kill()
  master = null
}
