import { useRef } from 'react'
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion'

export type Side = 'left' | 'right'

export type PullField = {
  /** 0 = buraco fechado, 1 = escancarado. Um por lado. */
  left: MotionValue<number>
  right: MotionValue<number>
}

/**
 * Abertura dos dois buracos negros. Só a troca de categoria abre um deles — em
 * repouso ficam fechados, para não competirem com as cartas pela atenção.
 *
 * O alvo do voo mora numa ref porque o `AnimatePresence` congela as props do
 * elemento que está saindo: a carta que sai foi renderizada com o alvo da
 * transição ANTERIOR e voaria para o lado errado. A ref é o mesmo objeto nos
 * dois renders, então basta escrever nela antes de trocar de categoria.
 */
export function usePortalPull() {
  const rawL = useMotionValue(0)
  const rawR = useMotionValue(0)
  // Abre com pressa: o buraco tem de estar escancarado antes da primeira carta
  // chegar nele.
  const left = useSpring(rawL, { stiffness: 190, damping: 24 })
  const right = useSpring(rawR, { stiffness: 190, damping: 24 })

  /** Alvo do voo, em coordenadas locais do leque. Lido no instante da saída. */
  const target = useRef({ x: 0, y: 0 })

  const open = (side: Side | null) => {
    rawL.set(side === 'left' ? 1 : 0)
    rawR.set(side === 'right' ? 1 : 0)
  }

  return { field: { left, right } as PullField, target, open }
}
