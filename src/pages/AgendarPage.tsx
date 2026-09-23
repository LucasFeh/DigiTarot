import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import { irPara } from '../lib/useHashRoute'
import { PLAN_BY_ID, formatPriceFull } from '../data/plans'
import { useTarologos } from '../lib/tarologos'
import { cedoDemais, diasDisponiveis, rotuloCompleto, slotId } from '../data/agenda'
import SeletorHorario from '../components/agenda/SeletorHorario'
import CometaAgendamento from '../components/agenda/CometaAgendamento'
import AvisoModoLocal from '../components/AvisoModoLocal'
import LoginPage from './LoginPage'
import type { FormatoConsulta } from '../lib/backend'
import { FOTO_RODRIGO } from '../lib/backend/tarologo'
import './AgendarPage.css'

const FORMATOS: { id: FormatoConsulta; rotulo: string; descricao: string; icone: string }[] = [
  {
    id: 'organica',
    rotulo: 'Orgânica',
    descricao: 'O tarólogo faz a leitura com as cartas físicas e envia um vídeo da mesa.',
    icone: '◈',
  },
  {
    id: 'fotos',
    rotulo: 'Fotos',
    descricao: 'Você recebe fotos das cartas com a interpretação por escrito.',
    icone: '▣',
  },
  {
    id: 'digital',
    rotulo: 'Tiragem digital',
    descricao: 'Acompanhe as cartas aparecendo ao vivo na nossa mesa 3D e converse pelo chat.',
    icone: '✦',
  },
]

const CAMPO =
  'w-full rounded-xl border border-white/20 bg-[#171123] px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/45 focus:border-gold/70'

function ehTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '')
  return /^[+()\d\s.-]+$/.test(valor.trim()) && digitos.length >= 10 && digitos.length <= 15
}

function fotoDoTarologo(tarologo: { nome: string; foto: string }) {
  const ehRodrigo = tarologo.nome.trim().toLocaleLowerCase('pt-BR').includes('rodrigo')
  const fotoAntiga = !tarologo.foto || /(?:foto-tarologo-provisoria\.jpg|rodrigo\.(?:png|webp))(?:\?|$)/i.test(tarologo.foto)
  return ehRodrigo && fotoAntiga
    ? FOTO_RODRIGO
    : tarologo.foto || `${import.meta.env.BASE_URL}foto-tarologo-provisoria.jpg`
}

/** Código que liga a reserva ao Pix estático e ao comprovante. */
function novoCodigo() {
  return `DIGI${Date.now().toString(36).toUpperCase()}`
}

