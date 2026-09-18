import gsap from 'gsap'
import { srcOf, stamp } from './frames'

export const CLEAN =
  'blur(0px) brightness(1) contrast(1.04) saturate(1.06) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))'

export const RGB =
  'blur(1.2px) brightness(1.28) contrast(1.45) saturate(1.7) drop-shadow(16px 0px 0px rgba(255,36,92,0.82)) drop-shadow(-16px 0px 0px rgba(0,228,255,0.82))'

export const SMEAR =
  'blur(12px) brightness(1.22) contrast(1.2) saturate(1.25) drop-shadow(10px 0px 0px rgba(255,40,80,0.5)) drop-shadow(-10px 0px 0px rgba(0,220,255,0.5))'

export const HOT =
  'blur(0px) brightness(1.85) contrast(1.4) saturate(1.15) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))'

const WHITE =
  'blur(0px) brightness(2.35) contrast(1.65) saturate(0.28) drop-shadow(0px 0px 0px rgba(255,40,80,0)) drop-shadow(0px 0px 0px rgba(0,220,255,0))'

export type Kind = 'flash' | 'whip' | 'boom' | 'glitch'

export type Pair = {
  out: HTMLElement
  inn: HTMLElement
  fx: HTMLElement
  glow: HTMLElement
  stage: HTMLElement
  dur: number
  step: number
}

type Extra = {
  dir?: number
  axis?: 'x' | 'y'
  useLayer?: boolean
}

function q(root: HTMLElement, sel: string) {
  return root.querySelector<HTMLElement>(sel)
}

function ring(root: HTMLElement, sel: string) {
  return root.querySelector<HTMLElement>(sel)
}

export function restFx(glow: HTMLElement, stage: HTMLElement, fx?: HTMLElement) {
  gsap.set(stage, { x: 0, y: 0, rotation: 0 })
  gsap.set(glow.querySelectorAll('.flash, .wash, .haze, .leak, .flare, .streak, .scan, .sparks i'), {
    opacity: 0,
    x: 0,
    y: 0,
    xPercent: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  })
  gsap.set(glow.querySelectorAll('.flare .bar, .flare .core, .flare .orb'), {
    opacity: 0,
    scale: 1,
    scaleX: 1,
    x: 0,
  })
  const grain = q(glow, '.grain')
  if (grain) gsap.set(grain, { opacity: 0.11 })
  const vig = q(glow, '.vignette')
  if (vig) gsap.set(vig, { opacity: 0.88 })
  ;['.shock-disc', '.shock-k', '.shock-m', '.shock-c', '.shock-w', '.shock-echo'].forEach((sel) => {
    const el = ring(glow, sel)
    if (!el) return
    gsap.set(el, {
      opacity: 0,
      width: 18,
      height: 18,
      xPercent: -50,
      yPercent: -50,
      x: 0,
      borderWidth: 5,
    })
  })
  if (fx) {
    fx.querySelectorAll('.ghost, .ripple, .chroma').forEach((el) => gsap.killTweensOf(el))
    fx.replaceChildren()
  }
}

function shake(stage: HTMLElement, tl: gsap.core.Timeline, at: number, amp: number) {
  const seq = [1, -0.82, 0.64, -0.48, 0.3, -0.16, 0.07, 0]
  seq.forEach((s, i) => {
    tl.to(
      stage,
      {
        x: amp * s,
        y: amp * s * -0.62,
        rotation: s * 0.32,
        duration: 0.026,
        ease: 'none',
      },
      at + i * 0.026,
    )
  })
  tl.set(stage, { x: 0, y: 0, rotation: 0 }, at + seq.length * 0.026)
}

function maskRing(r: number, w: number) {
  const inner = Math.max(r - w, 0)
  return `radial-gradient(circle at 50% 32%, transparent ${inner}%, #fff ${r}%, transparent ${r + w}%)`
}

