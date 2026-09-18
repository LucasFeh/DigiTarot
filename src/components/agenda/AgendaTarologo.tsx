import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { irPara } from '../../lib/useHashRoute'
import { SPREADS } from '../../data/spreads'
import { formatPriceFull } from '../../data/plans'
import { faltam, jaPassou, naJanela, rotuloCompleto, rotuloDia } from '../../data/agenda'
import SeloStatus from './SeloStatus'
import type { Agendamento, Perfil } from '../../lib/backend'

const FORMATO: Record<string, string> = {
  organica: 'orgânica · vídeo da mesa',
  fotos: 'fotos com descrição',
  digital: 'tiragem digital · mesa 3D',
  chamada: 'chamada de vídeo',
  audio: 'áudio',
  escrito: 'por escrito',
}

type Filtro = 'proximas' | 'pendentes' | 'todas'
type Visual = 'lista' | 'grade' | 'dia'

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'proximas', rotulo: 'Próximas' },
  { id: 'pendentes', rotulo: 'Aguardando pagamento' },
  { id: 'todas', rotulo: 'Todas' },
]

const VISUAIS: { id: Visual; rotulo: string; icone: string }[] = [
  { id: 'lista', rotulo: 'Lista', icone: '☰' },
  { id: 'grade', rotulo: 'Ícones', icone: '▦' },
  { id: 'dia', rotulo: 'Por dia', icone: '☾' },
]

