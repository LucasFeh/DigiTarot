import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { formatPriceFull } from '../../data/plans'
import { faltam, jaPassou, rotuloCompleto } from '../../data/agenda'
import SeloStatus from './SeloStatus'
import type { Agendamento } from '../../lib/backend'

/**
 * A mesma grade no cabeçalho e nas linhas — senão o alinhamento se perde.
 *
 * A faixa das ações é FIXA, e não `auto`: com `auto` ela se mediria pelo botão
 * que cada linha tem ("Pagar com Pix", "Entrar na mesa", "Ver reserva" têm
 * larguras diferentes), e a sobra para as faixas `fr` mudaria de linha para
 * linha — cada valor caindo num lugar, nenhum embaixo do seu rótulo.
 */
const COLUNAS = 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,1.8fr) 168px'

/**
 * As consultas de quem está logado: o que foi marcado, em que pé está e qual é
 * o próximo passo.
 *
 * Em linhas com colunas, e não em cartões: o que se faz aqui é conferir — achar
 * a consulta de amanhã, ver qual ainda não foi paga. Empilhados, cada valor
 * cai num lugar diferente e o olho precisa procurar em vez de descer a coluna.
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
        <p className="mt-1.5 text-[14px] text-mist/60">
          Escolha uma carta na aba <span className="text-star">Agendar</span> para começar.
        </p>
      </div>
    )
  }

  // A próxima primeiro: é a que importa quando se abre esta tela.
  const ordenada = [...lista].sort((a, b) =>
    `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`),
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div
        className="hidden gap-4 border-b border-white/10 bg-white/5 px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-mist/60 lg:grid"
        style={{ gridTemplateColumns: COLUNAS }}
      >
        <span>Consulta</span>
        <span>Valor</span>
        <span>Quando</span>
        <span className="text-right">Ações</span>
      </div>

      <ul className="divide-y divide-white/8">
        {ordenada.map((a) => {
          const passou = jaPassou(a.data, a.hora, agora)
          const naMesa = Boolean(a.sessaoId) && a.status === 'confirmado'

          return (
            <li
              key={a.id}
              className="grid items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
              style={{ gridTemplateColumns: COLUNAS }}
            >
              <div className="min-w-0">
                <p className="truncate font-display text-[16px] text-star">{a.planoTitulo}</p>
                <p className="mt-1 flex items-center gap-2 text-[13px] text-mist/60">
                  <SeloStatus status={a.status} />
                  <span className="min-w-0 truncate">código {a.codigo}</span>
                </p>
              </div>

              <span className="font-display text-[16px] text-gold">
                {formatPriceFull(a.preco)}
              </span>

              <span className="min-w-0 text-[14px] text-mist/75">
                <span className="block truncate">
                  {rotuloCompleto(a.data)}, às {a.hora}
                </span>
                {a.status !== 'cancelado' && !passou && (
                  <span className="block text-[13px] text-mist/55">
                    {faltam(a.data, a.hora, agora)}
                  </span>
                )}
              </span>

              <span className="flex items-center justify-end gap-2">
                {naMesa ? (
                  // Verde, e não violeta: é a única linha da tela em que a mesa
                  // está ABERTA esperando a pessoa. Precisa saltar do resto.
                  <a
                    href={`#/tiragem/${a.sessaoId}`}
                    className="rounded-full px-4 py-1.5 text-[14px] font-medium transition"
                    style={{
                      background: 'linear-gradient(100deg, #2f9e63, #7ddba4)',
                      color: '#05010f',
                      boxShadow: '0 10px 26px -12px #7ddba4',
                    }}
                  >
                    Entrar na mesa
                  </a>
                ) : a.status === 'aguardando' ? (
                  <a
                    href={`#/pagamento/${a.id}`}
                    className="rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-[14px] text-gold transition hover:bg-gold/20"
                  >
                    Pagar com Pix
                  </a>
                ) : (
                  <a
                    href={`#/pagamento/${a.id}`}
                    className="rounded-full border border-white/25 px-4 py-1.5 text-[14px] text-star transition hover:border-gold/60"
                  >
                    Ver reserva
                  </a>
                )}
              </span>

              {a.status === 'confirmado' && !a.sessaoId && !passou && (
                <p className="col-span-full text-[13px] leading-relaxed text-mist/55">
                  No horário marcado, o Rodrigo abre a sua mesa e o botão de entrar aparece aqui.
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