function spawnRipple(fx: HTMLElement, url: string, dur: number) {
  const hot = stamp(url, 'inset(0% 0% 0% 0%)', 'plate ripple')
  const chroma = stamp(url, 'inset(0% 0% 0% 0%)', 'plate ripple chroma')
  const dark = stamp(url, 'inset(0% 0% 0% 0%)', 'plate ripple dark')
  hot.style.mixBlendMode = 'screen'
  chroma.style.mixBlendMode = 'screen'
  dark.style.mixBlendMode = 'multiply'
  gsap.set(hot, {
    scale: 1.08,
    filter: 'brightness(1.7) contrast(1.35) saturate(1.3)',
    autoAlpha: 1,
    transformOrigin: '50% 32%',
  })
  gsap.set(chroma, {
    scale: 1.16,
    x: 8,
    filter: 'brightness(1.35) contrast(1.2) saturate(2) hue-rotate(-20deg)',
    autoAlpha: 0.85,
    transformOrigin: '50% 32%',
  })
  gsap.set(dark, { scale: 1.04, filter: 'brightness(0.35) contrast(1.4)', autoAlpha: 0.9, transformOrigin: '50% 32%' })
  fx.append(dark, hot, chroma)
  const st = { r: 0, w: 16 }
  gsap.to(st, {
    r: 82,
    w: 4.5,
    duration: dur * 0.95,
    ease: 'power2.out',
    onUpdate: () => {
      hot.style.webkitMaskImage = maskRing(st.r, st.w)
      hot.style.maskImage = maskRing(st.r, st.w)
      chroma.style.webkitMaskImage = maskRing(st.r + 3.5, st.w * 0.75)
      chroma.style.maskImage = maskRing(st.r + 3.5, st.w * 0.75)
      dark.style.webkitMaskImage = maskRing(Math.max(st.r - 6, 0), st.w * 1.35)
      dark.style.maskImage = maskRing(Math.max(st.r - 6, 0), st.w * 1.35)
    },
  })
  gsap.to([hot, chroma], { autoAlpha: 0, duration: dur * 0.28, delay: dur * 0.62, ease: 'power2.in' })
  gsap.to(dark, { autoAlpha: 0, duration: dur * 0.35, delay: dur * 0.5, ease: 'power2.in' })
}

function spawnGhosts(fx: HTMLElement, url: string, axis: 'x' | 'y', dir: number, dur: number) {
  const nodes: HTMLElement[] = []
  for (let i = 0; i < 4; i++) {
    const el = stamp(url, 'inset(0% 0% 0% 0%)', 'plate ghost')
    const along = (i + 1) * 11 * dir
    const drift = axis === 'x' ? { xPercent: along, yPercent: along * 0.12 } : { yPercent: along, xPercent: along * 0.08 }
    el.style.mixBlendMode = i % 2 === 0 ? 'screen' : 'lighten'
    gsap.set(el, {
      ...drift,
      autoAlpha: 0.42 - i * 0.08,
      scale: 1.04 + i * 0.03,
      rotation: (i + 1) * 1.6 * dir,
      filter: `blur(${3 + i * 4}px) brightness(1.25) saturate(${1.4 + i * 0.2})`,
      transformOrigin: '50% 36%',
    })
    fx.appendChild(el)
    nodes.push(el)
  }
  gsap.to(nodes, {
    autoAlpha: 0,
    xPercent: axis === 'x' ? `+=${28 * dir}` : undefined,
    yPercent: axis === 'y' ? `+=${28 * dir}` : undefined,
    scale: 1.22,
    duration: dur * 0.7,
    stagger: dur * 0.04,
    ease: 'power3.out',
  })
}

