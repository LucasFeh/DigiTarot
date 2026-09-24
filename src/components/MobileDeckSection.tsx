import { useEffect, useRef, useState } from 'react'
import CardVisual from './CardVisual'
import { categories, type Plan } from '../data/plans'

/** A versão de toque mantém a escolha em duas etapas, sem os loops do palco. */
export default function MobileDeckSection() {
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Plan | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const category = categories[categoryIndex]

  function changeCategory(index: number) {
    setCategoryIndex((index + categories.length) % categories.length)
    setRevealedId(null)
    if (list.current) list.current.scrollLeft = 0
  }

  useEffect(() => {
    if (!chosen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setChosen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chosen])

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
        <button type="button" onClick={() => changeCategory(categoryIndex - 1)} aria-label="Categoria anterior" className="grid size-11 place-items-center rounded-full border border-white/20 bg-white/5 text-xl text-star">‹</button>
        <p className="px-3 text-center font-display text-base text-star">{category.title}</p>
        <button type="button" onClick={() => changeCategory(categoryIndex + 1)} aria-label="Próxima categoria" className="grid size-11 place-items-center rounded-full border border-white/20 bg-white/5 text-xl text-star">›</button>
      </div>

      <div
        ref={list}
        key={category.id}
        className="mobile-deck mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5"
        style={{ paddingInline: 'max(16px, calc((100vw - 168px) / 2))', scrollbarWidth: 'none' }}
        aria-label={`Cartas de ${category.title}`}
      >
        {category.plans.map((plan) => {
          const revealed = revealedId === plan.id
          return (
            <button
              key={plan.id}
              type="button"
              aria-label={`${plan.title}${plan.duration ? `, ${plan.duration}` : ''}${revealed ? ', escolher consulta' : ', revelar carta'}`}
              aria-pressed={revealed}
              onClick={() => revealed ? setChosen(plan) : setRevealedId(plan.id)}
              className="h-[268px] w-[168px] shrink-0 snap-center rounded-[14px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <CardVisual plan={plan} accent={category.accent} revealed={revealed} lightweight />
            </button>
          )
        })}
      </div>

      <p className="mx-auto mt-4 max-w-md px-5 text-center font-display text-[15px] text-star/85">{category.tagline}</p>
      <div className="mt-5 flex items-center justify-center gap-2" aria-label="Ir para categoria">
        {categories.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeCategory(index)}
            aria-label={`Ir para ${item.title}`}
            aria-current={index === categoryIndex}
            className="h-2 rounded-full"
            style={{ width: index === categoryIndex ? 30 : 8, background: index === categoryIndex ? item.accent : '#ffffff44' }}
          />
        ))}
      </div>

      {chosen && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar a consulta escolhida" className="fixed inset-0 z-[90] grid place-items-center px-5">
          <button type="button" aria-label="Fechar escolha" onClick={() => setChosen(null)} className="absolute inset-0 bg-void/95" />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#18102d] px-7 py-9 text-center shadow-2xl">
            <span aria-hidden className="text-4xl text-gold">{chosen.icon}</span>
            <h2 className="mt-4 text-3xl text-star">Esta é a sua carta</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-mist">Agora é escolher quem vai atender você. Depois, marque o horário e conclua pelo Pix.</p>
            <div className="mt-7 rounded-xl border px-4 py-4 text-left" style={{ borderColor: `${category.accent}77`, background: `${category.accent}18` }}>
              <p className="font-display text-base text-star">{chosen.title}</p>
              {chosen.duration && <p className="mt-1 text-[12px] uppercase tracking-wider text-mist/80">{chosen.duration}</p>}
              <p className="mt-3 text-[14px] leading-relaxed text-mist/80">{chosen.resumo}</p>
            </div>
            <a href={`#/agendar/${chosen.id}`} className="mt-7 block rounded-full bg-violet px-5 py-3.5 font-medium text-star">Escolher tarólogo</a>
            <button type="button" onClick={() => setChosen(null)} className="mt-3 rounded-full border border-white/20 px-6 py-2.5 text-[15px] text-mist">Escolher outra carta</button>
          </div>
        </div>
      )}
    </section>
  )
}