function Retrato({ foto, nome, lado }: { foto?: string; nome: string; lado: 'cliente' | 'tarologo' }) {
  return (
    <div className={`booking-person booking-person--${lado}`}>
      <span className="booking-avatar-shell">
        {foto ? (
          <img src={foto} alt={`Foto de ${nome}`} className="booking-avatar" />
        ) : (
          <span className="booking-avatar booking-avatar--initial" aria-label={nome}>
            {nome.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className="booking-person-name">{nome}</span>
      <span className="booking-person-role">{lado === 'cliente' ? 'Você' : 'Seu tarólogo'}</span>
    </div>
  )
}

export default function AgendarPage({ planoId }: { planoId: string }) {
  const { usuario, carregando, backend } = useAuth()
  const { perfil, pronto: perfilPronto, nomeExibido } = usePerfil(usuario)
  const { tarologos, carregando: carregandoTarologos, erro: erroTarologos } = useTarologos()
  const [tarologoId, setTarologoId] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'data' | 'formato'>('data')
  const [dia, setDia] = useState<string | null>(null)
  const [hora, setHora] = useState<string | null>(null)
  const [ocupados, setOcupados] = useState<string[]>([])
  const [formato, setFormato] = useState<FormatoConsulta | null>(null)
  const [observacao, setObservacao] = useState('')
  const [editandoDados, setEditandoDados] = useState(false)
  const [nomeRascunho, setNomeRascunho] = useState('')
  const [telefoneRascunho, setTelefoneRascunho] = useState('')
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [erroDados, setErroDados] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const item = PLAN_BY_ID.get(planoId)
  const disponiveis = tarologos.filter((t) => t.ativo && t.cartaoPublicado !== false && Number(t.modalidades[planoId]) > 0)
  const tarologo = disponiveis.find((t) => t.uid === tarologoId)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarHorariosOcupados(setOcupados)
  }, [backend, usuario])

  const tomados = useMemo(() => {
    if (!tarologoId) return new Set<string>()
    const prefixo = `${tarologoId}_`
    return new Set(
      ocupados.flatMap((slot) =>
        slot.startsWith(prefixo) ? [slot.slice(prefixo.length)] : slot.includes('_') ? [] : [slot],
      ),
    )
  }, [ocupados, tarologoId])

  if (carregando) {
    return <main className="grid min-h-[calc(100vh-4rem)] place-items-center text-mist">Carregando…</main>
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-nebula text-3xl">Consulta não encontrada</h1>
        <p className="mt-3 text-mist">Esse serviço não existe mais no catálogo.</p>
        <a href="#/tiragem" className="mt-7 inline-block text-gold hover:text-star">Ver o catálogo</a>
      </main>
    )
  }

  const { plano, categoria } = item
  if (!tarologo) {
    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-5 py-12">
        <a href="#/tiragem" className="text-[14px] text-mist/70 hover:text-star">← Voltar ao catálogo</a>
        <p className="mt-8 text-[12px] uppercase tracking-[0.25em] text-gold">{categoria.title}</p>
        <h1 className="text-nebula mt-2 text-3xl sm:text-5xl">Escolha seu tarólogo</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-mist/80">
          {plano.title}. Veja quem realiza esta modalidade e o valor de cada atendimento.
        </p>
        {carregandoTarologos ? (
          <p className="mt-10 text-mist/70">Carregando profissionais…</p>
        ) : erroTarologos ? (
          <p className="mt-10 rounded-xl border border-rose/40 bg-rose/10 p-4 text-rose">{erroTarologos}</p>
        ) : disponiveis.length === 0 ? (
          <p className="mt-10 rounded-xl border border-white/15 bg-white/5 p-5 text-mist">
            Nenhum tarólogo oferece esta modalidade no momento. Escolha outra carta no catálogo.
          </p>
        ) : (
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {disponiveis.map((t) => (
              <button
                key={t.uid}
                type="button"
                onClick={() => { setTarologoId(t.uid); setEtapa('data') }}
                className="glass flex items-center gap-5 rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-gold"
              >
                <img
                  src={fotoDoTarologo(t)}
                  alt={`Retrato de ${t.nome}`}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl text-star">{t.nome}</span>
                  <span className="mt-1 block line-clamp-2 text-[13px] leading-relaxed text-mist/70">{t.bio}</span>
                  <span className="mt-2 block text-[13px] text-gold">
                    {t.avaliacao.total ? `★ ${t.avaliacao.media.toFixed(1)} · ${t.avaliacao.total} avaliações` : '★★★★★ · avaliações em breve'}
                  </span>
                </span>
                <span className="shrink-0 font-display text-lg text-gold">{formatPriceFull(t.modalidades[planoId])}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    )
  }

  if (!usuario) {
    return <LoginPage titulo="Falta só entrar" descricao={`Sua consulta com ${tarologo.nome} ficará guardada na sua conta.`} />
  }

  const preco = tarologo.modalidades[planoId]
  const nomeCliente = perfil.nome.trim() || usuario.nome.trim()
  const contatoPerfil = perfil.contato.trim()
  const telefoneConta = usuario.telefone?.trim() ?? ''
  const telefoneCliente = ehTelefone(contatoPerfil) ? contatoPerfil : ehTelefone(telefoneConta) ? telefoneConta : ''
  const dadosValidos = Boolean(nomeRascunho.trim() && ehTelefone(telefoneRascunho))

  function abrirEdicaoDados() {
    setNomeRascunho(nomeCliente)
    setTelefoneRascunho(telefoneCliente)
    setErroDados(null)
    setEditandoDados(true)
  }

  async function confirmarDados() {
    if (!dadosValidos || !backend || !usuario || salvandoDados) return
    setSalvandoDados(true)
    setErroDados(null)
    try {
      await backend.salvarPerfil(usuario.uid, { nome: nomeRascunho.trim(), contato: telefoneRascunho.trim() })
      setEditandoDados(false)
    } catch {
      setErroDados('Não foi possível salvar seus dados. Tente novamente.')
    } finally {
      setSalvandoDados(false)
    }
  }

  const dataValida = Boolean(
    dia && hora && diasDisponiveis().includes(dia) && !tomados.has(slotId(dia, hora)) && !cedoDemais(dia, hora),
  )
  const pronto = dataValida && !editandoDados && Boolean(formato && perfilPronto && nomeCliente && telefoneCliente)

  const reservar = async () => {
    if (!backend || !dia || !hora || !formato || !pronto || enviando) return
    if (!diasDisponiveis(new Date()).includes(dia) || cedoDemais(dia, hora, new Date()) || tomados.has(slotId(dia, hora))) {
      setErro('Este horário não está mais disponível. Escolha outra data ou horário.')
      setEtapa('data')
      setHora(null)
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      const id = await backend.criarAgendamento({
        clienteUid: usuario.uid,
        clienteNome: nomeCliente,
        clienteEmail: usuario.email,
        contato: telefoneCliente,
        tarologoUid: tarologo.uid,
        tarologoNome: tarologo.nome,
        planoId: plano.id,
        planoTitulo: plano.title,
        categoriaTitulo: categoria.title,
        duracao: plano.duration ?? '',
        preco,
        data: dia,
        hora,
        formato,
        observacao: observacao.trim(),
        status: 'aguardando',
        codigo: novoCodigo(),
      })
      irPara(`/pagamento/${id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível reservar este horário.')
      setHora(null)
      setEtapa('data')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="booking-page relative mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-5 pb-24 pt-10 sm:pt-14">
      <div className="relative z-10"><AvisoModoLocal /></div>
      <div className="relative z-10">
        <button
          type="button"
          onClick={() => etapa === 'formato' ? setEtapa('data') : setTarologoId(null)}
          className="text-[14px] text-mist/70 transition hover:text-star"
        >
          ← {etapa === 'formato' ? 'Voltar à data' : 'Trocar tarólogo'}
        </button>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-gold">{categoria.title} · {etapa === 'data' ? '01 / 02' : '02 / 02'}</p>
            <h1 className="font-display mt-2 text-3xl leading-tight text-star sm:text-4xl">
              {etapa === 'data' ? 'Seu encontro começa aqui' : 'Como prefere receber a leitura?'}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.13em]">
            <span className={etapa === 'data' ? 'text-gold' : 'text-mist/50'}>Data</span>
            <span className="h-px w-8 bg-white/20" />
            <span className={etapa === 'formato' ? 'text-gold' : 'text-mist/50'}>Formato</span>
          </div>
        </div>

        <motion.section
          key={tarologo.uid}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="booking-journey mt-8"
          aria-label={`Sua pergunta vai até ${tarologo.nome}`}
        >
          <div className="booking-journey-stars" aria-hidden />
          <div className="booking-journey-copy">
            <p>{plano.title}</p>
            <strong>{formatPriceFull(preco)}</strong>
          </div>
          <div className="booking-flight" aria-hidden>
            <CometaAgendamento />
          </div>
          <Retrato foto={perfil.foto || usuario.foto} nome={nomeExibido} lado="cliente" />
          <Retrato foto={fotoDoTarologo(tarologo)} nome={tarologo.nome} lado="tarologo" />
          <p className="booking-journey-note">Sua pergunta segue para uma leitura feita para você.</p>
        </motion.section>

        {etapa === 'data' ? (
          <motion.section key="data" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="booking-panel mt-5">
            <SeletorHorario
              ocupados={tomados}
              dia={dia}
              hora={hora}
              onDia={setDia}
              onHora={setHora}
            />
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
              <button type="button" onClick={() => setTarologoId(null)} className="px-3 py-2 text-[15px] text-mist/75 transition hover:text-star">Cancelar</button>
              <button type="button" disabled={!dataValida} onClick={() => setEtapa('formato')} className="booking-primary disabled:cursor-not-allowed disabled:opacity-35">
                Avançar <span aria-hidden>→</span>
              </button>
            </div>
          </motion.section>
        ) : (
          <motion.section key="formato" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="booking-panel mt-5">
            <p className="text-[14px] text-gold">{dia && rotuloCompleto(dia)}{hora && `, às ${hora}`} · {tarologo.nome}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3" role="group" aria-label="Formato da tiragem">
              {FORMATOS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormato(f.id)}
                  aria-pressed={formato === f.id}
                  className={`booking-format ${formato === f.id ? 'booking-format--selected' : ''}`}
                >
                  <span className="booking-format-icon" aria-hidden>{f.icone}</span>
                  <span className="booking-format-title">{f.rotulo}</span>
                  <span className="booking-format-description">{f.descricao}</span>
                </button>
              ))}
            </div>

            <a href="#/mesa-digital" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[14px] text-gold underline-offset-4 transition hover:text-star hover:underline">
              Saiba mais sobre a mesa digital <span aria-hidden>↗</span>
            </a>

            <label className="mt-7 block">
              <span className="mb-2 block text-[14px] font-medium text-star">Um resumo do que você quer conversar <span className="font-normal text-mist/60">(opcional)</span></span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                maxLength={1200}
                placeholder={`Conte brevemente o contexto para ${tarologo.nome} preparar a leitura.`}
                className={`${CAMPO} resize-y leading-relaxed`}
              />
            </label>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-medium text-star">Dados do seu perfil</p>
                {!editandoDados && (
                  <button type="button" disabled={!perfilPronto} onClick={abrirEdicaoDados} className="text-[13px] text-gold underline-offset-4 hover:underline disabled:opacity-40">
                    Editar dados
                  </button>
                )}
              </div>
              {editandoDados ? (
                <div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[14px] text-star">Seu nome</span>
                      <input value={nomeRascunho} onChange={(e) => setNomeRascunho(e.target.value)} autoComplete="name" className={CAMPO} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[14px] text-star">WhatsApp ou telefone</span>
                      <input value={telefoneRascunho} onChange={(e) => setTelefoneRascunho(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" className={CAMPO} />
                    </label>
                  </div>
                  <p className="mt-2 text-[12px] text-mist/65">Informe o DDD e o número. As alterações serão salvas no seu perfil.</p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <button type="button" disabled={!dadosValidos || salvandoDados} onClick={() => void confirmarDados()} className="text-[13px] font-semibold text-gold hover:text-star disabled:opacity-40">{salvandoDados ? 'Salvando…' : 'Salvar no perfil'}</button>
                    <button type="button" disabled={salvandoDados} onClick={() => setEditandoDados(false)} className="text-[13px] text-mist/70 hover:text-star disabled:opacity-40">Cancelar edição</button>
                  </div>
                  {erroDados && <p role="alert" className="mt-3 text-[13px] text-rose">{erroDados}</p>}
                </div>
              ) : (
                <>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-2 block text-[14px] text-star">Seu nome</span>
                      <p className={`${CAMPO} min-h-12`}>{perfilPronto ? nomeCliente || 'Não cadastrado' : 'Carregando…'}</p>
                    </div>
                    <div>
                      <span className="mb-2 block text-[14px] text-star">WhatsApp ou telefone</span>
                      <p className={`${CAMPO} min-h-12`}>{perfilPronto ? telefoneCliente || 'Não cadastrado' : 'Carregando…'}</p>
                    </div>
                  </div>
                  {perfilPronto && (!nomeCliente || !telefoneCliente) && (
                    <p className="mt-3 text-[13px] text-gold" role="status">
                      Complete {nomeCliente ? 'o telefone' : telefoneCliente ? 'o nome' : 'o nome e o telefone'} em “Editar dados” para continuar.
                    </p>
                  )}
                </>
              )}
            </div>

            {erro && <p role="alert" className="mt-5 rounded-xl border border-rose/40 bg-rose/10 p-4 text-[14px] text-rose">{erro}</p>}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
              <button type="button" onClick={() => setEtapa('data')} className="px-3 py-2 text-[15px] text-mist/75 transition hover:text-star">← Voltar</button>
              <div className="flex items-center gap-4">
                <span className="font-display text-xl text-gold">{formatPriceFull(preco)}</span>
                <button type="button" disabled={!pronto || enviando} onClick={() => void reservar()} className="booking-primary disabled:cursor-not-allowed disabled:opacity-35">
                  {enviando ? 'Reservando…' : 'Pagamento Pix →'}
                </button>
              </div>
            </div>
            <p className="mt-4 text-right text-[12px] leading-relaxed text-mist/55">
              Seu horário é reservado ao continuar. O pagamento é conferido pelo tarólogo.
            </p>
          </motion.section>
        )}
      </div>
    </main>
  )
}
