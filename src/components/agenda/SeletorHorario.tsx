import { useEffect, useState } from 'react'
import {
  HORARIOS,
  cedoDemais,
  diaTemVaga,
  diasDisponiveis,
  rotuloCompleto,
  slotId,
  ultimoDiaAgendavel,
} from '../../data/agenda'

const CAMPO =
  'w-full appearance-none rounded-xl border border-white/20 bg-[#171123] px-4 py-3 text-[15px] text-star outline-none transition focus:border-gold/70'

/** Seleção compacta de mês, dia e horário; dias sem vaga não aparecem. */
export default function SeletorHorario({
  ocupados,
  dia,
  hora,
  onDia,
  onHora,
}: {
  ocupados: Set<string>
  dia: string | null
  hora: string | null
  onDia: (d: string | null) => void
  onHora: (h: string | null) => void
}) {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const disponiveis = diasDisponiveis(agora).filter((d) => diaTemVaga(d, ocupados, agora))
  const meses = [...new Set(disponiveis.map((d) => d.slice(0, 7)))]
  const [mes, setMes] = useState(() => meses[0] ?? '')
  const mesAtual = meses.includes(mes) ? mes : (meses[0] ?? '')
  const diasDoMes = disponiveis.filter((d) => d.startsWith(mesAtual))
  const horasDoDia = dia
    ? HORARIOS.filter((h) => !ocupados.has(slotId(dia, h)) && !cedoDemais(dia, h, agora))
    : []

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-star">Escolha quando conversar</h2>
          <p className="mt-1 text-[14px] text-mist/70">Atendimentos das 16h às 21h, conforme disponibilidade.</p>
        </div>
        <p className="text-[12px] text-gold/85">Até {ultimoDiaAgendavel(agora).toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-[12px] uppercase tracking-[0.16em] text-mist/70">Mês</span>
          <select
            value={mesAtual}
            onChange={(e) => {
              setMes(e.target.value)
              onDia(null)
              onHora(null)
            }}
            className={CAMPO}
            aria-label="Mês do atendimento"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] uppercase tracking-[0.16em] text-mist/70">Dia</span>
          <select
            value={dia && diasDoMes.includes(dia) ? dia : ''}
            onChange={(e) => {
              onDia(e.target.value || null)
              onHora(null)
            }}
            disabled={!diasDoMes.length}
            className={CAMPO}
            aria-label="Dia do atendimento"
          >
            <option value="">Selecione o dia</option>
            {diasDoMes.map((d) => <option key={d} value={d}>{rotuloCompleto(d)}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] uppercase tracking-[0.16em] text-mist/70">Horário</span>
          <select
            value={hora && horasDoDia.includes(hora as typeof HORARIOS[number]) ? hora : ''}
            onChange={(e) => onHora(e.target.value || null)}
            disabled={!dia || !horasDoDia.length}
            className={CAMPO}
            aria-label="Horário do atendimento"
          >
            <option value="">Selecione a hora</option>
            {horasDoDia.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>

      {!disponiveis.length && (
        <p className="mt-5 text-[14px] text-gold">Não há horários livres neste período. Consulte novamente em breve.</p>
      )}
    </div>
  )
}
