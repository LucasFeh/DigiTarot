import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { formatPriceFull } from '../../data/plans'
import { faltam, jaPassou, rotuloCompleto } from '../../data/agenda'
import SeloStatus from './SeloStatus'
import type { Agendamento } from '../../lib/backend'

/**
 * As consultas de quem está logado, do ponto de vista do cliente: onde ela está
 * (pagamento, conferência, confirmada) e qual é o próximo passo dele. A lista é
 * ordenada pelo horário marcado, e não pela data da compra — o que importa a
 * quem olha é o que vem primeiro.
 */
export default function MinhasConsultas() {
  const { usuario, backend } = useAuth()
  const [lista, setLista] = useState<Agendamento[]>([])
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarMeusAgendamentos(usuario.uid, setLista)
  }, [backend, usuario])

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!usuario) return null

  if (lista.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-10 text-center">
        <p className="text-[16px] text-mist">Você ainda não marcou nenhuma consulta.</p>
        <a
          href="#/tiragem"
          className="mt-5 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
        >
          Ver o catálogo
        </a>
      </div>
    )
  }

  const ordenada = [...lista].sort((a, b) =>
    `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`),
  )

  return (
    <ul className="flex flex-col gap-3">
      {ordenada.map((a) => {
        const passou = jaPassou(a.data, a.hora, agora)
        return (
          <li key={a.id} className="glass rounded-2xl px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[17px] text-star">{a.planoTitulo}</p>
                <p className="mt-1 text-[14px] text-mist/75">
                  {rotuloCompleto(a.data)}, às {a.hora}
                  {a.status !== 'cancelado' && !passou && ` · ${faltam(a.data, a.hora, agora)}`}
                </p>
              </div>
              <SeloStatus status={a.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/8 pt-3">
              <span className="mr-auto text-[14px] text-mist/70">
                {formatPriceFull(a.preco)} · código {a.codigo}
              </span>

              {a.sessaoId && a.status === 'confirmado' ? (
                <a
                  href={`#/tiragem/${a.sessaoId}`}
                  className="rounded-full px-5 py-2 text-[15px] font-medium text-star transition"
                  style={{
                    background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                    boxShadow: '0 10px 30px -14px #c2449d',
                  }}
                >
                  Entrar na minha mesa
                </a>
              ) : a.status === 'aguardando' ? (
                <a
                  href={`#/pagamento/${a.id}`}
                  className="rounded-full border border-gold/50 bg-gold/10 px-5 py-2 text-[15px] text-gold transition hover:bg-gold/20"
                >
                  Pagar com Pix
                </a>
              ) : (
                <a
                  href={`#/pagamento/${a.id}`}
                  className="rounded-full border border-white/25 px-5 py-2 text-[15px] text-star transition hover:border-gold/60"
                >
                  Ver reserva
                </a>
              )}
            </div>

            {a.status === 'confirmado' && !a.sessaoId && !passou && (
              <p className="mt-2 text-[13px] leading-relaxed text-mist/60">
                No horário marcado, o Rodrigo abre a sua mesa e o botão de entrar aparece aqui.
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
