import {
  motion,
  useAnimationFrame,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from 'framer-motion'
import type { RefObject } from 'react'
import CardVisual, { CARD_H, CARD_W } from './CardVisual'
import { fanOffset, noise } from '../lib/fan'
import type { Plan } from '../data/plans'
import type { PullField } from '../lib/usePortalPull'

type Custom = {
  i: number
  total: number
  angle: number
  /** Lugar da carta no leque, já resolvido em x/y. */
  fan: { x: number; y: number }
  /**
   * Centro do buraco negro, em coordenadas locais do leque. É uma ref porque o
   * AnimatePresence congela as props de quem sai — ver `usePortalPull`.
   */
  target: RefObject<{ x: number; y: number }>
  /** Y do centro do círculo mágico: é de onde a carta nasce. */
  birthY: number
  /** Com movimento reduzido, entrada e saída viram um fade curto. */
  reduce: boolean
}

const variants: Variants = {
  // Cada carta sobe do centro do círculo, uma atrás da outra, e vai direto para
  // o seu lugar no leque. Mola dura e intervalo curto: é um jorro, não um desfile.
  initial: ({ birthY, reduce }: Custom) =>
    reduce ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 } : { x: 0, y: birthY, rotate: 0, scale: 0.18, opacity: 0 },
  animate: ({ i, angle, fan, reduce }: Custom) => ({
    x: fan.x,
    y: fan.y,
    rotate: angle,
    scale: 1,
    opacity: 1,
    transition: reduce
      ? { duration: 0.2, delay: i * 0.02 }
      : {
          type: 'spring' as const,
          stiffness: 300,
          damping: 26,
          mass: 0.7,
          delay: 0.05 + i * 0.07,
          opacity: { duration: 0.16, delay: 0.05 + i * 0.07 },
        },
  }),
  // Engolida: vai em LINHA RETA até o centro do buraco e some encolhendo. O
  // `rotate` gira a carta no próprio eixo (a origem é o centro), então ela
  // espirala para dentro sem desviar da trajetória.
  exit: ({ i, total, angle, target, reduce }: Custom) => {
    if (reduce) return { opacity: 0, transition: { duration: 0.18 } }
    const { x, y } = target.current
    // A carta mais próxima do buraco entra primeiro.
    const delay = (x > 0 ? total - 1 - i : i) * 0.045
    const dur = 0.72
    /**
     * Acelera para dentro, mas chega. Uma curva mais traseira lê melhor como
     * puxão — só que com [.66,0,.92,.3] a carta tinha percorrido apenas 54% do
     * caminho aos 90% do tempo, e a opacidade a apagava no meio do trajeto:
     * ela sumia no ar antes de alcançar a fenda. Esta entrega 80% aos 90%.
     */
    const ease = [0.42, 0, 0.72, 0.42] as [number, number, number, number]
    return {
      x,
      y,
      rotate: angle + (x > 0 ? 170 : -170) + noise(i) * 70,
      // Vira de perfil ao chegar: a fenda é uma fresta, e a carta tem de entrar
      // de lado. A perspectiva é o que transforma isso em profundidade.
      rotateY: x > 0 ? 58 : -58,
      // Perspectiva folgada e giro contido: fechados demais, a projeção joga o
      // corpo da carta para o lado e ela parece frear antes da fenda.
      transformPerspective: 2400,
      // Espremida contra a fenda: some muito mais em largura que em altura.
      scaleX: 0.03,
      scaleY: 0.34,
      /**
       * A carta NÃO some sozinha: ela entra no portal e o preto dele a cobre —
       * o portal está num z-index acima das cartas justamente para isso. O fade
       * é só um seguro para o último instante, quando ela já está dentro.
       */
      opacity: [1, 1, 1, 0],
      transition: {
        duration: dur,
        ease,
        delay,
        // O perfil vira mais tarde que o deslocamento: a carta viaja de frente
        // e só se torce na boca da fenda.
        rotateY: { duration: dur * 0.42, delay: delay + dur * 0.58, ease: 'easeIn' as const },
        scaleX: { duration: dur * 0.45, delay: delay + dur * 0.55, ease: 'easeIn' as const },
        // `times` fica só na opacidade: no nível de cima ele valeria para todas
        // as props, inclusive as que não têm keyframes.
        opacity: { duration: dur, times: [0, 0.82, 0.97, 1], delay },
      },
    }
  },
}

/**
 * A carta sendo puxada pelo buraco negro: roupa no varal em vento forte. Ela é
 * presa pela base, o topo pende na direção do vento e ela tremula — mas não
 * deforma. Sem cisalhar, sem esticar: só deslocamento e inclinação.
 *
 * Fica numa camada própria entre a posição do leque (variants) e o hover do
 * botão, para não brigar com nenhum dos dois.
 */