function spawnChroma(fx: HTMLElement, url: string, dur: number) {
  const red = stamp(url, 'inset(0% 0% 0% 0%)', 'plate chroma')
  const cyan = stamp(url, 'inset(0% 0% 0% 0%)', 'plate chroma')
  red.style.mixBlendMode = 'screen'
  cyan.style.mixBlendMode = 'screen'
  red.style.filter = 'sepia(1) saturate(14) hue-rotate(-28deg) brightness(1.2)'
  cyan.style.filter = 'sepia(1) saturate(14) hue-rotate(152deg) brightness(1.2)'
  gsap.set(red, { x: -20, y: -4, autoAlpha: 0.78 })
  gsap.set(cyan, { x: 20, y: 4, autoAlpha: 0.78 })
  fx.append(red, cyan)
  gsap.to(red, { x: 8, y: 3, duration: dur * 0.18, yoyo: true, repeat: 3, ease: 'none' })
  gsap.to(cyan, { x: -8, y: -3, duration: dur * 0.18, yoyo: true, repeat: 3, ease: 'none' })
  gsap.to([red, cyan], { autoAlpha: 0, duration: dur * 0.22, delay: dur * 0.48, ease: 'power2.out' })
}

function shock(glow: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number) {
  const disc = ring(glow, '.shock-disc')
  const dark = ring(glow, '.shock-k')
  const mag = ring(glow, '.shock-m')
  const cyan = ring(glow, '.shock-c')
  const white = ring(glow, '.shock-w')
  const echo = ring(glow, '.shock-echo')
  const haze = q(glow, '.haze')

  if (haze) {
    tl.fromTo(
      haze,
      { opacity: 0, scale: 0.18 },
      { opacity: 0.95, scale: 1.6, duration: dur * 0.1, ease: 'power3.out', immediateRender: false },
      at,
    )
    tl.to(haze, { opacity: 0, scale: 18, duration: dur * 0.72, ease: 'power2.out' }, at + dur * 0.1)
  }

  const pop = dur * 0.22
  const wash = dur * 0.7

  const fire = (
    el: HTMLElement | null,
    from: { s: number; sw: number; op: number; x?: number },
    mid: { s: number; sw: number; op: number; x?: number },
    to: { s: number; sw: number; op: number; x?: number },
    delay: number,
  ) => {
    if (!el) return
    tl.fromTo(
      el,
      {
        opacity: from.op,
        width: from.s,
        height: from.s,
        borderWidth: from.sw,
        xPercent: -50,
        yPercent: -50,
        x: from.x ?? 0,
      },
      {
        opacity: mid.op,
        width: mid.s,
        height: mid.s * 0.92,
        borderWidth: mid.sw,
        x: mid.x ?? 0,
        duration: pop,
        ease: 'power4.out',
        immediateRender: false,
      },
      at + delay,
    )
    tl.to(
      el,
      {
        opacity: to.op,
        width: to.s,
        height: to.s * 0.9,
        borderWidth: to.sw,
        x: to.x ?? 0,
        duration: wash,
        ease: 'power2.out',
      },
      at + delay + pop,
    )
  }

  fire(disc, { s: 22, sw: 0, op: 0.95 }, { s: 160, sw: 0, op: 0.7 }, { s: 340, sw: 0, op: 0 }, 0)
  fire(dark, { s: 28, sw: 10, op: 0.45 }, { s: 190, sw: 7, op: 0.28 }, { s: 430, sw: 2, op: 0 }, 0.01)
  fire(mag, { s: 16, sw: 6, op: 1, x: -7 }, { s: 200, sw: 3.2, op: 0.85, x: -10 }, { s: 470, sw: 0.8, op: 0, x: -14 }, 0.01)
  fire(cyan, { s: 22, sw: 5, op: 0.95, x: 8 }, { s: 220, sw: 2.6, op: 0.8, x: 12 }, { s: 500, sw: 0.7, op: 0, x: 16 }, 0.02)
  fire(white, { s: 18, sw: 7, op: 1 }, { s: 210, sw: 3, op: 1 }, { s: 480, sw: 0.6, op: 0 }, 0)
  fire(echo, { s: 40, sw: 2.2, op: 0 }, { s: 260, sw: 1.6, op: 0.75 }, { s: 560, sw: 0.4, op: 0 }, dur * 0.18)
}

