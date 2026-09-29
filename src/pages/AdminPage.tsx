import { useEffect, useMemo, useState } from 'react'
import { formatPriceFull } from '../data/plans'
import { EMAIL_TAROLOGO } from '../lib/backend/tarologo'
import type { Agendamento } from '../lib/backend'
import { useAuth } from '../lib/useAuth'
import { useTarologos } from '../lib/tarologos'
import SeloStatus from '../components/agenda/SeloStatus'

type Secao = 'resumo' | 'profissionais'
type Formulario = { nome: string; email: string }

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-star outline-none transition placeholder:text-mist/45 focus:border-gold/60'

function novoFormulario(): Formulario {
  return { nome: '', email: '' }
}

function inicioDaSemana(data: Date): Date {
  const dia = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  dia.setDate(dia.getDate() - ((dia.getDay() + 6) % 7))
  return dia
}

function chaveDia(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
}

function rotuloDia(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(data)
}

function IndicadorCircular({ rotulo, numero, detalhe, proporcao, cor, simbolo }: { rotulo: string; numero: string | number; detalhe: string; proporcao: number; cor: string; simbolo: string }) {
  const percentual = Math.max(0, Math.min(100, proporcao * 100))
  return (
    <article className="flex min-w-0 flex-col items-center px-3 py-5 text-center sm:px-4">
      <div className="relative grid h-24 w-24 place-items-center">
        <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="43" fill="none" stroke="#ffffff14" strokeWidth="5" />
          <circle cx="50" cy="50" r="43" fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${percentual * 2.702} 270.2`} />
        </svg>
        <span aria-hidden className="font-display text-3xl" style={{ color: cor }}>{simbolo}</span>
      </div>
      <h3 className="mt-3 text-[12px] uppercase tracking-[0.13em] text-mist/65">{rotulo}</h3>
      <p className="mt-1 font-display text-2xl tabular-nums text-star">{numero}</p>
      <p className="mt-1 max-w-[12rem] text-[12px] leading-snug text-mist/55">{detalhe}</p>
    </article>
  )
}

function TarologoNaLista({ atendimento, tarologos }: { atendimento: Agendamento; tarologos: ReturnType<typeof useTarologos>['tarologos'] }) {
  const perfil = tarologos.find((item) => item.uid === (atendimento.tarologoUid || EMAIL_TAROLOGO))
  const nome = atendimento.tarologoNome || perfil?.nome || 'Tarólogo'
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      {perfil?.foto ? (
        <img src={perfil.foto} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet/40 text-xs text-star">{nome.slice(0, 1).toUpperCase()}</span>
      )}
      <span className="truncate">{nome}</span>
    </span>
  )
}

export default function AdminPage({ embutido = false }: { embutido?: boolean }) {
  const { usuario, backend, carregando: carregandoConta } = useAuth()
  const { tarologos, carregando: carregandoTarologos } = useTarologos()
  const [secao, setSecao] = useState<Secao>('resumo')
  const [semanaDeslocada, setSemanaDeslocada] = useState(0)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | Agendamento['status']>('todos')
  const [filtroTarologo, setFiltroTarologo] = useState('todos')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(true)
  const [erroAgendamentos, setErroAgendamentos] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(novoFormulario)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)

  useEffect(() => {
    if (!backend || usuario?.papel !== 'tarologo') return
    try {
      return backend.observarTodosAgendamentos(
        (lista) => {
          setAgendamentos(lista)
          setCarregandoAgendamentos(false)
          setErroAgendamentos(null)
        },
        (erro) => {
          setCarregandoAgendamentos(false)
          setErroAgendamentos(`Não foi possível carregar os agendamentos: ${erro.message}`)
        },
      )
    } catch (erro) {
      setCarregandoAgendamentos(false)
      setErroAgendamentos(erro instanceof Error ? erro.message : 'Não foi possível carregar os agendamentos.')
    }
  }, [backend, usuario?.papel, usuario?.email])

  useEffect(() => {
    if (!selecionado) return
    const existente = tarologos.find((tarologo) => tarologo.uid === selecionado)
    if (!existente) return
    setFormulario({ nome: existente.nome, email: existente.email })
  }, [selecionado, tarologos])

  const inicio = useMemo(() => {
    const data = inicioDaSemana(new Date())
    data.setDate(data.getDate() + semanaDeslocada * 7)
    return data
  }, [semanaDeslocada])
  const fim = useMemo(() => {
    const data = new Date(inicio)
    data.setDate(data.getDate() + 6)
    return data
  }, [inicio])
  const inicioChave = chaveDia(inicio)
  const fimChave = chaveDia(fim)

  const agendamentosVisiveis = useMemo(() => usuario?.admin
    ? agendamentos
    : agendamentos.filter((item) => (item.tarologoUid || EMAIL_TAROLOGO) === usuario?.email.toLowerCase()),
  [agendamentos, usuario?.admin, usuario?.email])

  const porProfissional = useMemo(() => {
    const mapa = new Map<string, { agendados: number; confirmados: number; concluidos: number; valor: number; aguardando: number; pagosInformados: number }>()
    for (const atendimento of agendamentosVisiveis) {
      if (atendimento.data < inicioChave || atendimento.data > fimChave) continue
      // Reservas anteriores ao cadastro de vários tarólogos pertenciam ao Rodrigo.
      const uid = atendimento.tarologoUid || EMAIL_TAROLOGO
      const linha = mapa.get(uid) ?? { agendados: 0, confirmados: 0, concluidos: 0, valor: 0, aguardando: 0, pagosInformados: 0 }
      if (atendimento.status !== 'cancelado') linha.agendados += 1
      if (atendimento.atendidoEm) linha.concluidos += 1
      if (atendimento.status === 'confirmado') {
        linha.confirmados += 1
        linha.valor += Number.isFinite(atendimento.preco) ? atendimento.preco : 0
      } else if (atendimento.status === 'pago') {
        linha.pagosInformados += 1
      } else if (atendimento.status === 'aguardando') {
        linha.aguardando += 1
      }
      mapa.set(uid, linha)
    }
    return mapa
  }, [agendamentosVisiveis, inicioChave, fimChave])

  const totais = useMemo(() => {
    const total = { agendados: 0, confirmados: 0, concluidos: 0, valor: 0, aguardando: 0, pagosInformados: 0 }
    for (const linha of porProfissional.values()) {
      total.agendados += linha.agendados
      total.confirmados += linha.confirmados
      total.concluidos += linha.concluidos
      total.valor += linha.valor
      total.aguardando += linha.aguardando
      total.pagosInformados += linha.pagosInformados
    }
    return total
  }, [porProfissional])
  const agendamentosDaSemana = useMemo(() => agendamentosVisiveis.filter((item) => item.data >= inicioChave && item.data <= fimChave), [agendamentosVisiveis, inicioChave, fimChave])
  const valorReservado = agendamentosDaSemana.reduce((total, item) => total + (item.status !== 'cancelado' && Number.isFinite(item.preco) ? item.preco : 0), 0)
  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return agendamentosDaSemana
      .filter((item) => filtroStatus === 'todos' || item.status === filtroStatus)
      .filter((item) => filtroTarologo === 'todos' || (item.tarologoUid || EMAIL_TAROLOGO) === filtroTarologo)
      .filter((item) => !termo || [item.clienteNome, item.planoTitulo, item.tarologoNome, item.codigo].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termo)))
      .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))
  }, [agendamentosDaSemana, busca, filtroStatus, filtroTarologo])

  const escolher = (uid: string | null) => {
    setSelecionado(uid)
    setMensagem(null)
    setErroEdicao(null)
    if (!uid) {
      setFormulario(novoFormulario())
    }
  }

  const atualizarFormulario = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) => {
    setFormulario((atual) => ({ ...atual, [chave]: valor }))
    setMensagem(null)
  }

  const salvar = async () => {
    if (!backend || !usuario?.admin || salvando) return
    const email = formulario.email.trim().toLowerCase()
    const nome = formulario.nome.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !nome) {
      setErroEdicao('Informe um nome e um e-mail válido.')
      return
    }
    if (selecionado && email !== selecionado) {
      setErroEdicao('O e-mail de um perfil existente não pode ser alterado. Crie outro perfil para usar um novo endereço.')
      return
    }
    setSalvando(true)
    setErroEdicao(null)
    setMensagem(null)
    const uid = selecionado ?? email
    try {
      await backend.salvarTarologo(uid, { nome, email })
      setSelecionado(uid)
      setMensagem(selecionado ? 'Nome atualizado.' : 'Acesso cadastrado. O tarólogo pode entrar com este e-mail e preencher o próprio perfil.')
    } catch (erro) {
      setErroEdicao(
        erro instanceof Error
          ? `Não foi possível concluir: ${erro.message}`
          : 'Não foi possível cadastrar o acesso.',
      )
    } finally {
      setSalvando(false)
    }
  }

  const remover = async () => {
    if (!backend || !usuario?.admin || !selecionado || selecionado === EMAIL_TAROLOGO || salvando) return
    const profissional = tarologos.find((item) => item.uid === selecionado)
    const pendentes = agendamentos.filter((item) => item.tarologoUid === selecionado
      && item.data >= chaveDia(new Date())
      && item.status !== 'cancelado'
      && !item.atendidoEm).length
    const avisoReservas = pendentes > 0
      ? `\n\nAtenção: há ${pendentes} ${pendentes === 1 ? 'reserva futura ou pendente' : 'reservas futuras ou pendentes'} com este profissional. Resolva esses atendimentos com os clientes.`
      : ''
    if (!window.confirm(`Remover ${profissional?.nome ?? selecionado} da equipe de tarólogos?\n\nA carta pública e a chave Pix serão removidas. A conta de login continua existindo como cliente, e o histórico de atendimentos será preservado.${avisoReservas}`)) return
    setSalvando(true)
    setErroEdicao(null)
    setMensagem(null)
    try {
      await backend.removerTarologo(selecionado)
      setSelecionado(null)
      setFormulario(novoFormulario())
      setMensagem('Tarólogo removido. A conta agora pode ser usada como cliente.')
    } catch (erro) {
      setErroEdicao(erro instanceof Error ? `Não foi possível remover: ${erro.message}` : 'Não foi possível remover o tarólogo.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregandoConta) {
    return <main className="grid min-h-[60vh] place-items-center text-mist">Carregando acesso…</main>
  }
  if (usuario?.papel !== 'tarologo') {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-display text-3xl text-star">Acesso restrito</h1>
        <p className="mt-3 text-mist/75">Esta área está disponível apenas para tarólogos.</p>
      </main>
    )
  }

  const Container = embutido ? 'div' : 'main'
  return (
    <Container className={embutido ? 'mx-auto max-w-7xl' : 'mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-10 sm:px-8'}>
      <div className="mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-[12px] uppercase tracking-[0.24em] text-gold">DigiTarot · {usuario.admin ? 'Administração' : 'Seu faturamento'}</p>
          <h1 className="mt-2 font-display text-3xl text-star sm:text-4xl">{usuario.admin ? 'Gestão DigiTarot' : 'Meu faturamento'}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist/70">
            {usuario.admin ? 'Reservas, pagamentos e atendimentos da equipe em um só lugar.' : 'Seus atendimentos e valores confirmados em um só lugar.'}
          </p>
        </div>
        {usuario.admin && <div className="flex rounded-full border border-white/15 bg-white/[0.04] p-1" aria-label="Seções da administração">
          {([['resumo', 'Resumo semanal'], ['profissionais', 'Tarólogos']] as const).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSecao(id)}
              aria-pressed={secao === id}
              className={`rounded-full px-4 py-2 text-[13px] transition ${secao === id ? 'bg-gold text-void' : 'text-mist hover:text-star'}`}
            >
              {rotulo}
            </button>
          ))}
        </div>}
      </div>

      {secao === 'resumo' || !usuario.admin ? (
        <section aria-label="Resumo semanal">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-star">Semana de {rotuloDia(inicio)} a {rotuloDia(fim)}</h2>
              <p className="mt-1 text-[13px] text-mist/60">Os números usam a data marcada para a consulta.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSemanaDeslocada((n) => n - 1)} aria-label="Semana anterior" className="rounded-full border border-white/20 px-3 py-2 text-star transition hover:border-gold/60">←</button>
              <button type="button" onClick={() => setSemanaDeslocada(0)} disabled={semanaDeslocada === 0} className="rounded-full border border-white/20 px-4 py-2 text-[13px] text-star transition hover:border-gold/60 disabled:opacity-40">Esta semana</button>
              <button type="button" onClick={() => setSemanaDeslocada((n) => n + 1)} aria-label="Próxima semana" className="rounded-full border border-white/20 px-3 py-2 text-star transition hover:border-gold/60">→</button>
            </div>
          </div>
          {erroAgendamentos && <p role="alert" className="mb-5 rounded-xl border border-rose/40 bg-rose/10 p-4 text-[14px] text-rose">{erroAgendamentos}</p>}
          <div className="grid grid-cols-2 overflow-hidden rounded-[24px] border border-white/10 bg-[#171025]/90 shadow-[0_18px_55px_-40px_#05010d] md:grid-cols-4 md:divide-x md:divide-white/10">
            <IndicadorCircular rotulo="Reservas" numero={totais.agendados} detalhe="Agendadas nesta semana" proporcao={totais.agendados ? 1 : 0} cor="#a580ef" simbolo="✦" />
            <IndicadorCircular rotulo="Confirmadas" numero={totais.confirmados} detalhe="Pagamento conferido" proporcao={totais.agendados ? totais.confirmados / totais.agendados : 0} cor="#f2d492" simbolo="◇" />
            <IndicadorCircular rotulo="Concluídas" numero={totais.concluidos} detalhe="Atendimento realizado" proporcao={totais.agendados ? totais.concluidos / totais.agendados : 0} cor="#7ddba4" simbolo="☾" />
            <IndicadorCircular rotulo="Valor confirmado" numero={formatPriceFull(totais.valor)} detalhe="Conferido manualmente" proporcao={valorReservado ? totais.valor / valorReservado : 0} cor="#eaa5cf" simbolo="✧" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 px-1 text-[12px] text-mist/60">
            <span><strong className="font-medium text-star">{totais.pagosInformados}</strong> pagamentos informados, ainda em conferência</span>
            <span><strong className="font-medium text-star">{totais.aguardando}</strong> aguardando pagamento</span>
          </div>
          <section aria-labelledby="titulo-atendimentos" className="mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#151020]/90">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Lista da semana</p>
                <h3 id="titulo-atendimentos" className="mt-1 font-display text-xl text-star">Atendimentos</h3>
                <p className="mt-1 text-[12px] text-mist/60">{linhasFiltradas.length} {linhasFiltradas.length === 1 ? 'resultado' : 'resultados'} no período selecionado</p>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <label className="min-w-[10rem] flex-1 sm:flex-none">
                  <span className="sr-only">Buscar atendimento</span>
                  <input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar cliente ou leitura" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] text-star outline-none placeholder:text-mist/45 focus:border-gold/60" />
                </label>
                <label>
                  <span className="sr-only">Filtrar por status</span>
                  <select value={filtroStatus} onChange={(evento) => setFiltroStatus(evento.target.value as typeof filtroStatus)} className="rounded-xl border border-white/15 bg-[#21172e] px-3 py-2.5 text-[13px] text-star outline-none focus:border-gold/60">
                    <option value="todos">Todos os status</option>
                    <option value="aguardando">Aguardando pagamento</option>
                    <option value="pago">Pagamento informado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
                {usuario.admin && <label>
                  <span className="sr-only">Filtrar por tarólogo</span>
                  <select value={filtroTarologo} onChange={(evento) => setFiltroTarologo(evento.target.value)} className="rounded-xl border border-white/15 bg-[#21172e] px-3 py-2.5 text-[13px] text-star outline-none focus:border-gold/60">
                    <option value="todos">Todos os tarólogos</option>
                    {tarologos.map((tarologo) => <option key={tarologo.uid} value={tarologo.uid}>{tarologo.nome}</option>)}
                  </select>
                </label>}
              </div>
            </div>
            {carregandoAgendamentos ? (
              <p className="px-6 py-12 text-center text-[14px] text-mist/65">Carregando atendimentos…</p>
            ) : erroAgendamentos ? (
              <p role="alert" className="px-6 py-10 text-center text-[14px] text-rose">Não foi possível mostrar a lista de atendimentos.</p>
            ) : linhasFiltradas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-display text-lg text-star">Nenhum atendimento encontrado</p>
                <p className="mt-1 text-[13px] text-mist/60">Confira outra semana ou ajuste os filtros.</p>
              </div>
            ) : (
              <>
              <ul className="divide-y divide-white/10 md:hidden">
                {linhasFiltradas.map((atendimento) => (
                  <li key={atendimento.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="font-medium text-star">{atendimento.clienteNome || 'Cliente'}</p><p className="mt-0.5 truncate text-[12px] text-mist/60">{atendimento.planoTitulo || atendimento.categoriaTitulo}</p></div>
                      <span className={`shrink-0 font-display text-[17px] tabular-nums ${atendimento.status === 'cancelado' ? 'text-mist/45 line-through' : 'text-gold'}`}>{formatPriceFull(atendimento.preco)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><SeloStatus status={atendimento.status} /><span className="text-[12px] tabular-nums text-mist/60">{atendimento.data.split('-').reverse().join('/')} · {atendimento.hora}</span></div>
                    <p className="mt-2 text-[12px] text-mist/50"><TarologoNaLista atendimento={atendimento} tarologos={tarologos} /></p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                  <caption className="sr-only">Atendimentos de {rotuloDia(inicio)} a {rotuloDia(fim)}</caption>
                  <thead className="bg-white/[0.035] text-[11px] uppercase tracking-[0.12em] text-mist/55">
                    <tr><th scope="col" className="px-5 py-3 font-medium sm:px-6">Cliente / leitura</th><th scope="col" className="px-4 py-3 font-medium">Data</th><th scope="col" className="px-4 py-3 font-medium">Tarólogo</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Preço</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {linhasFiltradas.map((atendimento) => (
                      <tr key={atendimento.id} className="transition-colors hover:bg-white/[0.045]">
                        <td className="px-5 py-3.5 sm:px-6"><span className="block font-medium text-star">{atendimento.clienteNome || 'Cliente'}</span><span className="block max-w-[16rem] truncate text-[12px] text-mist/55">{atendimento.planoTitulo || atendimento.categoriaTitulo}</span></td>
                        <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-mist/75">{atendimento.data.split('-').reverse().join('/')} · {atendimento.hora}</td>
                        <td className="px-4 py-3.5 text-mist/75"><TarologoNaLista atendimento={atendimento} tarologos={tarologos} /></td>
                        <td className="px-4 py-3.5"><SeloStatus status={atendimento.status} /></td>
                        <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums sm:px-6 ${atendimento.status === 'cancelado' ? 'text-mist/45 line-through' : 'text-gold'}`}>{formatPriceFull(atendimento.preco)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
          <p className="mt-6 max-w-3xl text-[12px] leading-relaxed text-mist/55">
            “Confirmado” significa que o pagamento foi conferido manualmente no site. O Pix estático não informa automaticamente se o valor entrou na conta; confira o extrato para apurar receita liquidada.
          </p>
        </section>
      ) : (
        <section aria-label="Cadastro de tarólogos" className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <button type="button" onClick={() => escolher(null)} className={`w-full rounded-xl px-4 py-3 text-left text-[14px] transition ${selecionado === null ? 'bg-gold/15 text-gold' : 'text-star hover:bg-white/5'}`}>
              ＋ Adicionar tarólogo
            </button>
            <div className="mt-2 border-t border-white/10 pt-2">
              {tarologos.map((tarologo) => (
                <button key={tarologo.uid} type="button" onClick={() => escolher(tarologo.uid)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selecionado === tarologo.uid ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                  {tarologo.foto ? <img src={tarologo.foto} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-violet/40 text-star">{tarologo.nome.slice(0, 1).toUpperCase()}</span>}
                  <span className="min-w-0"><span className="block truncate text-[14px] text-star">{tarologo.nome}</span><span className="block truncate text-[11px] text-mist/55">{tarologo.ativo ? 'Ativo' : 'Inativo'} · {tarologo.email}</span></span>
                </button>
              ))}
              {!carregandoTarologos && tarologos.length === 0 && <p className="px-3 py-4 text-[13px] text-mist/60">Cadastre o primeiro perfil ao lado.</p>}
            </div>
          </aside>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-star">{selecionado ? 'Editar nome' : 'Novo tarólogo'}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-mist/65">Cadastre apenas nome e e-mail. O profissional entra com esse endereço e configura foto, apresentação, leituras, preços e Pix no próprio perfil.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">Nome público</span><input className={CAMPO} value={formulario.nome} onChange={(e) => atualizarFormulario('nome', e.target.value)} maxLength={80} autoComplete="name" /></label>
              <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">E-mail de acesso</span><input className={CAMPO} type="email" value={formulario.email} onChange={(e) => atualizarFormulario('email', e.target.value)} disabled={Boolean(selecionado)} autoComplete="email" /></label>
            </div>
            {erroEdicao && <p role="alert" className="mt-5 rounded-xl border border-rose/40 bg-rose/10 p-3 text-[13px] text-rose">{erroEdicao}</p>}
            {mensagem && <p role="status" className="mt-5 rounded-xl border border-gold/35 bg-gold/10 p-3 text-[13px] text-gold">{mensagem}</p>}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              {selecionado && selecionado !== EMAIL_TAROLOGO ? (
                <button type="button" onClick={() => void remover()} disabled={salvando} className="rounded-full border border-rose/40 px-5 py-3 text-[14px] text-rose transition hover:bg-rose/10 disabled:opacity-50">Remover tarólogo</button>
              ) : <span />}
              <button type="button" onClick={() => void salvar()} disabled={salvando} className="rounded-full bg-gold px-7 py-3 text-[14px] font-medium text-void transition hover:brightness-110 disabled:opacity-50">{salvando ? 'Salvando…' : selecionado ? 'Salvar nome' : 'Cadastrar acesso'}</button>
            </div>
          </div>
        </section>
      )}
    </Container>
  )
}
