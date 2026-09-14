import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion'

/** Distância (px) da borda da zona em que o portal começa a se abrir. */
const REACH = 340
/** Abertura máxima só por aproximação — em cima da zona vai a 1. */
const NEAR_MAX = 0.72

export type Side = 'left' | 'right'

export type SuctionField = {
  /** 0 = fechado, 1 = cursor em cima da zona (ou transição forçada). Com mola. */
  left: MotionValue<number>
  right: MotionValue<number>
  /**
   * Maior dos dois valores CRUS, sem mola. Serve para decisões instantâneas —
   * o hover de uma carta precisa saber "há sucção?" no mesmo evento em que o
   * cursor chegou, e a mola ainda estaria perto de zero.
   */
  raw: MotionValue<number>
}

/**
 * Liga o ponteiro aos dois portais. Chegar perto abre o portal até `NEAR_MAX`
 * e já começa a puxar as cartas; entrar na zona abre por completo. As cartas só
 * atravessam quando o portal é clicado — aí `force` trava a abertura em 1 até a
 * troca terminar, independente de onde o ponteiro esteja.
 */
export function useSuctionField() {
  const zoneL = useRef<HTMLButtonElement>(null)
  const zoneR = useRef<HTMLButtonElement>(null)
  const rects = useRef<{ l: DOMRect | null; r: DOMRect | null }>({ l: null, r: null })
  const enabled = useRef(true)
  const forced = useRef<Side | null>(null)

  const rawL = useMotionValue(0)
  const rawR = useMotionValue(0)
  const raw = useMotionValue(0)
  const left = useSpring(rawL, { stiffness: 110, damping: 22 })
  const right = useSpring(rawR, { stiffness: 110, damping: 22 })

  const setRaw = (l: number, r: number) => {
    rawL.set(l)
    rawR.set(r)
    raw.set(Math.max(l, r))
  }

  // Retângulos em cache: medir a cada pointermove forçaria reflow por quadro.
  useEffect(() => {
    const measure = () => {
      rects.current = {
        l: zoneL.current?.getBoundingClientRect() ?? null,
        r: zoneR.current?.getBoundingClientRect() ?? null,
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (zoneL.current) ro.observe(zoneL.current)
    if (zoneR.current) ro.observe(zoneR.current)
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const pullFor = (r: DOMRect | null, x: number, y: number) => {
    if (!r) return 0
    // Distância até a borda mais próxima do retângulo (0 = dentro).
    const dx = Math.max(r.left - x, 0, x - r.right)
    const dy = Math.max(r.top - y, 0, y - r.bottom)
    const d = Math.hypot(dx, dy)
    if (d === 0) return 1
    const t = Math.max(0, 1 - d / REACH)
    // Expoente 1.5: começa de mansinho, mas já é visível a meio caminho.
    return Math.pow(t, 1.5) * NEAR_MAX
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (forced.current || !enabled.current) return
    setRaw(pullFor(rects.current.l, e.clientX, e.clientY), pullFor(rects.current.r, e.clientX, e.clientY))
  }

  const onPointerLeave = () => {
    if (forced.current) return
    setRaw(0, 0)
  }

  /** Trava um lado aberto (ou solta os dois com `null`). */
  const force = (side: Side | null) => {
    forced.current = side
    setRaw(side === 'left' ? 1 : 0, side === 'right' ? 1 : 0)
  }

  /** Fora de `idle` o ponteiro não mexe nos portais. */
  const setEnabled = (on: boolean) => {
    enabled.current = on
    if (!on && !forced.current) setRaw(0, 0)
  }

  return {
    zoneL,
    zoneR,
    field: { left, right, raw } as SuctionField,
    onPointerMove,
    onPointerLeave,
    force,
    setEnabled,
  }
}
