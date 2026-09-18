const packed = import.meta.glob<string>('./assets/images/*.{jpeg,jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const frames: string[] = Object.keys(packed)
  .sort((a, b) => a.localeCompare(b))
  .map((key) => packed[key])
  .filter((url): url is string => typeof url === 'string')

export function paint(plate: HTMLElement, url: string) {
  const img = plate.querySelector('img')
  if (img) img.src = url
}

export function srcOf(plate: HTMLElement): string {
  const img = plate.querySelector('img')
  return img?.currentSrc || img?.src || ''
}

export function stamp(url: string, clip = 'inset(0% 0% 0% 0%)', className = 'plate'): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = className
  wrap.style.clipPath = clip
  const img = document.createElement('img')
  img.src = url
  img.alt = ''
  img.draggable = false
  wrap.appendChild(img)
  return wrap
}

export function warm(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = url
        }),
    ),
  ).then(() => undefined)
}
