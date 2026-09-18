import { useEffect, useMemo, useState } from 'react'
import { categories, formatPriceFull } from '../data/plans'
import { EMAIL_TAROLOGO } from '../lib/backend/tarologo'
import type { Agendamento } from '../lib/backend'
import { useAuth } from '../lib/useAuth'
import { useTarologos } from '../lib/tarologos'

type Secao = 'resumo' | 'profissionais'
type DadosPix = { chave: string; nome: string; cidade: string }
type Formulario = {
  nome: string
  email: string
  foto: string
  personagem: string
  bio: string
  modalidades: Record<string, number>
  ativo: boolean
}

const PIX_VAZIO: DadosPix = { chave: '', nome: '', cidade: '' }
const FOTO_RODRIGO = `${import.meta.env.BASE_URL}rodrigo-foto.jpg`
const PERSONAGEM_RODRIGO = `${import.meta.env.BASE_URL}rodrigo.webp`
const PLANOS = categories.flatMap((categoria) => categoria.plans)
const MODALIDADES_RODRIGO = Object.fromEntries(PLANOS.map((plano) => [plano.id, plano.price]))
const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-star outline-none transition placeholder:text-mist/45 focus:border-gold/60'

function novoFormulario(): Formulario {
  return {
    nome: '',
    email: '',
    foto: '',
    personagem: '',
    bio: '',
    modalidades: {},
    ativo: true,
  }
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

function CardNumero({ rotulo, numero, detalhe }: { rotulo: string; numero: string | number; detalhe?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-[12px] uppercase tracking-[0.16em] text-mist/65">{rotulo}</p>
      <p className="mt-2 font-display text-2xl text-star sm:text-3xl">{numero}</p>
      {detalhe && <p className="mt-2 text-[12px] leading-relaxed text-mist/55">{detalhe}</p>}
    </div>
  )
}

export default function AdminPage() {
  const { usuario, backend, carregando: carregandoConta } = useAuth()
  const { tarologos, carregando: carregandoTarologos, erro: erroTarologos } = useTarologos()
  const [secao, setSecao] = useState<Secao>('resumo')
  const [semanaDeslocada, setSemanaDeslocada] = useState(0)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [erroAgendamentos, setErroAgendamentos] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(novoFormulario)
  const [pix, setPix] = useState<DadosPix>(PIX_VAZIO)
  const [carregandoPix, setCarregandoPix] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)

  useEffect(() => {
    if (!backend || !usuario?.admin) return
    try {
      return backend.observarTodosAgendamentos((lista) => {
        setAgendamentos(lista)
        setErroAgendamentos(null)
      })
    } catch (erro) {
      setErroAgendamentos(erro instanceof Error ? erro.message : 'Não foi possível carregar os agendamentos.')
    }
  }, [backend, usuario?.admin])

  useEffect(() => {
    if (!selecionado) return
    const existente = tarologos.find((tarologo) => tarologo.uid === selecionado)
    if (!existente) return
    setFormulario({
      nome: existente.nome,
      email: existente.email,
      foto: existente.foto,
      personagem: existente.personagem,
      bio: existente.bio,
      modalidades: { ...existente.modalidades },
      ativo: existente.ativo,
    })
  }, [selecionado, tarologos])

  useEffect(() => {
    setPix(PIX_VAZIO)
    if (!backend || !usuario?.admin || !selecionado) {
      setCarregandoPix(false)
      return
    }
    setCarregandoPix(true)
    return backend.observarPixTarologo(selecionado, (dados) => {
      setPix({
        chave: dados?.chave ?? '',
        nome: dados?.nome ?? '',
        cidade: dados?.cidade ?? '',
      })
      setCarregandoPix(false)
    })
  }, [backend, usuario?.admin, selecionado])

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

  const porProfissional = useMemo(() => {
    const mapa = new Map<string, { agendados: number; confirmados: number; concluidos: number; valor: number; aguardando: number; pagosInformados: number }>()
    for (const atendimento of agendamentos) {
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
  }, [agendamentos, inicioChave, fimChave])

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

  const escolher = (uid: string | null) => {
    setSelecionado(uid)
    setMensagem(null)
    setErroEdicao(null)
    if (!uid) {
      setFormulario(novoFormulario())
      setPix(PIX_VAZIO)
    }
  }

  const atualizarFormulario = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) => {
    setFormulario((atual) => ({ ...atual, [chave]: valor }))
    setMensagem(null)
  }

  const alternarPlano = (id: string, precoPadrao: number, ativar: boolean) => {
    setFormulario((atual) => {
      const modalidades = { ...atual.modalidades }
      if (ativar) modalidades[id] = precoPadrao
      else delete modalidades[id]
      return { ...atual, modalidades }
    })
  }

  const salvar = async () => {
    if (!backend || salvando || carregandoPix) return
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
    if (Object.values(formulario.modalidades).some((preco) => !Number.isFinite(preco) || preco <= 0)) {
      setErroEdicao('Cada modalidade ativa precisa ter um valor maior que zero.')
      return
    }
    const chave = pix.chave.trim()
    const titular = pix.nome.trim()
    const cidade = pix.cidade.trim()
    if ([chave, titular, cidade].some(Boolean) && ![chave, titular, cidade].every(Boolean)) {
      setErroEdicao('Preencha chave, nome do recebedor e cidade para configurar o Pix.')
      return
    }
    if (formulario.ativo && ![chave, titular, cidade].every(Boolean)) {
      setErroEdicao('Configure o Pix antes de ativar o perfil para agendamentos.')
      return
    }
    setSalvando(true)
    setErroEdicao(null)
    setMensagem(null)
    const uid = selecionado ?? email
    try {
      await backend.salvarTarologo(uid, {
        nome,
        email,
        foto: formulario.foto.trim(),
        personagem: formulario.personagem.trim(),
        bio: formulario.bio.trim(),
        modalidades: formulario.modalidades,
        ativo: formulario.ativo,
        ...(!selecionado ? { avaliacao: { media: 5, total: 0 } } : {}),
      })
      // O cadastro público precisa existir antes de criar o documento Pix privado.
      if ([chave, titular, cidade].every(Boolean)) {
        await backend.salvarPixTarologo(uid, { chave, nome: titular, cidade })
      }
      setSelecionado(uid)
      setMensagem('Perfil e dados Pix salvos.')
    } catch (erro) {
      setErroEdicao(
        erro instanceof Error
          ? `Não foi possível concluir: ${erro.message}. Confira também os dados Pix antes de publicar o perfil.`
          : 'Não foi possível concluir. Confira os dados do perfil e do Pix.',
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregandoConta) {
    return <main className="grid min-h-[60vh] place-items-center text-mist">Carregando acesso…</main>
  }
  if (!usuario?.admin) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-display text-3xl text-star">Acesso restrito</h1>
        <p className="mt-3 text-mist/75">Esta área está disponível apenas para a administração do DigiTarot.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-[12px] uppercase tracking-[0.24em] text-gold">DigiTarot · Administração</p>
          <h1 className="mt-2 font-display text-3xl text-star sm:text-4xl">Visão dos atendimentos</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist/70">
            Acompanhe os profissionais e organize os serviços oferecidos no site.
          </p>
        </div>
        <div className="flex rounded-full border border-white/15 bg-white/[0.04] p-1" aria-label="Seções da administração">
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
        </div>
      </div>

      {secao === 'resumo' ? (
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CardNumero rotulo="Reservas agendadas" numero={totais.agendados} detalhe="Reservas da semana, excluindo as canceladas." />
            <CardNumero rotulo="Atendimentos confirmados" numero={totais.confirmados} />
            <CardNumero rotulo="Atendimentos concluídos" numero={totais.concluidos} detalhe="Marcados como atendidos pelo tarólogo." />
            <CardNumero rotulo="Valor confirmado manualmente" numero={formatPriceFull(totais.valor)} detalhe="Soma dos preços dos atendimentos confirmados. Não representa conciliação bancária." />
            <CardNumero rotulo="Pagamento informado" numero={totais.pagosInformados} detalhe="Clientes avisaram que pagaram; ainda requer conferência." />
            <CardNumero rotulo="Aguardando pagamento" numero={totais.aguardando} />
          </div>
          <h3 className="mt-9 font-display text-xl text-star">Por tarólogo</h3>
          {carregandoTarologos && <p className="mt-4 text-[14px] text-mist/65">Carregando perfis…</p>}
          {erroTarologos && <p role="alert" className="mt-4 text-[14px] text-rose">{erroTarologos}</p>}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {tarologos.map((tarologo) => {
              const numeros = porProfissional.get(tarologo.uid) ?? { agendados: 0, confirmados: 0, concluidos: 0, valor: 0, aguardando: 0, pagosInformados: 0 }
              return (
                <article key={tarologo.uid} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    {tarologo.foto ? <img src={tarologo.foto} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-violet/40 text-star">{tarologo.nome.slice(0, 1).toUpperCase()}</span>}
                    <div className="min-w-0">
                      <h4 className="truncate font-display text-lg text-star">{tarologo.nome}</h4>
                      <p className="truncate text-[12px] text-mist/55">{tarologo.email}</p>
                    </div>
                    {!tarologo.ativo && <span className="ml-auto rounded-full border border-white/15 px-2 py-1 text-[11px] text-mist/60">Inativo</span>}
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-[13px] sm:grid-cols-3">
                    <div><dt className="text-mist/55">Agendados</dt><dd className="mt-1 text-lg text-star">{numeros.agendados}</dd></div>
                    <div><dt className="text-mist/55">Confirmados</dt><dd className="mt-1 text-lg text-star">{numeros.confirmados}</dd></div>
                    <div><dt className="text-mist/55">Concluídos</dt><dd className="mt-1 text-lg text-star">{numeros.concluidos}</dd></div>
                    <div><dt className="text-mist/55">Valor manual</dt><dd className="mt-1 text-lg text-gold">{formatPriceFull(numeros.valor)}</dd></div>
                    <div><dt className="text-mist/55">Pagamento informado</dt><dd className="mt-1 text-lg text-star">{numeros.pagosInformados}</dd></div>
                    <div><dt className="text-mist/55">Aguardando</dt><dd className="mt-1 text-lg text-star">{numeros.aguardando}</dd></div>
                  </dl>
                </article>
              )
            })}
          </div>
          {!carregandoTarologos && tarologos.length === 0 && <p className="mt-5 text-[14px] text-mist/65">Nenhum tarólogo cadastrado ainda.</p>}
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
                <h2 className="font-display text-2xl text-star">{selecionado ? 'Editar perfil' : 'Novo tarólogo'}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-mist/65">O perfil fica associado ao e-mail. O profissional deve entrar no DigiTarot com esse mesmo endereço.</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-star">
                <input type="checkbox" checked={formulario.ativo} onChange={(e) => atualizarFormulario('ativo', e.target.checked)} className="h-4 w-4 accent-[#d8b978]" />
                Perfil ativo
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">Nome público</span><input className={CAMPO} value={formulario.nome} onChange={(e) => atualizarFormulario('nome', e.target.value)} maxLength={80} autoComplete="name" /></label>
              <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">E-mail de acesso</span><input className={CAMPO} type="email" value={formulario.email} onChange={(e) => {
                const email = e.target.value
                atualizarFormulario('email', email)
                if (!selecionado && email.trim().toLowerCase() === EMAIL_TAROLOGO) {
                  setFormulario((atual) => ({ ...atual, nome: atual.nome || 'Rodrigo', foto: atual.foto || FOTO_RODRIGO, personagem: atual.personagem || PERSONAGEM_RODRIGO, modalidades: { ...MODALIDADES_RODRIGO, ...atual.modalidades } }))
                }
              }} disabled={Boolean(selecionado)} autoComplete="email" /></label>
              <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">URL da foto</span><input className={CAMPO} type="url" value={formulario.foto} onChange={(e) => atualizarFormulario('foto', e.target.value)} placeholder="https://…" /></label>
              <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">URL da imagem do personagem</span><input className={CAMPO} value={formulario.personagem} onChange={(e) => atualizarFormulario('personagem', e.target.value)} placeholder="Imagem PNG ou WebP" /></label>
            </div>
            <label className="mt-4 block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">Apresentação</span><textarea className={`${CAMPO} min-h-28 resize-y`} value={formulario.bio} onChange={(e) => atualizarFormulario('bio', e.target.value)} maxLength={1000} placeholder="Conte aos clientes sobre o trabalho deste tarólogo." /></label>

            <div className="mt-8 border-t border-white/10 pt-7">
              <h3 className="font-display text-xl text-star">Modalidades e preços</h3>
              <p className="mt-1 text-[13px] text-mist/65">Ative apenas as tiragens que este profissional oferece. Os preços do Rodrigo começam com os valores atuais do catálogo.</p>
              <div className="mt-5 space-y-5">
                {categories.map((categoria) => (
                  <fieldset key={categoria.id} className="rounded-xl border border-white/10 p-4">
                    <legend className="px-2 font-display text-[16px] text-star">{categoria.icon} {categoria.title}</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {categoria.plans.map((plano) => {
                        const ativo = Object.hasOwn(formulario.modalidades, plano.id)
                        return (
                          <div key={plano.id} className="rounded-xl border border-white/10 bg-void/20 p-3">
                            <label className="flex items-start gap-2 text-[13px] text-star"><input type="checkbox" checked={ativo} onChange={(e) => alternarPlano(plano.id, plano.price, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#d8b978]" /><span>{plano.title}</span></label>
                            {ativo && <label className="mt-3 block text-[12px] text-mist/65">Preço (R$)<input className={`${CAMPO} mt-1`} type="number" min="0.01" step="0.01" inputMode="decimal" value={formulario.modalidades[plano.id]} onChange={(e) => setFormulario((atual) => ({ ...atual, modalidades: { ...atual.modalidades, [plano.id]: Number(e.target.value) } }))} /></label>}
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-7">
              <h3 className="font-display text-xl text-star">Pix do profissional</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-mist/65">Estes dados ficam em uma área privada. A chave Pix e o nome do recebedor aparecem para o cliente após reservar, para ele conferir a cobrança.</p>
              {carregandoPix ? <p className="mt-4 text-[13px] text-mist/60">Carregando dados Pix…</p> : (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block sm:col-span-3"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">Chave Pix</span><input className={CAMPO} value={pix.chave} onChange={(e) => setPix((atual) => ({ ...atual, chave: e.target.value }))} autoComplete="off" placeholder="Chave aleatória, e-mail ou telefone" /></label>
                  <label className="block sm:col-span-2"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">Nome do recebedor</span><input className={CAMPO} value={pix.nome} onChange={(e) => setPix((atual) => ({ ...atual, nome: e.target.value }))} maxLength={25} /></label>
                  <label className="block"><span className="mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-mist/65">Cidade</span><input className={CAMPO} value={pix.cidade} onChange={(e) => setPix((atual) => ({ ...atual, cidade: e.target.value }))} maxLength={15} /></label>
                </div>
              )}
            </div>

            {erroEdicao && <p role="alert" className="mt-5 rounded-xl border border-rose/40 bg-rose/10 p-3 text-[13px] text-rose">{erroEdicao}</p>}
            {mensagem && <p role="status" className="mt-5 rounded-xl border border-gold/35 bg-gold/10 p-3 text-[13px] text-gold">{mensagem}</p>}
            <div className="mt-7 flex justify-end">
              <button type="button" onClick={() => void salvar()} disabled={salvando || carregandoPix} className="rounded-full bg-gold px-7 py-3 text-[14px] font-medium text-void transition hover:brightness-110 disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar perfil'}</button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
