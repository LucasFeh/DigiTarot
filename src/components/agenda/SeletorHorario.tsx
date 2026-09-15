import { useEffect, useState } from 'react'
import {
  HORARIOS,
  cedoDemais,
  diaTemVaga,
  diasDisponiveis,
  rotuloCompleto,
  rotuloDia,
  slotId,
} from '../../data/agenda'

/**
 * O calendário da reserva: quatro semanas à frente, todos os dias, e os seis
 * encaixes de cada dia — 16h às 21h.
 *
 * O "agora" fica em estado e é revisto de minuto em minuto. Sem isso, uma aba
 * deixada aberta das 15h50 continuaria oferecendo as 16h de hoje muito depois
 * de o horário ter passado, e a reserva só falharia lá na frente.
 */
export default function SeletorHorario({
  ocupados,
  dia,
  hora,
  onDia,
  onHora,
  accent,
}: {
  ocupados: Set<string>
  dia: string | null
  hora: string | null
  onDia: (d: string) => void
  onHora: (h: string) => void
  accent: string
}) {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const dias = diasDisponiveis(agora)

  return (
    <div>
      <h3 className="font-display text-[17px] text-star">Escolha o dia</h3>
      <p className="mt-1 text-[14px] text-mist/70">
        Atendimento todos os dias, das 16h às 21h.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {dias.map((d) => {
          const livre = diaTemVaga(d, ocupados, agora)
          const on = d === dia
          const r = rotuloDia(d)
          return (
            <button
              key={d}
              type="button"
              disabled={!livre}
              onClick={() => onDia(d)}
              aria-pressed={on}
              className="rounded-xl border px-2 py-2.5 text-center transition disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                borderColor: on ? accent : '#ffffff1f',
                background: on ? `${accent}26` : '#ffffff08',
                boxShadow: on ? `0 0 24px -8px ${accent}` : 'none',
              }}
            >
              <span className="block text-[11px] uppercase tracking-[0.14em] text-mist/70">
                {r.semana}
              </span>
              <span className="block font-display text-[18px] text-star">{r.numero}</span>
              <span className="block text-[11px] text-mist/55">{r.mes}</span>
            </button>
          )
        })}
      </div>

      {/* ------------------------------ horários ------------------------------ */}
      <div className="mt-8">
        <h3 className="font-display text-[17px] text-star">Escolha o horário</h3>
        <p className="mt-1 text-[14px] text-mist/70">
          {dia ? rotuloCompleto(dia) : 'Selecione um dia acima primeiro.'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {HORARIOS.map((h) => {
            const indisponivel =
              !dia || ocupados.has(slotId(dia, h)) || cedoDemais(dia, h, agora)
            const on = h === hora && !indisponivel
            return (
              <button
                key={h}
                type="button"
                disabled={indisponivel}
                onClick={() => onHora(h)}
                aria-pressed={on}
                className="rounded-xl border py-3 text-center font-display text-[16px] transition disabled:cursor-not-allowed disabled:opacity-25"
                style={{
                  borderColor: on ? accent : '#ffffff1f',
                  background: on ? `${accent}26` : '#ffffff08',
                  color: on ? '#fff' : '#cbbde8',
                  boxShadow: on ? `0 0 24px -8px ${accent}` : 'none',
                }}
              >
                {h}
              </button>
            )
          })}
        </div>

        {dia && HORARIOS.every((h) => ocupados.has(slotId(dia, h)) || cedoDemais(dia, h, agora)) && (
          <p className="mt-3 text-[14px] text-gold/90">
            Não há mais horários livres neste dia. Escolha outro.
          </p>
        )}
      </div>
    </div>
  )
}
