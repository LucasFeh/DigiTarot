import { useState } from 'react'
import { categories, formatPriceFull } from '../data/plans'

/**
 * O catálogo por onde a consulta é contratada. Deliberadamente sóbrio: uma
 * linha por serviço, o que ela inclui, a duração quando houver e o valor com
 * centavos, alinhado à direita como em qualquer tabela de preços que se leva a
 * sério. Quem chega aqui já decidiu que quer — o que falta é comparar e clicar,
 * e ornamento a mais só atrapalha essa leitura.
 */
export default function CatalogoPlanos({ destino }: { destino: (planoId: string) => string }) {
  const [ativa, setAtiva] = useState(categories[0].id)
  const categoria = categories.find((c) => c.id === ativa) ?? categories[0]

  return (
    <div>
      {/* ---------------------------- categorias ---------------------------- */}
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {categories.map((c) => {
          const on = c.id === ativa
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setAtiva(c.id)}
              aria-current={on ? 'true' : undefined}
              className="relative px-4 py-3 text-[15px] tracking-wide transition"
              style={{ color: on ? '#fff' : '#cbbde8' }}
            >
              {c.title}
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-opacity"
                style={{ background: c.accent, opacity: on ? 1 : 0 }}
              />
            </button>
          )
        })}
      </div>

      <p className="mt-5 text-[15px] leading-relaxed text-mist/80">{categoria.tagline}</p>

      {/* ------------------------------ planos ------------------------------ */}
      <ul className="mt-5 flex flex-col divide-y divide-white/8 border-y border-white/8">
        {categoria.plans.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-3 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[17px] text-star">{p.title}</h3>
                {p.duration && (
                  <span className="rounded-full border border-white/15 px-2 py-[1px] text-[12px] uppercase tracking-[0.12em] text-mist/75">
                    {p.duration}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-mist/70">{p.resumo}</p>
            </div>

            <div className="flex shrink-0 items-center gap-4 sm:justify-end">
              <span className="font-display text-[19px] font-semibold text-gold sm:w-28 sm:text-right">
                {formatPriceFull(p.price)}
              </span>
              <a
                href={destino(p.id)}
                className="rounded-full border px-5 py-2 text-[15px] text-star transition hover:bg-white/10"
                style={{ borderColor: `${categoria.accent}88` }}
              >
                Agendar
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[14px] leading-relaxed text-mist/60">
        Qualquer modalidade pode ser feita por escrito, áudio ou chamada — você escolhe no passo
        seguinte. O pagamento é por Pix, e a consulta só é confirmada depois dele.
      </p>
    </div>
  )
}
