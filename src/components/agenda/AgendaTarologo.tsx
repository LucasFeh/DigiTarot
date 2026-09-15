import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { irPara } from '../../lib/useHashRoute'
import { SPREADS } from '../../data/spreads'
import { formatPriceFull } from '../../data/plans'
import { faltam, jaPassou, naJanela, rotuloCompleto } from '../../data/agenda'
import SeloStatus from './SeloStatus'
import type { Agendamento } from '../../lib/backend'

const FORMATO: Record<string, string> = {
  chamada: 'chamada de vídeo',
  audio: 'áudio',
  escrito: 'por escrito',
}

type Filtro = 'proximas' | 'pendentes' | 'todas'

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'proximas', rotulo: 'Próximas' },
  { id: 'pendentes', rotulo: 'Aguardando pagamento' },
  { id: 'todas', rotulo: 'Todas' },
]

/**
 * A agenda do tarólogo: tudo que foi marcado, em que pé está e o botão que abre
 * a mesa.
 *
 * A mesa não é aberta sozinha no horário. Ela espera um clique do Rodrigo — e o
 * botão só acende perto da hora marcada daquele cliente, depois de o pagamento
 * ter sido confirmado. Abrir automaticamente deixaria salas vazias acesas por
 * consultas que ninguém pagou nem apareceu.
 */
export default function AgendaTarologo() {
  const { usuario, backend } = useAuth()
  const [lista, setLista] = useState<Agendamento[]>([])
  const [filtro, setFiltro] = useState<Filtro>('proximas')
  const [agora, setAgora] = useState(() => new Date())
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarTodosAgendamentos(setLista)
  }, [backend, usuario])

  // O botão "Abrir mesa" acende sozinho quando chega a hora — sem isto, o
  // Rodrigo teria que recarregar a página para ver a consulta das 17h liberar.
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const visiveis = useMemo(() => {
    const ordenada = [...lista].sort((a, b) =>
      `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`),
    )
    if (filtro === 'pendentes') {
      return ordenada.filter((a) => a.status === 'aguardando' || a.status === 'pago')
    }
    if (filtro === 'proximas') {
      return ordenada.filter((a) => a.status !== 'cancelado' && !jaPassou(a.data, a.hora, agora))
    }
    return ordenada.reverse()
  }, [lista, filtro, agora])

  if (!usuario) return null

  const abrirMesa = async (a: Agendamento) => {
    if (!backend || ocupado) return
    setErro(null)
    setOcupado(a.id)
    try {
      const id = await backend.criarSessao({
        tarologoUid: usuario.uid,
        tarologoNome: usuario.nome,
        // A mesa já nasce com dono e convidado. É isto que a torna exclusiva
        // daquele cliente: ninguém mais consegue entrar, nem com o link.
        clienteUid: a.clienteUid,
        clienteNome: a.clienteNome,
        spreadId: SPREADS[0].id,
        visualTarologo: { baralhoId: null, panoId: null },
        cartas: [],
        encerrada: false,
        titulo: `${a.planoTitulo} — ${a.clienteNome}`,
        agendamentoId: a.id,
      })
      await backend.atualizarAgendamento(a.id, { sessaoId: id })
      irPara(`/tiragem/${id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a mesa.')
    } finally {
      setOcupado(null)
    }
  }

  const confirmar = async (a: Agendamento) => {
    if (!backend || ocupado) return
    setOcupado(a.id)
    try {
      await backend.atualizarAgendamento(a.id, { status: 'confirmado' })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => {
          const on = f.id === filtro
          const quantos =
            f.id === 'pendentes'
              ? lista.filter((a) => a.status === 'aguardando' || a.status === 'pago').length
              : null
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className="rounded-full px-4 py-1.5 text-[14px] transition"
              style={{
                color: on ? '#fff' : '#cbbde8',
                background: on ? '#ffffff14' : 'transparent',
                boxShadow: on ? '0 0 22px -8px var(--color-violet)' : 'none',
              }}
            >
              {f.rotulo}
              {quantos ? ` (${quantos})` : ''}
            </button>
          )
        })}
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
          {erro}
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className="glass rounded-2xl px-5 py-8 text-center text-[15px] text-mist/70">
          Nada por aqui{filtro === 'proximas' ? ' — nenhuma consulta marcada à frente.' : '.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((a) => {
            const naHora = naJanela(a.data, a.hora, agora)
            const passou = jaPassou(a.data, a.hora, agora)
            const podeAbrir = a.status === 'confirmado' && naHora && !a.sessaoId
            return (
              <li key={a.id} className="glass rounded-2xl px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[17px] text-star">
                      {a.clienteNome}
                      <span className="text-mist/60"> · {a.planoTitulo}</span>
                    </p>
                    <p className="mt-1 text-[14px] text-mist/75">
                      {rotuloCompleto(a.data)}, às {a.hora} · {FORMATO[a.formato] ?? a.formato}
                      {a.status !== 'cancelado' && !passou && ` · ${faltam(a.data, a.hora, agora)}`}
                    </p>
                    <p className="mt-1 text-[13px] text-mist/55">
                      {formatPriceFull(a.preco)} · {a.contato || 'sem contato'} · {a.codigo}
                    </p>
                  </div>
                  <SeloStatus status={a.status} />
                </div>

                {a.observacao && (
                  <p className="mt-3 whitespace-pre-line border-l-2 border-white/12 pl-3 text-[14px] leading-relaxed text-mist/70">
                    {a.observacao}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                  {a.sessaoId ? (
                    <a
                      href={`#/tiragem/${a.sessaoId}`}
                      className="rounded-full px-5 py-2 text-[15px] font-medium text-star transition"
                      style={{
                        background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                        boxShadow: '0 10px 30px -14px #c2449d',
                      }}
                    >
                      Entrar na mesa
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={!podeAbrir || ocupado === a.id}
                      onClick={() => void abrirMesa(a)}
                      title={
                        a.status !== 'confirmado'
                          ? 'Confirme o pagamento antes de abrir a mesa.'
                          : passou
                            ? 'O horário desta consulta já passou.'
                            : !naHora
                              ? `A mesa abre ${faltam(a.data, a.hora, agora)}.`
                              : undefined
                      }
                      className="rounded-full px-5 py-2 text-[15px] font-medium text-star transition disabled:cursor-not-allowed disabled:opacity-35"
                      style={{
                        background: podeAbrir
                          ? 'linear-gradient(100deg, #6d3fd4, #c2449d)'
                          : '#ffffff12',
                        boxShadow: podeAbrir ? '0 10px 30px -14px #c2449d' : 'none',
                      }}
                    >
                      {ocupado === a.id ? 'Abrindo…' : 'Abrir mesa'}
                    </button>
                  )}

                  {(a.status === 'aguardando' || a.status === 'pago') && (
                    <button
                      type="button"
                      disabled={ocupado === a.id}
                      onClick={() => void confirmar(a)}
                      className="rounded-full border border-gold/50 bg-gold/10 px-5 py-2 text-[15px] text-gold transition hover:bg-gold/20 disabled:opacity-50"
                    >
                      Confirmar pagamento
                    </button>
                  )}

                  <a
                    href={`#/pagamento/${a.id}`}
                    className="ml-auto text-[14px] text-mist/70 transition hover:text-star"
                  >
                    Detalhes →
                  </a>
                </div>

                {!a.sessaoId && a.status === 'confirmado' && !naHora && !passou && (
                  <p className="mt-2 text-[13px] text-mist/55">
                    O botão de abrir a mesa acende 15 minutos antes do horário.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