function sparks(glow: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number, step: number) {
  const nodes = glow.querySelectorAll<HTMLElement>('.sparks i')
  const n = nodes.length
  nodes.forEach((el, i) => {
    const ang = (i / Math.max(n, 1)) * Math.PI * 2 + step * 0.41
    const dist = 90 + (i % 5) * 38 + (step % 3) * 12
    const deg = (ang * 180) / Math.PI + 90
    tl.fromTo(
      el,
      { opacity: 0.95, x: 0, y: 0, scaleY: 0.35, scaleX: 1, rotation: deg },
      {
        opacity: 0,
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist * 1.25,
        scaleY: 2.4,
        duration: dur * (0.55 + (i % 3) * 0.08),
        ease: 'power3.out',
        immediateRender: false,
      },
      at + (i % 5) * 0.008,
    )
  })
}

function flare(glow: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number, heavy: boolean) {
  const root = q(glow, '.flare')
  const bar = q(glow, '.flare .bar')
  const core = q(glow, '.flare .core')
  const orbs = glow.querySelectorAll<HTMLElement>('.flare .orb')
  if (!root || !bar || !core) return
  const peak = heavy ? 1 : 0.62
  tl.fromTo(root, { opacity: 0 }, { opacity: peak, duration: dur * 0.08, ease: 'power3.out', immediateRender: false }, at + dur * 0.06)
  tl.fromTo(
    bar,
    { scaleX: 0.12, opacity: 0.3 },
    { scaleX: 1.18, opacity: 1, duration: dur * 0.2, ease: 'power3.out', immediateRender: false },
    at + dur * 0.06,
  )
  tl.fromTo(
    core,
    { scale: 0.2, opacity: 0.4 },
    { scale: 1.4, opacity: 1, duration: dur * 0.12, ease: 'power2.out', immediateRender: false },
    at + dur * 0.06,
  )
  orbs.forEach((orb, i) => {
    tl.fromTo(
      orb,
      { opacity: 0, scale: 0.4 },
      { opacity: 0.8 - i * 0.18, scale: 1, duration: dur * 0.16, ease: 'power2.out', immediateRender: false },
      at + dur * 0.08 + i * 0.02,
    )
    tl.to(orb, { opacity: 0, scale: 1.3, duration: dur * 0.4, ease: 'power2.in' }, at + dur * 0.32 + i * 0.02)
  })
  tl.to(bar, { scaleX: 1.4, opacity: 0, duration: dur * 0.5, ease: 'power2.in' }, at + dur * 0.28)
  tl.to(core, { scale: 0.3, opacity: 0, duration: dur * 0.4, ease: 'power2.in' }, at + dur * 0.28)
  tl.to(root, { opacity: 0, duration: dur * 0.35, ease: 'power2.in' }, at + dur * 0.5)
}

function leak(glow: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number, dir: number) {
  const el = q(glow, '.leak')
  if (!el) return
  tl.set(el, { xPercent: dir > 0 ? 28 : -28, rotation: dir > 0 ? 8 : -8 }, at)
  tl.fromTo(el, { opacity: 0 }, { opacity: 0.85, duration: dur * 0.14, ease: 'power2.out', immediateRender: false }, at)
  tl.to(el, { xPercent: dir > 0 ? -18 : 18, opacity: 0, duration: dur * 0.86, ease: 'power2.in' }, at + dur * 0.14)
}

function streak(glow: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number, dir: number) {
  const el = q(glow, '.streak')
  if (!el) return
  tl.fromTo(
    el,
    { xPercent: dir > 0 ? -160 : 160, opacity: 0.95, rotation: 12 * dir },
    {
      xPercent: dir > 0 ? 170 : -170,
      opacity: 0,
      rotation: 16 * dir,
      duration: dur * 0.72,
      ease: 'power3.in',
      immediateRender: false,
    },
    at,
  )
}

