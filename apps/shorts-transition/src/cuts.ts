import gsap from 'gsap'
import { srcOf, stamp } from './frames'
import { CLEAN, HOT, RGB, SMEAR, hit, type Pair } from './fx'

export { CLEAN }
export type { Pair }

export type Cut = (pair: Pair, tl: gsap.core.Timeline, at: number) => void

function park(el: HTMLElement) {
  gsap.set(el, {
    x: 0,
    y: 0,
    z: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    autoAlpha: 0,
    filter: CLEAN,
    clipPath: 'inset(0% 0% 0% 0%)',
    transformOrigin: '50% 50%',
    zIndex: 1,
  })
}

export function rest(el: HTMLElement, z = 1) {
  gsap.set(el, {
    x: 0,
    y: 0,
    z: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    autoAlpha: 1,
    filter: CLEAN,
    clipPath: 'inset(0% 0% 0% 0%)',
    transformOrigin: '50% 50%',
    zIndex: z,
  })
}

function settle(inn: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number) {
  tl.to(
    inn,
    {
      scale: 1.04,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      x: 0,
      y: 0,
      z: 0,
      xPercent: 0,
      yPercent: 0,
      filter: CLEAN,
      duration: dur * 0.28,
      ease: 'back.out(2.4)',
    },
    at + dur * 0.72,
  )
}