/** A foto de quem agendou, ou a inicial do nome quando não há foto. */
function Rosto({ nome, foto, tamanho = 46 }: { nome: string; foto?: string; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho }
  if (foto) {
    return <img src={foto} alt="" style={estilo} className="shrink-0 rounded-full object-cover" />
  }
  return (
    <span
      style={{ ...estilo, fontSize: tamanho * 0.38 }}
      className="grid shrink-0 place-items-center rounded-full bg-violet/40 font-semibold text-star"
    >
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * A agenda do tarólogo: quem marcou, quando, e o botão que abre a mesa daquela
 * pessoa.
 *
 * A mesa não abre sozinha no horário. Ela espera um clique — e o botão só
 * acende perto da hora marcada daquele cliente, depois do pagamento
 * confirmado. Abrir automaticamente deixaria salas acesas por consultas que
 * ninguém pagou nem apareceu.
 */
export default function AgendaTarologo() {
  const { usuario, backend } = useAuth()
  const [lista, setLista] = useState<Agendamento[]>([])
  const [perfis, setPerfis] = useState<Record<string, Perfil>>({})
  const [filtro, setFiltro] = useState<Filtro>('proximas')
  const [visual, setVisual] = useState<Visual>('lista')
  const [agora, setAgora] = useState(() => new Date())
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarTodosAgendamentos(setLista)
  }, [backend, usuario])

  // O botão "Abrir mesa" acende sozinho quando chega a hora — sem isto, seria
  // preciso recarregar a página para ver a consulta das 17h liberar.
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  /**
   * A foto de cada cliente vem do perfil dele, não do agendamento: ela muda
   * depois que a reserva foi feita, e o rosto certo é o de agora. Uma assinatura
   * por pessoa, e só de quem aparece na lista.
   */
  useEffect(() => {
    if (!backend || !usuario?.admin) return
    const uids = [...new Set(lista.map((a) => a.clienteUid))]
    const parar = uids.map((uid) =>
      backend.observarPerfil(uid, (p) => setPerfis((m) => ({ ...m, [uid]: p }))),
    )
    return () => parar.forEach((f) => f())
  }, [backend, lista, usuario?.admin])

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

  /** Agrupado por dia, para a visualização de agenda. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>()
    for (const a of visiveis) {
      const atual = mapa.get(a.data) ?? []
      atual.push(a)
      mapa.set(a.data, atual)
    }
    return [...mapa.entries()]
  }, [visiveis])

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
        // daquele cliente: ninguém mais entra, nem com o link.
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

  const marcarConcluido = async (a: Agendamento) => {
    if (!backend || ocupado || a.atendidoEm) return
    setErro(null)
    setOcupado(a.id)
    try {
      await backend.atualizarAgendamento(a.id, { atendidoEm: new Date().toISOString() })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar o atendimento.')
    } finally {
      setOcupado(null)
    }
  }

  /** Os botões de ação, iguais nas três visualizações. */
  const Acoes = ({ a }: { a: Agendamento }) => {
    const naHora = naJanela(a.data, a.hora, agora)
    const passou = jaPassou(a.data, a.hora, agora)
    const podeAbrir = a.status === 'confirmado' && naHora && !a.sessaoId
    return (
      <div className="flex flex-wrap items-center gap-2">
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
              background: podeAbrir ? 'linear-gradient(100deg, #6d3fd4, #c2449d)' : '#ffffff12',
              boxShadow: podeAbrir ? '0 10px 30px -14px #c2449d' : 'none',
            }}
          >
            {ocupado === a.id ? 'Abrindo…' : 'Abrir mesa'}
          </button>
        )}

        <a
          href={`#/pagamento/${a.id}`}
          className="rounded-full border border-white/25 px-5 py-2 text-[15px] text-mist transition hover:border-gold/60 hover:text-star"
        >
          Detalhes do pedido
        </a>

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
        {a.status === 'confirmado' && (passou || Boolean(a.sessaoId)) && (
          a.atendidoEm ? (
            <span className="rounded-full border border-gold/30 px-4 py-2 text-[13px] text-gold">Atendimento concluído</span>
          ) : (
            <button type="button" disabled={ocupado === a.id} onClick={() => void marcarConcluido(a)} className="rounded-full border border-gold/50 bg-gold/10 px-5 py-2 text-[14px] text-gold transition hover:bg-gold/20 disabled:opacity-50">
              Marcar atendimento concluído
            </button>
          )
        )}
      </div>
    )
  }

  /** O cartão da pessoa: rosto, nome em cima, telefone embaixo, hora da mesa. */
  const Pessoa = ({ a, grande = false }: { a: Agendamento; grande?: boolean }) => (
    <div className="flex min-w-0 items-center gap-3">
      <Rosto nome={a.clienteNome} foto={perfis[a.clienteUid]?.foto} tamanho={grande ? 58 : 46} />
      <div className="min-w-0">
        <p className={`truncate font-display text-star ${grande ? 'text-[18px]' : 'text-[17px]'}`}>
          {a.clienteNome}
        </p>
        <p className="truncate text-[14px] text-mist/75">{a.contato || 'sem telefone'}</p>
      </div>
    </div>
  )

  const Horario = ({ a, comData = true }: { a: Agendamento; comData?: boolean }) => {
    const passou = jaPassou(a.data, a.hora, agora)
    return (
      <p className="text-[14px] text-mist/75">
        <span className="text-gold">{a.hora}</span>
        {comData && ` · ${rotuloCompleto(a.data)}`}
        {a.status !== 'cancelado' && !passou && ` · ${faltam(a.data, a.hora, agora)}`}
      </p>
    )
  }

  return (
    <div>
      {/* ------------------------- filtros e visualização ------------------------- */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
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

        <div className="ml-auto flex items-center gap-1 rounded-full border border-white/12 bg-white/5 p-1">
          {VISUAIS.map((v) => {
            const on = v.id === visual
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVisual(v.id)}
                title={v.rotulo}
                aria-pressed={on}
                className="rounded-full px-3 py-1.5 text-[14px] transition"
                style={{
                  color: on ? '#fff' : '#cbbde8',
                  background: on ? '#ffffff1a' : 'transparent',
                }}
              >
                <span aria-hidden className="mr-1.5">
                  {v.icone}
                </span>
                {v.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
          {erro}
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className="glass rounded-2xl px-5 py-10 text-center text-[15px] text-mist/70">
          Nada por aqui{filtro === 'proximas' ? ' — nenhuma consulta marcada à frente.' : '.'}
        </p>
      ) : visual === 'lista' ? (
        // ------------------------------- lista -------------------------------
        <ul className="flex flex-col gap-3">
          {visiveis.map((a) => (
            <li key={a.id} className="glass rounded-2xl px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Pessoa a={a} />
                  <div className="mt-2.5">
                    <Horario a={a} />
                    <p className="mt-0.5 text-[13px] text-mist/55">
                      {a.planoTitulo} · {formatPriceFull(a.preco)} ·{' '}
                      {FORMATO[a.formato] ?? a.formato}
                    </p>
                  </div>
                </div>
                <SeloStatus status={a.status} />
              </div>
              <div className="mt-3 border-t border-white/8 pt-3">
                <Acoes a={a} />
              </div>
            </li>
          ))}
        </ul>
      ) : visual === 'grade' ? (
        // ------------------------------- ícones -------------------------------
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((a) => (
            <li key={a.id} className="glass flex flex-col rounded-2xl p-5">
              <Rosto nome={a.clienteNome} foto={perfis[a.clienteUid]?.foto} tamanho={64} />
              <p className="mt-3 truncate font-display text-[18px] text-star">{a.clienteNome}</p>
              <p className="truncate text-[14px] text-mist/75">{a.contato || 'sem telefone'}</p>
              <p className="mt-2 text-[14px] text-mist/75">
                <span className="text-gold">{a.hora}</span> ·{' '}
                {rotuloDia(a.data).numero} {rotuloDia(a.data).mes}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-mist/55">{a.planoTitulo}</p>
              {/* O selo ganha uma linha só sua. Ao lado do rosto, "pagamento em
                  conferência" — 24 caracteres em maiúsculas e espaçados — não
                  cabia na coluna e vazava para fora do cartão. */}
              <span className="mt-3 self-start">
                <SeloStatus status={a.status} />
              </span>
              <div className="mt-auto flex flex-col gap-2 border-t border-white/8 pt-3 [&>*]:w-full [&_a]:text-center">
                <Acoes a={a} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        // ----------------------------- por dia -----------------------------
        <div className="flex flex-col gap-6">
          {porDia.map(([dia, doDia]) => (
            <section key={dia}>
              <div className="mb-3 flex items-baseline gap-3 border-b border-white/10 pb-2">
                <h3 className="font-display text-[18px] text-star">{rotuloCompleto(dia)}</h3>
                <span className="text-[13px] text-mist/55">
                  {doDia.length} {doDia.length === 1 ? 'consulta' : 'consultas'}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {doDia.map((a) => (
                  <li
                    key={a.id}
                    className="glass flex flex-wrap items-center gap-4 rounded-2xl px-5 py-3.5"
                  >
                    <span className="font-display text-[20px] text-gold">{a.hora}</span>
                    <Pessoa a={a} />
                    <SeloStatus status={a.status} />
                    <span className="ml-auto">
                      <Acoes a={a} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
