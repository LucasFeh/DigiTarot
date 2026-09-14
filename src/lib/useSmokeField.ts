import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion'
import type { PointerEvent as ReactPointerEvent } from 'react'

/** Folga ao redor do retrato onde o cursor ainda mexe na fumaça (%). */
const MARGIN = { x: 26, top: 20, bottom: 40 }

export type SmokeField = {
  /** Posição do cursor em % da caixa do retrato. */
  x: MotionValue<number>
  y: MotionValue<number>
  /** 0 = cursor longe, 1 = cursor dentro da fumaça. */
  strength: MotionValue<number>
  /** Largura da caixa em px — converte os % do cálculo em pixels. */
  width: MotionValue<number>
}

/**
 * Liga o ponteiro à fumaça. O `ref` vai na caixa do retrato (é a régua dos
 * cálculos) e os handlers num elemento maior — assim o cursor já começa a abrir
 * a fumaça antes de chegar na ilustração.
 */
export function useSmokeField() {
  const ref = useRef<HTMLDivElement>(null)
  const rect = useRef<DOMRect | null>(null)
  const x = useMotionValue(50)
  const y = useMotionValue(50)
  const width = useMotionValue(0)
  const raw = useMotionValue(0)
  const strength = useSpring(raw, { stiffness: 55, damping: 20 })

  // O retângulo fica em cache: medir a cada pointermove forçaria um reflow
  // síncrono por quadro, e as animações da página deixam o layout sujo o tempo
  // todo. Rolagem e redimensionamento são os únicos eventos que o invalidam.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      rect.current = el.getBoundingClientRect()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const onPointerMove = (e: ReactPointerEvent) => {
    const r = rect.current
    if (!r?.width) return
    const nx = ((e.clientX - r.left) / r.width) * 100
    const ny = ((e.clientY - r.top) / r.height) * 100
    width.set(r.width)
    x.set(nx)
    y.set(ny)
    raw.set(
      nx > -MARGIN.x && nx < 100 + MARGIN.x && ny > -MARGIN.top && ny < 100 + MARGIN.bottom ? 1 : 0,
    )
  }

  const onPointerLeave = () => raw.set(0)

  /** Foco por teclado no link do rosto também abre a fumaça. */
  const setActive = (on: boolean) => raw.set(on ? 1 : 0)

  return { ref, field: { x, y, strength, width } as SmokeField, onPointerMove, onPointerLeave, setActive }
}
