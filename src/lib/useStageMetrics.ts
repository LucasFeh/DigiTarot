import { useEffect, useState } from 'react'
import { CARD_H } from '../components/CardVisual'

/** Distância, em px, do topo do leque até a base da carta central (escala 1). */
const CARD_BOTTOM = 285
/** Respiro mínimo entre a carta destacada e o topo do palco. */
const TOP_GAP = 14
/**
 * Teto de largura do palco. Bem alto de propósito: com um teto baixo, em telas
 * largas sobrava faixa vazia dos lados e o `overflow-hidden` cortava a fumaça
 * do portal numa linha reta no meio da viewport.
 */
const MAX_STAGE = 2600

type Base = {
  height: number
  fanScale: number
  spread: number
  /**
   * Quanto a carta cresce ao ser revelada. Em telas pequenas ela precisa crescer
   * bem mais, senão o texto do plano fica ilegível dentro do leque reduzido.
   */
  activeScale: number
  /** Quanto a carta sobe ao ser revelada, em px antes do fanScale. */
  activeLift: number
}

export type StageMetrics = Base & {
  /** Largura renderizada do palco, em px. */
  stageWidth: number
  /** Distância do topo do palco até o topo das cartas. */
  fanTop: number
  /** Diâmetro do círculo mágico (o container é quadrado). */
  circleWidth: number
  /** Centro do círculo, em px a partir do topo do palco. */
  circleCenterY: number
  /** Centro e altura da fenda lateral. */
  portalCenterY: number
  portalHeight: number
}

function baseFor(w: number): Base {
  if (w >= 1280) return { height: 640, fanScale: 1, spread: 66, activeScale: 1.08, activeLift: 62 }
  if (w >= 1024) return { height: 610, fanScale: 0.9, spread: 62, activeScale: 1.12, activeLift: 68 }
  if (w >= 768) return { height: 560, fanScale: 0.76, spread: 56, activeScale: 1.25, activeLift: 80 }
  if (w >= 560) return { height: 505, fanScale: 0.62, spread: 50, activeScale: 1.45, activeLift: 95 }
  return { height: 430, fanScale: 0.48, spread: 44, activeScale: 1.6, activeLift: 115 }
}

/**
 * Quase tudo aqui é derivado, em vez de chutado por breakpoint:
 *
 * - `fanTop` reserva exatamente o espaço que a carta destacada ocupa ao subir e
 *   crescer — o palco tem overflow-hidden por causa do portal, então sem essa
 *   folga o topo da carta revelada seria cortado;
 * - o círculo mágico fica logo abaixo da base da carta central, para as cartas
 *   parecerem nascer de dentro dele em qualquer largura de tela.
 */
function metricsFor(w: number): StageMetrics {
  const base = baseFor(w)
  const stageWidth = Math.min(w, MAX_STAGE)

  const pop = ((CARD_H / 2) * (base.activeScale - 1) + base.activeLift) * base.fanScale
  const fanTop = Math.round(TOP_GAP + pop)

  const cardBottom = fanTop + CARD_BOTTOM * base.fanScale
  // Em telas estreitas o leque ocupa quase a largura toda: sem esta folga o
  // círculo fica mais estreito que as cartas e some atrás delas.
  const circleWidth = Math.round(Math.min(stageWidth * 0.96, 620 * base.fanScale + 110))
  const circleCenterY = Math.round(cardBottom + 30 * base.fanScale)

  // A fenda é alta e estreita: quase toda a altura do palco.
  const portalHeight = Math.round(base.height * 0.8)
  return {
    ...base,
    stageWidth,
    fanTop,
    circleWidth,
    circleCenterY,
    portalCenterY: Math.round(base.height * 0.46),
    portalHeight,
  }
}

export function useStageMetrics(): StageMetrics {
  const [m, setM] = useState(() => metricsFor(typeof window === 'undefined' ? 1440 : window.innerWidth))

  useEffect(() => {
    const onResize = () => setM(metricsFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return m
}
