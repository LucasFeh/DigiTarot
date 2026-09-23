import { useEffect, useState } from 'react'
import {
  HORARIOS,
  cedoDemais,
  chaveDia,
  diaParaData,
  diaTemVaga,
  diasDisponiveis,
  rotuloCompleto,
  slotId,
  ultimoDiaAgendavel,
} from '../../data/agenda'

const DIAS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** Calendário mensal e grade de horários, respeitando a janela de reserva. */
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
    const timer = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const todosDias = diasDisponiveis(agora)
  const meses = [...new Set(todosDias.map((data) => data.slice(0, 7)))]
  const [mesEscolhido, setMesEscolhido] = useState(() => meses[0] ?? '')
  const mes = meses.includes(mesEscolhido) ? mesEscolhido : (meses[0] ?? '')
  const indiceMes = meses.indexOf(mes)
  const [ano, numeroMes] = mes.split('-').map(Number)
  const primeiroDia = new Date(ano, numeroMes - 1, 1)
  const totalDias = new Date(ano, numeroMes, 0).getDate()
  const espacosIniciais = (primeiroDia.getDay() + 6) % 7
  const celulas = [
    ...Array<null>(espacosIniciais).fill(null),
    ...Array.from({ length: totalDias }, (_, indice) => chaveDia(new Date(ano, numeroMes - 1, indice + 1))),
  ]
  const diasNoPeriodo = new Set(todosDias)
  const horasDoDia = dia && diasNoPeriodo.has(dia)
    ? HORARIOS.filter((horario) => !ocupados.has(slotId(dia, horario)) && !cedoDemais(dia, horario, agora))
    : []
  const hoje = chaveDia(agora)

  function mudarMes(indice: number) {
    if (!meses[indice]) return
    setMesEscolhido(meses[indice])
    onDia(null)
    onHora(null)
  }

  return (
    <div className="booking-schedule">
      <div className="booking-schedule-heading">
        <div>
          <h2>Escolha quando conversar</h2>
          <p>Selecione uma data e depois um horário disponível.</p>
        </div>
        <span>Reservas até {ultimoDiaAgendavel(agora).toLocaleDateString('pt-BR')}</span>
      </div>

      <div className="booking-schedule-grid">
        <div className="booking-calendar">
          <div className="booking-calendar-header">
            <h3>{primeiroDia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
            <div className="booking-calendar-controls">
              <button type="button" aria-label="Mês anterior" disabled={indiceMes <= 0} onClick={() => mudarMes(indiceMes - 1)}>‹</button>
              <button type="button" aria-label="Próximo mês" disabled={indiceMes >= meses.length - 1} onClick={() => mudarMes(indiceMes + 1)}>›</button>
            </div>
          </div>
          <div className="booking-calendar-days" aria-hidden="true">
            {DIAS_DA_SEMANA.map((semana) => <span key={semana}>{semana}</span>)}
          </div>
          <div className="booking-calendar-dates" role="group" aria-label={`Dias de ${primeiroDia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}>
            {celulas.map((data, indice) => {
              if (!data) return <span key={`vazio-${indice}`} aria-hidden="true" />
              const disponivel = diasNoPeriodo.has(data) && diaTemVaga(data, ocupados, agora)
              const selecionado = data === dia
              return (
                <button
                  key={data}
                  type="button"
                  disabled={!disponivel}
                  aria-label={`${rotuloCompleto(data)}${disponivel ? '' : ', indisponível'}`}
                  aria-pressed={selecionado}
                  aria-current={data === hoje ? 'date' : undefined}
                  className={`booking-calendar-date${selecionado ? ' is-selected' : ''}${data === hoje ? ' is-today' : ''}`}
                  onClick={() => { onDia(data); onHora(null) }}
                >
                  {diaParaData(data).getDate()}
                </button>
              )
            })}
          </div>
          <p className="booking-calendar-hint"><span aria-hidden="true" /> Dias com horários livres</p>
        </div>

        <div className="booking-times">
          <p className="booking-times-eyebrow">Horários disponíveis</p>
          <h3>{dia ? diaParaData(dia).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'Escolha um dia'}</h3>
          {dia && horasDoDia.length ? (
            <div className="booking-times-list" role="group" aria-label={`Horários de ${rotuloCompleto(dia)}`}>
              {horasDoDia.map((horario) => (
                <button key={horario} type="button" aria-pressed={hora === horario} className={`booking-time${hora === horario ? ' is-selected' : ''}`} onClick={() => onHora(horario)}>{horario}</button>
              ))}
            </div>
          ) : (
            <p className="booking-times-empty">{dia ? 'Os horários deste dia acabaram. Escolha outra data.' : 'Os horários aparecem aqui quando você selecionar uma data no calendário.'}</p>
          )}
          {dia && hora && horasDoDia.includes(hora as typeof HORARIOS[number]) && <p className="booking-times-selected">✓ {rotuloCompleto(dia)}, às {hora}</p>}
        </div>
      </div>
      {!todosDias.some((data) => diaTemVaga(data, ocupados, agora)) && <p className="booking-no-slots" role="status">Não há horários livres neste período. Consulte novamente em breve.</p>}
    </div>
  )
}
