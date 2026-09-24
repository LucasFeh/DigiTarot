import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  /** Brilho base 0..1 */
  a: number
  /** Velocidade e fase do cintilar */
  tw: number
  phase: number
  /** Profundidade — controla o quanto a estrela desliza (parallax). */
  depth: number
  hue: string
}

const HUES = ['#ffffff', '#ffffff', '#ffffff', '#dfe6ff', '#ffe4f6', '#cfd9ff', '#f7d9ff']

/**
 * Campo de estrelas em canvas. Reproduz o granulado da textura de nebulosa:
 * muitas estrelas minúsculas, algumas médias e poucas grandes com halo.
 */
export default function Starfield({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stars: Star[] = []
    let raf = 0
    let w = 0
    let h = 0
    let pixelRatio = 0
    let lastFrame = 0

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === w && height === h && dpr === pixelRatio) return
      w = width
      h = height
      pixelRatio = dpr
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.round(((w * h) / 5200) * density)
      stars = Array.from({ length: count }, () => {
        const roll = Math.random()
        // 78% minúsculas, 18% médias, 4% grandes com halo
        const r = roll > 0.96 ? 1.5 + Math.random() * 1.4 : roll > 0.78 ? 0.9 + Math.random() * 0.5 : 0.3 + Math.random() * 0.5
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          a: 0.35 + Math.random() * 0.65,
          tw: 0.0004 + Math.random() * 0.0016,
          phase: Math.random() * Math.PI * 2,
          depth: 0.25 + Math.random() * 0.75,
          hue: HUES[Math.floor(Math.random() * HUES.length)],
        }
      })
    }

    const draw = (t: number) => {
      if (!reduced) {
        raf = requestAnimationFrame(draw)
        // The stars move only a few pixels per second. Updating at 30 fps
        // looks the same while halving full-screen canvas work.
        if (t - lastFrame < 1000 / 30 - 1) return
        lastFrame = t
      }
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * s.tw + s.phase)
        // Deriva lentíssima para a esquerda, mais rápida nas estrelas "próximas"
        const drift = reduced ? 0 : (t * 0.0045 * s.depth) % (w + 40)
        const x = (s.x - drift + w + 40) % (w + 40)
        const alpha = s.a * twinkle

        if (s.r > 1.4) {
          const halo = ctx.createRadialGradient(x, s.y, 0, x, s.y, s.r * 5)
          halo.addColorStop(0, `${s.hue}${Math.round(alpha * 120).toString(16).padStart(2, '0')}`)
          halo.addColorStop(1, '#00000000')
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(x, s.y, s.r * 5, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.globalAlpha = alpha
        ctx.fillStyle = s.hue
        ctx.beginPath()
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    build()
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (document.hidden) return
      lastFrame = 0
      raf = requestAnimationFrame(draw)
    }
    onVisibility()

    const ro = new ResizeObserver(() => {
      const oldW = w
      const oldH = h
      const oldDpr = pixelRatio
      build()
      if (reduced && (oldW !== w || oldH !== h || oldDpr !== pixelRatio)) draw(0)
    })
    ro.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density])

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />
}
