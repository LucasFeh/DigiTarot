import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import { irPara } from '../lib/useHashRoute'
import { PLAN_BY_ID, formatPriceFull } from '../data/plans'
import { useTarologos } from '../lib/tarologos'
import { rotuloCompleto } from '../data/agenda'
import SeletorHorario from '../components/agenda/SeletorHorario'
import AvisoModoLocal from '../components/AvisoModoLocal'
import LoginPage from './LoginPage'
import type { FormatoConsulta } from '../lib/backend'

const FORMATOS: { id: FormatoConsulta; rotulo: string; dica: string }[] = [
  { id: 'chamada', rotulo: 'Chamada de vídeo', dica: 'Ao vivo, com a mesa aberta na tela.' },
  { id: 'audio', rotulo: 'Áudio', dica: 'Chamada de voz, sem vídeo.' },
  { id: 'escrito', rotulo: 'Por escrito', dica: 'A leitura chega em texto, no horário marcado.' },
]

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/40 focus:border-lilac/60'

/**
 * Código curto da reserva. Vai no txid do Pix e é o que o cliente cita ao
 * mandar o comprovante — o único fio que liga um valor caído na conta a uma
 * consulta marcada, já que o Pix estático não devolve identificação nenhuma.
 * Só letras e números, que é tudo que o txid aceita.
 */
function novoCodigo() {
  return `DIGI${Date.now().toString(36).toUpperCase()}`
}