function Suction({
  field,
  k,
  index,
  reduce,
  children,
}: {
  field: PullField
  /** Posição no leque, 0 = extrema esquerda, 1 = extrema direita. */
  k: number
  index: number
  reduce: boolean
  children: React.ReactNode
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useMotionValue(0)

  useAnimationFrame((t) => {
    // A regra global de `prefers-reduced-motion` no index.css só alcança
    // animações CSS — um loop de rAF continua rodando. Aqui o corte é explícito.
    if (reduce) return

    const l = field.left.get()
    const r = field.right.get()

    if (l < 0.002 && r < 0.002) {
      if (x.get() !== 0 || rotate.get() !== 0) {
        x.set(0)
        y.set(0)
        rotate.set(0)
      }
      return
    }

    // Quem está mais perto do buraco sente mais vento.
    const pl = l * (0.45 + 0.55 * (1 - k))
    const pr = r * (0.45 + 0.55 * k)
    const net = pr - pl
    const mag = Math.max(pl, pr)

    // Tremular: a roupa bate no vento, e bate mais quanto mais forte ele é.
    const flutter = Math.sin(t / 95 + index * 1.9) * mag * 5
    const bob = Math.cos(t / 130 + index * 2.6) * mag * 4

    x.set(net * 108)
    y.set(-mag * 10 + bob)
    // A inclinação é o que vende o vento: a carta pende para o buraco.
    rotate.set(net * 26 + flutter)
  })

  return (
    <motion.div
      data-suction
      className="h-full w-full"
      // Presa pela base, como no varal: o topo é que voa.
      style={{ x, y, rotate, transformOrigin: '50% 88%' }}
    >
      {children}
    </motion.div>
  )
}

export default function TarotCard({
  plan,
  accent,
  index,
  total,
  angle,
  target,
  birthY,
  pull,
  activeScale,
  activeLift,
  isActive,
  locked,
  onActivate,
  onSelect,
}: {
  plan: Plan
  accent: string
  index: number
  total: number
  angle: number
  target: RefObject<{ x: number; y: number }>
  birthY: number
  pull: PullField
  /** Quanto a carta cresce e sobe ao ser revelada (vem das métricas do palco). */
  activeScale: number
  activeLift: number
  isActive: boolean
  locked: boolean
  onActivate: () => void
  onSelect: (rect: DOMRect) => void
}) {
  // Sem initial/animate/exit aqui de propósito: as variantes são herdadas do
  // container da categoria, para o AnimatePresence conseguir disparar a saída.
  const reduce = useReducedMotion() ?? false
  const custom: Custom = { i: index, total, angle, fan: fanOffset(angle), target, birthY, reduce }

  /**
   * O AnimatePresence congela as props de quem está saindo: `isActive` e
   * `locked` ficam com o valor de antes da troca. Sem isto, uma carta revelada
   * seria engolida virada para cima e ampliada, e os botões das cartas em voo
   * continuariam clicáveis — um clique nelas vazaria `active` para a categoria
   * seguinte. `useIsPresent` vem do contexto, que é atualizado mesmo assim.
   */
  const present = useIsPresent()
  const revealed = isActive && present
  const inert = locked || !present

  return (
    <motion.div
      custom={custom}
      variants={variants}
      className="absolute left-1/2 top-0"
      style={{
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        zIndex: revealed ? 50 : 10 + index,
      }}
    >
      <Suction field={pull} k={total > 1 ? index / (total - 1) : 0.5} index={index} reduce={reduce}>
        <button
          type="button"
          disabled={inert}
          tabIndex={present ? 0 : -1}
          // No toque, pointerenter e focus disparam junto com o clique — revelaria e
          // selecionaria a carta de uma vez. Por isso o hover ignora pointerType
          // 'touch' e o foco só conta quando é navegação por teclado
          // (:focus-visible é falso em foco vindo de ponteiro).
          onPointerEnter={(e) => e.pointerType !== 'touch' && onActivate()}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && onActivate()}
          onClick={(e) => (revealed ? onSelect(e.currentTarget.getBoundingClientRect()) : onActivate())}
          aria-label={`${plan.title}${plan.duration ? `, ${plan.duration}` : ''}`}
          className="block h-full w-full cursor-pointer rounded-[14px] outline-none transition-[transform,filter] duration-[420ms] ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:ring-2 focus-visible:ring-gold/70 disabled:cursor-default"
          style={{
            transform: revealed
              ? `translateY(-${Math.round(activeLift - Math.abs(angle) * 0.35)}px) rotate(${-angle * 0.55}deg) scale(${activeScale})`
              : 'translateY(0) rotate(0) scale(1)',
            filter: revealed
              ? `drop-shadow(0 26px 34px #000) drop-shadow(0 0 26px ${accent}cc)`
              : 'drop-shadow(0 10px 18px rgba(0,0,0,.65))',
          }}
        >
          <CardVisual plan={plan} accent={accent} revealed={revealed} />
        </button>
      </Suction>
    </motion.div>
  )
}