function whip(pair: Pair, tl: gsap.core.Timeline, at: number, axis: 'x' | 'y', dir: number) {
  const { out, inn, dur } = pair
  const spin = 9 * dir
  const from = axis === 'x' ? { xPercent: 118 * dir, yPercent: 0 } : { yPercent: 118 * dir, xPercent: 0 }
  const leave = axis === 'x' ? { xPercent: -48 * dir, yPercent: 8 * dir } : { yPercent: -48 * dir, xPercent: 6 * dir }
  tl.set(
    inn,
    {
      ...from,
      zIndex: 3,
      autoAlpha: 1,
      scale: 1.18,
      rotation: spin,
      rotationY: 0,
      rotationX: 0,
      filter: SMEAR,
      clipPath: 'inset(0% 0% 0% 0%)',
      transformOrigin: '50% 40%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1, transformOrigin: '50% 40%' }, at)
  tl.to(
    out,
    {
      ...leave,
      scale: 1.22,
      rotation: -spin * 0.7,
      filter: SMEAR,
      duration: dur * 0.72,
      ease: 'expo.in',
    },
    at,
  )
  tl.to(
    inn,
    {
      xPercent: 0,
      yPercent: 0,
      scale: 1.08,
      rotation: 0,
      filter: RGB,
      duration: dur * 0.72,
      ease: 'expo.out',
    },
    at,
  )
  hit(pair, tl, at, 'whip', { dir, axis })
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function zoomThrough(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  tl.set(
    inn,
    {
      zIndex: 1,
      autoAlpha: 1,
      scale: 0.42,
      xPercent: 0,
      yPercent: 0,
      rotation: 0,
      rotationY: 0,
      filter: HOT,
      clipPath: 'inset(0% 0% 0% 0%)',
      transformOrigin: '50% 32%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1, transformOrigin: '50% 32%' }, at)
  tl.to(
    out,
    {
      scale: 3.4,
      autoAlpha: 0,
      filter: 'blur(18px) brightness(1.8) contrast(1.3) saturate(1.4) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))',
      duration: dur * 0.7,
      ease: 'power4.in',
    },
    at,
  )
  tl.to(
    inn,
    {
      scale: 1.12,
      filter: RGB,
      duration: dur * 0.7,
      ease: 'power3.out',
    },
    at + dur * 0.08,
  )
  hit(pair, tl, at, 'boom')
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function spinY(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      rotationY: 96,
      z: -220,
      scale: 0.86,
      xPercent: 0,
      yPercent: 0,
      filter: SMEAR,
      clipPath: 'inset(0% 0% 0% 0%)',
      transformOrigin: '50% 50%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1, transformOrigin: '50% 50%' }, at)
  tl.to(
    out,
    {
      rotationY: -95,
      z: -220,
      scale: 0.86,
      filter: SMEAR,
      duration: dur * 0.52,
      ease: 'power3.in',
    },
    at,
  )
  tl.to(
    inn,
    {
      rotationY: 0,
      z: 0,
      scale: 1.08,
      filter: RGB,
      duration: dur * 0.58,
      ease: 'power3.out',
    },
    at + dur * 0.38,
  )
  hit(pair, tl, at, 'flash')
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function cubeY(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  const dir = pair.step % 2 === 0 ? 1 : -1
  tl.set(
    out,
    {
      zIndex: 2,
      autoAlpha: 1,
      transformOrigin: dir > 0 ? '100% 50%' : '0% 50%',
    },
    at,
  )
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      rotationY: 92 * dir,
      z: -80,
      scale: 1,
      xPercent: 0,
      yPercent: 0,
      filter: SMEAR,
      clipPath: 'inset(0% 0% 0% 0%)',
      transformOrigin: dir > 0 ? '0% 50%' : '100% 50%',
    },
    at,
  )
  tl.to(
    out,
    {
      rotationY: -92 * dir,
      z: -80,
      filter: SMEAR,
      duration: dur,
      ease: 'power3.inOut',
    },
    at,
  )
  tl.to(
    inn,
    {
      rotationY: 0,
      z: 0,
      scale: 1.06,
      filter: RGB,
      duration: dur,
      ease: 'power3.inOut',
    },
    at,
  )
  hit(pair, tl, at, 'whip', { dir, axis: 'x' })
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function iris(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      scale: 1.28,
      xPercent: 0,
      yPercent: 0,
      rotation: 0,
      rotationY: 0,
      filter: HOT,
      clipPath: 'circle(0% at 50% 34%)',
      transformOrigin: '50% 34%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1 }, at)
  tl.to(
    inn,
    {
      clipPath: 'circle(160% at 50% 34%)',
      scale: 1.06,
      filter: RGB,
      duration: dur,
      ease: 'expo.out',
    },
    at,
  )
  tl.to(
    out,
    {
      scale: 1.18,
      filter: SMEAR,
      duration: dur,
      ease: 'power2.in',
    },
    at,
  )
  hit(pair, tl, at, 'boom')
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function diagonal(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      xPercent: 22,
      scale: 1.2,
      rotation: 6,
      rotationY: 0,
      filter: SMEAR,
      clipPath: 'polygon(-20% -20%, 0% -20%, 0% 0%, -20% 0%)',
      transformOrigin: '50% 50%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1 }, at)
  tl.to(
    inn,
    {
      clipPath: 'polygon(-20% -20%, 140% -20%, 120% 140%, -40% 120%)',
      xPercent: 0,
      scale: 1.08,
      rotation: 0,
      filter: RGB,
      duration: dur,
      ease: 'expo.inOut',
    },
    at,
  )
  tl.to(
    out,
    {
      xPercent: -16,
      scale: 1.12,
      rotation: -4,
      filter: SMEAR,
      duration: dur,
      ease: 'power3.in',
    },
    at,
  )
  hit(pair, tl, at, 'whip', { axis: 'x', dir: 1 })
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function glitch(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, fx, dur } = pair
  tl.call(
    () => {
      fx.replaceChildren()
      const url = srcOf(inn)
      const red = stamp(url, 'inset(0% 0% 0% 0%)')
      const cyan = stamp(url, 'inset(0% 0% 0% 0%)')
      red.style.mixBlendMode = 'screen'
      cyan.style.mixBlendMode = 'screen'
      red.style.filter = 'sepia(1) saturate(12) hue-rotate(-30deg) brightness(1.15)'
      cyan.style.filter = 'sepia(1) saturate(12) hue-rotate(150deg) brightness(1.15)'
      fx.appendChild(red)
      fx.appendChild(cyan)
      gsap.set(red, { x: -18, autoAlpha: 0.85 })
      gsap.set(cyan, { x: 18, autoAlpha: 0.85 })
      gsap.to(red, { x: 10, y: -6, duration: dur * 0.2, yoyo: true, repeat: 3, ease: 'none' })
      gsap.to(cyan, { x: -10, y: 6, duration: dur * 0.2, yoyo: true, repeat: 3, ease: 'none' })
      gsap.to([red, cyan], { autoAlpha: 0, duration: dur * 0.25, delay: dur * 0.55, ease: 'power2.out' })
    },
    undefined,
    at,
  )
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      x: -22,
      scale: 1.12,
      rotation: 0,
      rotationY: 0,
      xPercent: 0,
      yPercent: 0,
      filter: RGB,
      clipPath: 'inset(8% 40% 12% 0%)',
      transformOrigin: '50% 50%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1 }, at)
  tl.to(
    out,
    {
      x: 16,
      duration: dur * 0.06,
      ease: 'none',
      yoyo: true,
      repeat: 7,
      filter: RGB,
    },
    at,
  )
  tl.to(
    inn,
    {
      x: 0,
      scale: 1.06,
      clipPath: 'inset(0% 0% 0% 0%)',
      filter: HOT,
      duration: dur * 0.7,
      ease: 'power4.out',
    },
    at,
  )
  hit(pair, tl, at, 'glitch', { useLayer: false })
  settle(inn, tl, at, dur)
  tl.call(
    () => {
      fx.replaceChildren()
      park(out)
    },
    undefined,
    at + dur,
  )
}

function tiltSlam(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  const dir = pair.step % 2 === 0 ? 1 : -1
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      yPercent: 92 * dir,
      rotation: 18 * dir,
      scale: 1.32,
      xPercent: 12 * dir,
      rotationY: 0,
      filter: SMEAR,
      clipPath: 'inset(0% 0% 0% 0%)',
      transformOrigin: dir > 0 ? '50% 100%' : '50% 0%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1, transformOrigin: dir > 0 ? '50% 0%' : '50% 100%' }, at)
  tl.to(
    out,
    {
      yPercent: -34 * dir,
      rotation: -12 * dir,
      scale: 0.88,
      filter: SMEAR,
      duration: dur * 0.7,
      ease: 'expo.in',
    },
    at,
  )
  tl.to(
    inn,
    {
      yPercent: 0,
      xPercent: 0,
      rotation: 0,
      scale: 1.1,
      filter: HOT,
      duration: dur * 0.7,
      ease: 'expo.out',
    },
    at,
  )
  tl.to(
    inn,
    {
      x: 7 * dir,
      duration: 0.028,
      yoyo: true,
      repeat: 5,
      ease: 'none',
    },
    at + dur * 0.68,
  )
  hit(pair, tl, at, 'boom')
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function squeeze(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      scaleX: 0.04,
      scaleY: 1.18,
      scale: 1,
      xPercent: 0,
      yPercent: 0,
      rotation: 0,
      rotationY: 0,
      filter: HOT,
      clipPath: 'inset(0% 0% 0% 0%)',
      transformOrigin: '50% 50%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1, transformOrigin: '50% 50%' }, at)
  tl.to(
    out,
    {
      scaleX: 0.04,
      scaleY: 1.2,
      filter: SMEAR,
      duration: dur * 0.42,
      ease: 'power3.in',
    },
    at,
  )
  tl.to(
    inn,
    {
      scaleX: 1.08,
      scaleY: 1,
      filter: RGB,
      duration: dur * 0.58,
      ease: 'back.out(2.6)',
    },
    at + dur * 0.4,
  )
  hit(pair, tl, at, 'flash')
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

function blinds(pair: Pair, tl: gsap.core.Timeline, at: number, axis: 'x' | 'y') {
  const { out, inn, fx, dur } = pair
  const n = 11
  tl.call(
    () => {
      fx.replaceChildren()
      const url = srcOf(inn)
      const bands: HTMLElement[] = []
      for (let i = 0; i < n; i++) {
        const start = (i / n) * 100
        const end = (1 - (i + 1) / n) * 100
        const clip =
          axis === 'y'
            ? `inset(${start}% 0% ${end}% 0%)`
            : `inset(0% ${end}% 0% ${start}%)`
        const el = stamp(url, clip)
        const odd = i % 2 === 0 ? -1 : 1
        if (axis === 'y') gsap.set(el, { xPercent: 130 * odd, rotation: 8 * odd, filter: SMEAR, autoAlpha: 1 })
        else gsap.set(el, { yPercent: 130 * odd, rotation: 6 * odd, filter: SMEAR, autoAlpha: 1 })
        fx.appendChild(el)
        bands.push(el)
      }
      gsap.set(out, {
        zIndex: 1,
        autoAlpha: 1,
        filter: SMEAR,
      })
      gsap.set(inn, { autoAlpha: 0 })
      gsap.to(bands, {
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        filter: CLEAN,
        duration: dur * 0.72,
        ease: 'back.out(1.6)',
        stagger: dur * 0.018,
      })
      gsap.to(out, { autoAlpha: 0, duration: dur * 0.55, ease: 'power2.in' })
    },
    undefined,
    at,
  )
  hit(pair, tl, at, 'whip', { useLayer: false, axis })
  tl.call(
    () => {
      fx.replaceChildren()
      rest(inn, 2)
      gsap.set(inn, { scale: 1.04, filter: CLEAN })
      park(out)
    },
    undefined,
    at + dur,
  )
}

function shatter(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, fx, dur } = pair
  tl.call(
    () => {
      fx.replaceChildren()
      const url = srcOf(out)
      const shards: HTMLElement[] = []
      const cols = 4
      const rows = 6
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const top = (r / rows) * 100
          const bottom = (1 - (r + 1) / rows) * 100
          const left = (c / cols) * 100
          const right = (1 - (c + 1) / cols) * 100
          const el = stamp(url, `inset(${top}% ${right}% ${bottom}% ${left}%)`)
          fx.appendChild(el)
          shards.push(el)
        }
      }
      gsap.set(out, { autoAlpha: 0 })
      gsap.set(inn, {
        zIndex: 1,
        autoAlpha: 1,
        scale: 1.45,
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        rotationY: 0,
        filter: HOT,
        clipPath: 'inset(0% 0% 0% 0%)',
        transformOrigin: '50% 32%',
      })
      gsap.to(shards, {
        x: () => gsap.utils.random(-340, 340),
        y: () => gsap.utils.random(-520, 520),
        rotation: () => gsap.utils.random(-70, 70),
        scale: () => gsap.utils.random(0.35, 1.2),
        autoAlpha: 0,
        filter: SMEAR,
        duration: dur * 0.88,
        ease: 'power3.in',
        stagger: { each: dur * 0.012, from: 'center' },
      })
      gsap.to(inn, {
        scale: 1.06,
        filter: RGB,
        duration: dur * 0.8,
        ease: 'power3.out',
      })
    },
    undefined,
    at,
  )
  hit(pair, tl, at, 'boom', { useLayer: false })
  tl.call(
    () => {
      fx.replaceChildren()
      rest(inn, 2)
      gsap.set(inn, { scale: 1.04, filter: CLEAN })
      park(out)
    },
    undefined,
    at + dur,
  )
}

function bloom(pair: Pair, tl: gsap.core.Timeline, at: number) {
  const { out, inn, dur } = pair
  tl.set(
    inn,
    {
      zIndex: 3,
      autoAlpha: 1,
      scale: 1.45,
      xPercent: 0,
      yPercent: 0,
      rotation: 0,
      rotationY: 0,
      filter: HOT,
      clipPath: 'inset(18% 18% 18% 18%)',
      transformOrigin: '50% 36%',
    },
    at,
  )
  tl.set(out, { zIndex: 2, autoAlpha: 1, transformOrigin: '50% 36%' }, at)
  tl.to(
    out,
    {
      scale: 0.78,
      autoAlpha: 0,
      filter: SMEAR,
      duration: dur * 0.65,
      ease: 'power3.in',
    },
    at,
  )
  tl.to(
    inn,
    {
      scale: 1.08,
      clipPath: 'inset(0% 0% 0% 0%)',
      filter: RGB,
      duration: dur * 0.75,
      ease: 'back.out(1.8)',
    },
    at,
  )
  hit(pair, tl, at, 'boom')
  settle(inn, tl, at, dur)
  tl.call(() => park(out), undefined, at + dur)
}

export const catalog: Cut[] = [
  (p, tl, at) => whip(p, tl, at, 'x', 1),
  bloom,
  (p, tl, at) => whip(p, tl, at, 'y', 1),
  zoomThrough,
  glitch,
  spinY,
  cubeY,
  (p, tl, at) => blinds(p, tl, at, 'y'),
  iris,
  diagonal,
  shatter,
  tiltSlam,
  squeeze,
  (p, tl, at) => whip(p, tl, at, 'x', -1),
  (p, tl, at) => whip(p, tl, at, 'y', -1),
  (p, tl, at) => blinds(p, tl, at, 'x'),
]