export default function AgendarPage({ planoId }: { planoId: string }) {
  const { usuario, carregando, backend } = useAuth()
  const { perfil, nomeExibido } = usePerfil(usuario)
  const { tarologos, carregando: carregandoTarologos, erro: erroTarologos } = useTarologos()
  const [tarologoId, setTarologoId] = useState<string | null>(null)

  const [dia, setDia] = useState<string | null>(null)
  const [hora, setHora] = useState<string | null>(null)
  const [ocupados, setOcupados] = useState<string[]>([])
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [formato, setFormato] = useState<FormatoConsulta>('chamada')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const item = PLAN_BY_ID.get(planoId)
  const disponiveis = tarologos.filter((t) => t.ativo && Number(t.modalidades[planoId]) > 0)
  const tarologo = disponiveis.find((t) => t.uid === tarologoId)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarHorariosOcupados(setOcupados)
  }, [backend, usuario])

  // Os campos nascem preenchidos com o que já está no perfil, mas continuam
  // editáveis: o contato desta consulta pode não ser o de sempre.
  useEffect(() => {
    setNome((n) => n || nomeExibido)
  }, [nomeExibido])
  useEffect(() => {
    setContato((c) => c || perfil.contato)
  }, [perfil.contato])

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
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-nebula text-3xl">Consulta não encontrada</h1>
        <p className="mt-3 text-[16px] text-mist">
          Esse serviço não existe mais no catálogo.
        </p>
        <a
          href="#/tiragem"
          className="mt-7 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
        >
          Ver o catálogo
        </a>
      </main>
    )
  }

  const { plano, categoria } = item
  if (!tarologo) {
    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-5 py-12">
        <a href="#/tiragem" className="text-[14px] text-mist/70 transition hover:text-star">← Voltar ao catálogo</a>
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
                onClick={() => setTarologoId(t.uid)}
                className="glass flex items-center gap-5 rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-gold"
              >
                <img
                  src={t.foto || `${import.meta.env.BASE_URL}rodrigo.webp`}
                  alt={`Retrato de ${t.nome}`}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl text-star">{t.nome}</span>
                  <span className="mt-1 block line-clamp-2 text-[13px] leading-relaxed text-mist/70">{t.bio}</span>
                  <span className="mt-2 block text-[13px] text-gold">
                    {t.avaliacao.total ? `★ ${t.avaliacao.media.toFixed(1)} · ${t.avaliacao.total} avaliações` : '★★★★★ · avaliações em breve'}
                  </span>
                  {t.foto.includes('foto-tarologo-provisoria') && <span className="mt-1 block text-[11px] text-mist/50">Foto ilustrativa</span>}
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
  const pronto = Boolean(dia && hora && nome.trim() && contato.trim())

  const reservar = async () => {
    if (!backend || !dia || !hora || enviando) return
    setErro(null)
    setEnviando(true)
    try {
      const id = await backend.criarAgendamento({
        clienteUid: usuario.uid,
        clienteNome: nome.trim(),
        clienteEmail: usuario.email,
        contato: contato.trim(),
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
      // O encaixe pode ter caído entre o clique e a gravação; limpar a hora
      // obriga a escolher de novo, agora com a lista já atualizada.
      setHora(null)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-12">
      <AvisoModoLocal />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <a href="#/tiragem" className="text-[14px] text-mist/70 transition hover:text-star">
          ← Voltar ao catálogo
        </a>

        {/* ------------------------- o que foi escolhido ------------------------- */}
        <div
          className="mt-4 overflow-hidden rounded-2xl border p-6"
          style={{ borderColor: `${categoria.accent}55`, background: `${categoria.accent}12` }}
        >
          <p className="text-[12px] uppercase tracking-[0.22em] text-mist/70">
            {categoria.title}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-display text-2xl text-star sm:text-3xl">{plano.title}</h1>
            <span className="font-display text-2xl font-semibold text-gold">
              {formatPriceFull(preco)}
            </span>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">{plano.resumo}</p>
          <button type="button" onClick={() => { setTarologoId(null); setDia(null); setHora(null) }} className="mt-3 text-[14px] text-gold hover:text-star">
            Com {tarologo.nome} · trocar tarólogo
          </button>
          {plano.duration && (
            <p className="mt-2 text-[13px] uppercase tracking-[0.14em] text-mist/70">
              Duração: {plano.duration}
            </p>
          )}
        </div>
      </motion.div>

      {/* ------------------------------ a agenda ------------------------------ */}
      <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
        <SeletorHorario
          ocupados={tomados}
          dia={dia}
          hora={hora}
          onDia={(d) => {
            setDia(d)
            setHora(null)
          }}
          onHora={setHora}
          accent={categoria.accent}
        />
      </section>

      {/* ------------------------------ seus dados ------------------------------ */}
      <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
        <h3 className="font-display text-[17px] text-star">Como falar com você</h3>
        <p className="mt-1 text-[14px] text-mist/70">
          Fica salvo na sua conta — você só preenche uma vez.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] uppercase tracking-[0.14em] text-mist/70">
              Nome
            </span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] uppercase tracking-[0.14em] text-mist/70">
              WhatsApp ou telefone
            </span>
            <input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              className={CAMPO}
            />
          </label>

          <div>
            <span className="mb-2 block text-[13px] uppercase tracking-[0.14em] text-mist/70">
              Formato da consulta
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {FORMATOS.map((f) => {
                const on = f.id === formato
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormato(f.id)}
                    aria-pressed={on}
                    className="rounded-xl border px-4 py-3 text-left transition"
                    style={{
                      borderColor: on ? categoria.accent : '#ffffff1f',
                      background: on ? `${categoria.accent}20` : '#ffffff08',
                    }}
                  >
                    <span className="block text-[15px] text-star">{f.rotulo}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-mist/65">
                      {f.dica}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] uppercase tracking-[0.14em] text-mist/70">
              O que você quer perguntar <span className="normal-case tracking-normal">(opcional)</span>
            </span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder={`Escreva aqui a pergunta ou a situação. Ajuda ${tarologo.nome} a preparar a tiragem.`}
              className={`${CAMPO} resize-y leading-relaxed`}
            />
          </label>
        </div>
      </section>

      {/* ------------------------------ fechamento ------------------------------ */}
      <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[13px] uppercase tracking-[0.14em] text-mist/70">Resumo</p>
            <p className="mt-1.5 text-[16px] text-star">{plano.title}</p>
            <p className="mt-0.5 text-[15px] text-mist/80">
              {dia && hora ? `${rotuloCompleto(dia)}, às ${hora}` : 'Escolha o dia e o horário acima'}
            </p>
          </div>
          <span className="font-display text-2xl font-semibold text-gold">
            {formatPriceFull(preco)}
          </span>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
            {erro}
          </p>
        )}

        <button
          type="button"
          disabled={!pronto || enviando}
          onClick={() => void reservar()}
          className="mt-5 w-full rounded-full px-7 py-3.5 text-[16px] font-medium tracking-wide text-star transition disabled:opacity-40"
          style={{
            background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
            boxShadow: '0 12px 40px -14px #c2449d',
          }}
        >
          {enviando ? 'Reservando…' : 'Reservar e ir para o pagamento'}
        </button>

        <p className="mt-3 text-center text-[13px] leading-relaxed text-mist/60">
          O horário fica preso no seu nome assim que você continua. A consulta é confirmada quando o
          Pix é identificado.
        </p>
      </section>
    </main>
  )
}