function flashWash(glow: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number, kind: Kind) {
  const flash = q(glow, '.flash')
  const wash = q(glow, '.wash')
  const grain = q(glow, '.grain')
  const vig = q(glow, '.vignette')
  const scan = q(glow, '.scan')
  const colors: Record<Kind, string> = {
    boom: '#ff5a32',
    whip: '#7ad7ff',
    flash: '#ffe4cc',
    glitch: '#ff3d9a',
  }
  if (wash) {
    tl.set(wash, { backgroundColor: colors[kind] }, at)
    tl.fromTo(wash, { opacity: 0.5 }, { opacity: 0, duration: dur * 0.5, ease: 'power2.out', immediateRender: false }, at)
  }
  if (flash) {
    const peak = kind === 'boom' ? 0.92 : kind === 'glitch' ? 0.55 : 0.72
    tl.fromTo(
      flash,
      { opacity: 0 },
      { opacity: peak, duration: dur * 0.06, ease: 'power4.out', immediateRender: false },
      at + dur * 0.08,
    )
    tl.to(flash, { opacity: 0, duration: dur * 0.32, ease: 'power2.in' }, at + dur * 0.14)
  }
  if (grain) {
    tl.fromTo(grain, { opacity: 0.11 }, { opacity: 0.28, duration: dur * 0.1, ease: 'power2.out', immediateRender: false }, at)
    tl.to(grain, { opacity: 0.11, duration: dur * 0.55, ease: 'power1.out' }, at + dur * 0.12)
  }
  if (vig) {
    tl.fromTo(vig, { opacity: 0.88 }, { opacity: 1, duration: dur * 0.12, ease: 'power2.out', immediateRender: false }, at)
    tl.to(vig, { opacity: 0.88, duration: dur * 0.55, ease: 'power1.out' }, at + dur * 0.14)
  }
  if (kind === 'glitch' && scan) {
    tl.fromTo(
      scan,
      { opacity: 0, yPercent: -8 },
      { opacity: 0.7, yPercent: 6, duration: dur * 0.18, ease: 'none', immediateRender: false },
      at,
    )
    tl.to(scan, { opacity: 0, yPercent: 14, duration: dur * 0.5, ease: 'power1.in' }, at + dur * 0.22)
  }
}

function impact(inn: HTMLElement, tl: gsap.core.Timeline, at: number, dur: number) {
  tl.set(inn, { filter: WHITE }, at + dur * 0.07)
  tl.set(inn, { filter: RGB }, at + dur * 0.07 + 0.045)
}

function clearLayer(fx: HTMLElement) {
  fx.querySelectorAll('.ghost, .ripple, .chroma').forEach((el) => {
    gsap.killTweensOf(el)
    el.remove()
  })
}

export function hit(pair: Pair, tl: gsap.core.Timeline, at: number, kind: Kind, extra: Extra = {}) {
  const { glow, stage, fx, out, inn, dur, step } = pair
  const dir = extra.dir ?? (step % 2 === 0 ? 1 : -1)
  const axis = extra.axis ?? 'x'
  const useLayer = extra.useLayer ?? true
  const amp = kind === 'boom' ? 11 : kind === 'whip' ? 7 : kind === 'glitch' ? 9 : 5

  flashWash(glow, tl, at, dur, kind)
  shake(stage, tl, at + dur * 0.08, amp)

  if (kind === 'boom') {
    shock(glow, tl, at, dur)
    sparks(glow, tl, at + dur * 0.05, dur, step)
    flare(glow, tl, at, dur, true)
    impact(inn, tl, at, dur)
    if (useLayer) {
      tl.call(
        () => {
          const url = srcOf(inn)
          if (url) spawnRipple(fx, url, dur)
        },
        undefined,
        at,
      )
    }
  }

  if (kind === 'whip') {
    flare(glow, tl, at, dur, false)
    leak(glow, tl, at, dur, dir)
    streak(glow, tl, at, dur, dir)
    if (useLayer) {
      tl.call(
        () => {
          const url = srcOf(out)
          if (url) spawnGhosts(fx, url, axis, dir, dur)
        },
        undefined,
        at,
      )
    }
  }

  if (kind === 'flash') {
    flare(glow, tl, at, dur, false)
    if (useLayer) {
      tl.call(
        () => {
          const url = srcOf(inn)
          if (url) spawnChroma(fx, url, dur)
        },
        undefined,
        at,
      )
    }
  }

  if (kind === 'glitch') {
    flare(glow, tl, at, dur, false)
  }

  if (useLayer) tl.call(() => clearLayer(fx), undefined, at + dur)
}
