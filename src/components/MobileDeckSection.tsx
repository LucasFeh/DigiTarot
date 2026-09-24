import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import CardVisual, { CARD_H, CARD_W } from './CardVisual'
import EscolhaPlano from './EscolhaPlano'
import { categories, type Plan } from '../data/plans'

type Flight = {
  plan: Plan
  accent: string
  x: number
  y: number
}

/** A versão de toque anima as cartas, sem o círculo e os portais do palco. */
export default function MobileDeckSection() {
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Plan | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const category = categories[categoryIndex]
  const locked = Boolean(flight || chosen)

  function changeCategory(index: number) {
    if (locked) return
    setCategoryIndex((index + categories.length) % categories.length)
    setRevealedId(null)
    if (list.current) list.current.scrollLeft = 0
  }

  function closeChoice() {
    setChosen(null)
    setRevealedId(null)
  }

  function select(plan: Plan, card: HTMLButtonElement) {
    if (locked) return
    const box = card.getBoundingClientRect()
    setFlight({ plan, accent: category.accent, x: box.left + box.width / 2 - CARD_W / 2, y: box.top + box.height / 2 - CARD_H / 2 })
  }

  useEffect(() => {
    if (!chosen && !flight) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setChosen(null)
        setFlight(null)
        setRevealedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chosen, flight])

  return (
    <section id="planos" className="relative py-16">
      <div className="mx-auto max-w-xl px-5 text-center">
        <p className="mb-3 text-[12px] uppercase tracking-[0.36em] text-lilac/80">Escolha sua carta</p>
        <h2 className="text-nebula text-4xl">Tabela de Consultas</h2>
        <p className="mx-auto mt-4 text-[15px] leading-relaxed text-mist/85">
          Deslize as cartas. Toque uma para revelá-la e outra vez para escolher.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Categorias de consultas">
          {categories.map((item, index) => (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              aria-current={index === categoryIndex}
              onClick={() => changeCategory(index)}
              className="rounded-full border px-3 py-2 text-[13px] text-star"
              style={{ borderColor: index === categoryIndex ? `${item.accent}aa` : '#ffffff30', background: index === categoryIndex ? `${item.accent}30` : '#ffffff08' }}
            >
              <span aria-hidden className="mr-1">{item.icon}</span>{item.title}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-xl items-center justify-between px-5">
        <button type="button" disabled={locked} onClick={() => changeCategory(categoryIndex - 1)} aria-label="Categoria anterior" className="grid size-11 place-items-center rounded-full border border-white/20 bg-white/5 text-xl text-star">‹</button>
        <p className="px-3 text-center font-display text-base text-star">{category.title}</p>
        <button type="button" disabled={locked} onClick={() => changeCategory(categoryIndex + 1)} aria-label="Próxima categoria" className="grid size-11 place-items-center rounded-full border border-white/20 bg-white/5 text-xl text-star">›</button>
      </div>

      <div
        ref={list}
        key={category.id}
        className="mobile-deck mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5"
        style={{ paddingInline: 'max(16px, calc((100vw - 168px) / 2))', scrollbarWidth: 'none' }}
        aria-label={`Cartas de ${category.title}`}
      >
        {category.plans.map((plan, index) => {
          const revealed = revealedId === plan.id
          return (
            <motion.button
              key={plan.id}
              type="button"
              disabled={locked}
              initial={{ opacity: 0, y: 56, rotate: -7, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24, delay: Math.min(index, 5) * 0.07 }}
              whileTap={{ scale: 0.96 }}
              aria-label={`${plan.title}${plan.duration ? `, ${plan.duration}` : ''}${revealed ? ', escolher consulta' : ', revelar carta'}`}
              aria-pressed={revealed}
              onClick={(event) => revealed ? select(plan, event.currentTarget) : setRevealedId(plan.id)}
              className="h-[268px] w-[168px] shrink-0 snap-center rounded-[14px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <CardVisual plan={plan} accent={category.accent} revealed={revealed} />
            </motion.button>
          )
        })}
      </div>

      <p className="mx-auto mt-4 max-w-md px-5 text-center font-display text-[15px] text-star/85">{category.tagline}</p>
      <div className="mt-5 flex items-center justify-center gap-2" aria-label="Ir para categoria">
        {categories.map((item, index) => (
          <button
            key={item.id}
            type="button"
            disabled={locked}
            onClick={() => changeCategory(index)}
            aria-label={`Ir para ${item.title}`}
            aria-current={index === categoryIndex}
            className="h-2 rounded-full"
            style={{ width: index === categoryIndex ? 30 : 8, background: index === categoryIndex ? item.accent : '#ffffff44' }}
          />
        ))}
      </div>

      {flight && (
        <motion.div className="fixed inset-0 z-[80] bg-void/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <motion.div
            className="absolute left-0 top-0 h-[268px] w-[168px]"
            initial={{ x: flight.x, y: flight.y, scale: 1, rotateY: 0 }}
            animate={{ x: window.innerWidth / 2 - CARD_W / 2, y: window.innerHeight / 2 - CARD_H / 2, scale: 1.18, rotateY: 360 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              setChosen(flight.plan)
              setFlight(null)
            }}
          >
            <CardVisual plan={flight.plan} accent={flight.accent} revealed />
          </motion.div>
        </motion.div>
      )}
      <AnimatePresence>
        {chosen && <EscolhaPlano plan={chosen} accent={category.accent} onBack={closeChoice} />}
      </AnimatePresence>
    </section>
  )
}
