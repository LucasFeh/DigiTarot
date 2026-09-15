import { AnimatePresence, motion, useTransform, type MotionValue } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import TarotCard from './TarotCard'
import { CARD_H as CARD_HEIGHT } from './CardVisual'
import CardVisual, { CARD_H, CARD_W } from './CardVisual'
import Sparkles from './Sparkles'
import MaintenanceView from './MaintenanceView'
import { categories, type Plan } from '../data/plans'
import { fanSlot } from '../lib/fan'
import { useStageMetrics } from '../lib/useStageMetrics'
import { usePortalPull } from '../lib/usePortalPull'
import MagicCircle from './MagicCircle'
import Portal, { PORTAL_ASPECT, PORTAL_CENTER_INSET } from './Portal'

type Phase = 'idle' | 'throwing' | 'dealing' | 'flying'

type Flight = {
  plan: Plan
  accent: string
  from: { x: number; y: number; scale: number }
  to: { x: number; y: number }
}

export default function DeckSection() {
  const m = useStageMetrics()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const pull = usePortalPull()
  const [active, setActive] = useState<number | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [flightStage, setFlightStage] = useState<'fly' | 'hold' | 'dissolve'>('fly')
  /** Plano escolhido — sobrevive ao fim do voo para alimentar a tela de destino. */
  const [chosen, setChosen] = useState<{ plan: Plan; accent: string } | null>(null)

  const timers = useRef<number[]>([])
  const touchX = useRef<number | null>(null)

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const category = categories[index]
  const locked = phase !== 'idle'

  /**
   * A fase também numa ref: os handlers presos nas cartas em saída foram
   * criados num render antigo e enxergam `locked` desatualizado. A ref é lida
   * no momento do evento, então uma carta em voo não consegue mexer no estado.
   */
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  /**
   * Alvos do voo, em coordenadas locais do leque — que está escalado por
   * `fanScale` e centrado no palco, então tudo aqui é convertido.
   *
   * O X da fenda não é a borda do palco: ela é estreita e fica um pouco para
   * fora, então o centro cai para DENTRO da borda. As duas constantes vêm do
   * próprio Portal, senão mudar a geometria lá faria as cartas pararem no vazio.
   */
  const portalW = m.portalHeight * PORTAL_ASPECT
  /**
   * Perto da fenda a carta gira em `rotateY`, e a projeção em perspectiva joga
   * o corpo dela para trás — o centro geométrico chega, mas o que se vê fica
   * aquém. Esta folga mira um pouco além do centro, para a carta entrar mesmo
   * no preto. Cabe com sobra: o miolo escuro da fenda tem ~60% da largura dela.
   */
  const perspectiva = 38 / m.fanScale
  const holeX = (m.stageWidth / 2 - portalW * PORTAL_CENTER_INSET) / m.fanScale + perspectiva
  const holeY = (m.portalCenterY - m.fanTop) / m.fanScale - CARD_HEIGHT / 2
  /** De onde as cartas nascem: o centro do círculo mágico. */
  const birthY = (m.circleCenterY - m.fanTop) / m.fanScale - CARD_HEIGHT / 2

  /**
   * Troca de categoria: o portal do lado do movimento trava aberto e engole o
   * leque; depois o círculo invoca o próximo.
   */
  const change = useCallback(
    (step: number) => {
      if (phase !== 'idle' || step === 0) return
      clearTimers()
      const side = step > 0 ? 'right' : 'left'
      // Escrever o alvo ANTES de trocar o índice: é a ref que as cartas em
      // saída vão ler, já que suas props ficam congeladas pelo AnimatePresence.
      pull.target.current = { x: step > 0 ? holeX : -holeX, y: holeY }
      setActive(null)
      setPhase('throwing')
      pull.open(side)
      setIndex((i) => (i + step + categories.length) % categories.length)
    },
    // pull é estável: só refs e motion values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, clearTimers, holeX, holeY],
  )

  /** Chamado quando a última carta antiga entrou no buraco negro. */
  const onThrowComplete = useCallback(() => {
    setPhase('dealing')
    // Solta o portal já: a mola fecha ele enquanto o círculo acende e as
    // cartas novas começam a subir — as duas coisas se sobrepõem de propósito.
    pull.open(null)
    after(450 + categories[index].plans.length * 75, () => setPhase('idle'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, after])

  /** Seleção: a carta voa para o centro da tela e abre a área de destino. */
  const select = useCallback(
    (plan: Plan, rect: DOMRect) => {
      if (phase !== 'idle') return
      clearTimers()
      setPhase('flying')
      setFlightStage('fly')
      setChosen({ plan, accent: category.accent })
      setFlight({
        plan,
        accent: category.accent,
        from: {
          x: rect.left + rect.width / 2 - CARD_W / 2,
          y: rect.top + rect.height / 2 - CARD_H / 2,
          scale: rect.width / CARD_W,
        },
        to: {
          x: window.innerWidth / 2 - CARD_W / 2,
          y: window.innerHeight / 2 - CARD_H / 2,
        },
      })
      after(880, () => setFlightStage('hold'))
      after(1620, () => setFlightStage('dissolve'))
      after(2180, () => setFlight(null))
    },
    [phase, category.accent, clearTimers, after],
  )

  const reset = useCallback(() => {
    clearTimers()
    setChosen(null)
    setFlight(null)
    setFlightStage('fly')
    setActive(null)
    pull.open(null)
    setPhase('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers])

  // A tela de manutenção só entra quando a carta já se dissolveu.
  const showMaintenance = chosen !== null && flightStage === 'dissolve'

  // Setas do teclado navegam entre as categorias; Esc fecha a área de destino.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (chosen) {
        if (e.key === 'Escape') reset()
        return
      }
      if (e.key === 'ArrowRight') change(1)
      if (e.key === 'ArrowLeft') change(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [change, chosen, reset])

  return (
    <section id="planos" className="relative py-20 [overflow-x:clip] sm:py-28">
      <div className="mx-auto max-w-6xl px-5 text-center">
        <p className="mb-3 text-[13px] uppercase tracking-[0.42em] text-lilac/80">Escolha sua carta</p>
        <h2 className="text-nebula text-4xl sm:text-5xl">Tabela de Consultas</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-mist/90">
          <span className="hidden sm:inline">
            Passe o mouse sobre uma carta para revelá-la. Troque de categoria e um portal suga o
            baralho — o círculo invoca o próximo.
          </span>
          <span className="sm:hidden">
            Toque numa carta para revelá-la e de novo para escolher. Deslize para o lado ou toque
            na seta para trocar de categoria.
          </span>
        </p>

        {/* ------------------------- abas de categoria ------------------------- */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {categories.map((c, i) => {
            const on = i === index
            return (
              <button
                key={c.id}
                type="button"
                disabled={locked}
                onClick={() => change(i - index)}
                aria-current={on}
                className="rounded-full border px-4 py-2 text-[14px] tracking-wide transition disabled:cursor-default sm:text-[15px]"
                style={{
                  borderColor: on ? `${c.accent}aa` : '#ffffff1f',
                  background: on ? `${c.accent}22` : '#ffffff08',
                  color: on ? '#fff' : '#cbbde8',
                  boxShadow: on ? `0 0 26px -6px ${c.accent}` : 'none',
                }}
              >
                <span aria-hidden className="mr-1.5">
                  {c.icon}
                </span>
                {c.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* ------------------------------ o palco ------------------------------ */}
      <div
        className="stage relative mx-auto mt-8 w-full"
        style={{ height: m.height }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const d = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(d) > 55) change(d < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {/* Círculo de invocação, no chão atrás do leque */}
        <div className="absolute inset-x-0 z-0" style={{ top: m.circleCenterY }}>
          <MagicCircle
            width={m.circleWidth}
            summoning={phase === 'dealing'}
            dimmed={phase === 'throwing'}
          />
        </div>

        {/* Buracos negros nas laterais — sempre montados, `open` é quem manda */}
        <Portal side="left" open={pull.field.left} centerY={m.portalCenterY} height={m.portalHeight} />
        <Portal side="right" open={pull.field.right} centerY={m.portalCenterY} height={m.portalHeight} />

        {/* Leque de cartas — DOM por cima do canvas da mão */}
        <div className="absolute inset-x-0" style={{ top: m.fanTop }}>
          <div
            className="relative mx-auto h-0 w-full"
            style={{ transform: `scale(${m.fanScale})`, transformOrigin: 'top center' }}
          >
            <AnimatePresence mode="wait" onExitComplete={onThrowComplete}>
              <motion.div
                key={category.id}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0"
              >
                {category.plans.map((plan, i) => (
                  <TarotCard
                    key={plan.id}
                    plan={plan}
                    accent={category.accent}
                    index={i}
                    total={category.plans.length}
                    angle={fanSlot(i, category.plans.length, m.spread).angle}
                    target={pull.target}
                    birthY={birthY}
                    pull={pull.field}
                    activeScale={m.activeScale}
                    activeLift={m.activeLift}
                    isActive={active === i}
                    locked={locked}
                    onActivate={() => phaseRef.current === 'idle' && setActive(i)}
                    onSelect={(rect) => select(plan, rect)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ------------------------------- setas ------------------------------- */}
        {(['left', 'right'] as const).map((side) => (
          <Arrow
            key={side}
            side={side}
            open={side === 'left' ? pull.field.left : pull.field.right}
            disabled={locked}
            onClick={() => change(side === 'left' ? -1 : 1)}
          />
        ))}
      </div>

      {/* --------------------- legenda + indicadores --------------------- */}
      <div className="mx-auto mt-2 max-w-xl px-5 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={category.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="font-display text-base text-star/90"
          >
            {category.tagline}
          </motion.p>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-2.5">
          {categories.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => change(i - index)}
              disabled={locked}
              aria-label={`Ir para ${c.title}`}
              className="h-2 rounded-full transition-all disabled:cursor-default"
              style={{
                width: i === index ? 30 : 8,
                background: i === index ? c.accent : '#ffffff33',
                boxShadow: i === index ? `0 0 14px ${c.accent}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* --------------------- carta voando para o centro --------------------- */}
      <AnimatePresence>
        {flight && (
          <div className="pointer-events-none fixed inset-0 z-[80]" style={{ perspective: 1400 }}>
            <motion.div
              className="absolute inset-0 bg-void/75 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            />

            {/* Rastro: cópias fantasmas atrasadas atrás da carta */}
            {[2, 1, 0].map((ghost) => (
              <motion.div
                key={ghost}
                className="preserve-3d absolute left-0 top-0"
                style={{ width: CARD_W, height: CARD_H }}
                initial={{
                  x: flight.from.x,
                  y: flight.from.y,
                  scale: flight.from.scale,
                  rotateY: 0,
                  opacity: ghost === 0 ? 1 : 0.3,
                }}
                animate={
                  flightStage === 'dissolve'
                    ? {
                        x: flight.to.x,
                        y: flight.to.y - 70,
                        scale: 1.05,
                        rotateY: 360,
                        opacity: 0,
                        filter: 'blur(14px)',
                      }
                    : {
                        x: flight.to.x,
                        y: flight.to.y,
                        scale: 1.5,
                        rotateY: 360,
                        opacity: ghost === 0 ? 1 : 0,
                      }
                }
                transition={
                  flightStage === 'dissolve'
                    ? { duration: 0.45, ease: 'easeIn' }
                    : { type: 'spring', stiffness: 80, damping: 15, mass: 1.15, delay: ghost * 0.05 }
                }
              >
                <div
                  className="h-full w-full"
                  style={{
                    filter:
                      ghost === 0
                        ? `drop-shadow(0 0 46px ${flight.accent}) drop-shadow(0 30px 50px #000)`
                        : `blur(6px) drop-shadow(0 0 30px ${flight.accent})`,
                  }}
                >
                  <CardVisual plan={flight.plan} accent={flight.accent} revealed />
                </div>
              </motion.div>
            ))}

            {/* Chegada: anel de energia + partículas */}
            {flightStage !== 'fly' && (
              <>
                <motion.div
                  className="absolute left-1/2 top-1/2 rounded-full border-2"
                  style={{
                    borderColor: flight.accent,
                    marginLeft: -60,
                    marginTop: -60,
                    width: 120,
                    height: 120,
                  }}
                  initial={{ scale: 0.2, opacity: 0.9 }}
                  animate={{ scale: 5.4, opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                />
                <Sparkles accent={flight.accent} />
              </>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------- área "em manutenção" ----------------------- */}
      <AnimatePresence>
        {showMaintenance && chosen && (
          <MaintenanceView plan={chosen.plan} accent={chosen.accent} onBack={reset} />
        )}
      </AnimatePresence>
    </section>
  )
}

/**
 * Seta do carrossel. Some enquanto o buraco negro daquele lado está aberto —
 * durante a transição quem ocupa o lugar dela é o buraco.
 */
function Arrow({
  side,
  open,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  open: MotionValue<number>
  disabled: boolean
  onClick: () => void
}) {
  const opacity = useTransform(open, [0, 0.35], [1, 0])
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={side === 'left' ? 'Categoria anterior' : 'Próxima categoria'}
      style={{ opacity }}
      className={`glass absolute top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-lilac outline-none transition-colors hover:text-star focus-visible:ring-2 focus-visible:ring-gold/60 disabled:cursor-default sm:h-14 sm:w-14 ${
        side === 'left' ? 'left-3 sm:left-8' : 'right-3 sm:right-8'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  )
}
