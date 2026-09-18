import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { site } from '../data/site'
import { formatPriceFull } from '../data/plans'
import { rotuloCompleto } from '../data/agenda'
import PixCobranca from '../components/PixCobranca'
import SeloStatus from '../components/agenda/SeloStatus'
import AvisoModoLocal from '../components/AvisoModoLocal'
import LoginPage from './LoginPage'
import type { Agendamento } from '../lib/backend'
import type { DadosPix } from '../lib/pix'

const FORMATO: Record<string, string> = {
  chamada: 'Chamada de vídeo',
  audio: 'Áudio',
  escrito: 'Por escrito',
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/8 py-2.5 last:border-0">
      <span className="text-[13px] uppercase tracking-[0.14em] text-mist/60">{rotulo}</span>
      <span className="text-right text-[15px] text-star">{valor}</span>
    </div>
  )
}

export default function PagamentoPage({ agendamentoId }: { agendamentoId: string }) {
  const { usuario, carregando, backend } = useAuth()
  const [ag, setAg] = useState<Agendamento | null>(null)
  const [buscando, setBuscando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [pix, setPix] = useState<DadosPix | null>(null)
  const [carregandoPix, setCarregandoPix] = useState(false)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarAgendamento(agendamentoId, (a) => {
      setAg(a)
      setBuscando(false)
    })
  }, [backend, usuario, agendamentoId])

  useEffect(() => {
    if (!backend || !usuario || !ag?.tarologoUid) return
    setCarregandoPix(true)
    return backend.observarPixTarologo(ag.tarologoUid, (dados) => {
      setPix(dados ? { ...dados, configurado: Boolean(dados.chave.trim()) } : { chave: '', nome: '', cidade: '', configurado: false })
      setCarregandoPix(false)
    })
  }, [backend, usuario, ag?.tarologoUid])

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }

  if (!usuario) {
    return (
      <LoginPage
        titulo="Entre para ver sua reserva"
        descricao="O pagamento e o horário ficam guardados na conta com que a consulta foi marcada."
      />
    )
  }

  if (buscando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Abrindo a reserva…</p>
      </main>
    )
  }

  if (!ag) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-nebula text-3xl">Reserva não encontrada</h1>
        <p className="mt-3 text-[16px] text-mist">
          Ela pode ter sido cancelada, ou pertencer a outra conta.
        </p>
        <a
          href="#/tiragem"
          className="mt-7 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
        >
          Voltar ao catálogo
        </a>
      </main>
    )
  }

  const nomeTarologo = ag.tarologoNome || 'Rodrigo'
  const ehTarologo = Boolean(usuario.admin || (usuario.papel === 'tarologo' && usuario.email.toLowerCase() === ag.tarologoUid))
  const mensagem = `Olá! Acabei de pagar a consulta ${ag.codigo} — ${ag.planoTitulo}, ${rotuloCompleto(ag.data)} às ${ag.hora}.`
  const linkZap = (!ag.tarologoUid || ag.tarologoUid === 'rodriv.l680@gmail.com') && site.whatsapp
    ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(mensagem)}`
    : null

  const marcar = async (status: Agendamento['status']) => {
    if (!backend || ocupado) return
    setOcupado(true)
    try {
      await backend.atualizarAgendamento(ag.id, { status })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-12">
      <AvisoModoLocal />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Reserva</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-nebula text-3xl sm:text-4xl">{ag.planoTitulo}</h1>
          <SeloStatus status={ag.status} />
        </div>
      </motion.div>

      {/* ------------------------------ o combinado ------------------------------ */}
      <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
        <Linha rotulo="Quando" valor={`${rotuloCompleto(ag.data)}, às ${ag.hora}`} />
        <Linha rotulo="Formato" valor={FORMATO[ag.formato] ?? ag.formato} />
        {ag.duracao && <Linha rotulo="Duração" valor={ag.duracao} />}
        <Linha rotulo="Valor" valor={formatPriceFull(ag.preco)} />
        <Linha rotulo="Código da reserva" valor={ag.codigo} />
        {ehTarologo && (
          <>
            <Linha rotulo="Cliente" valor={`${ag.clienteNome} · ${ag.clienteEmail}`} />
            <Linha rotulo="Contato" valor={ag.contato} />
          </>
        )}
      </section>

      {ag.observacao && (
        <section className="glass mt-4 rounded-2xl p-6">
          <p className="text-[13px] uppercase tracking-[0.14em] text-mist/60">A pergunta</p>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-mist">
            {ag.observacao}
          </p>
        </section>
      )}

      {/* ------------------------------ o pagamento ------------------------------ */}
      {ag.status === 'aguardando' && (
        <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
          {carregandoPix ? <p className="text-mist/70">Carregando dados de pagamento…</p> : (
            <PixCobranca
              valor={ag.preco}
              codigo={ag.codigo}
              descricao={`${ag.planoTitulo} — ${ag.codigo}`}
              pix={ag.tarologoUid ? (pix ?? { chave: '', nome: '', cidade: '', configurado: false }) : undefined}
            />
          )}

          <ol className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-[14px] leading-relaxed text-mist/80">
            <li>1. Pague pelo QR Code ou pelo código copia e cola, no app do seu banco.</li>
            <li>2. Envie o comprovante citando o código {ag.codigo}.</li>
            <li>3. Assim que o pagamento for identificado, sua consulta é confirmada aqui.</li>
          </ol>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {!ehTarologo && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void marcar('pago')}
                className="rounded-full px-6 py-3 text-[15px] font-medium text-star transition disabled:opacity-50"
                style={{
                  background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                  boxShadow: '0 12px 34px -14px #c2449d',
                }}
              >
                Já fiz o pagamento
              </button>
            )}
            {linkZap && (
              <a
                href={linkZap}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/25 px-6 py-3 text-center text-[15px] text-star transition hover:border-gold/60"
              >
                Enviar comprovante no WhatsApp
              </a>
            )}
          </div>
        </section>
      )}

      {ag.status === 'pago' && (
        <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
          <p className="font-display text-[18px] text-star">Pagamento em conferência</p>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">
            {nomeTarologo} confere a entrada e confirma a consulta por aqui. Seu horário
            ({rotuloCompleto(ag.data)}, às {ag.hora}) já está reservado e ninguém mais pode tomá-lo.
          </p>
          {linkZap && !ehTarologo && (
            <a
              href={linkZap}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
            >
              Enviar o comprovante
            </a>
          )}
        </section>
      )}

      {ag.status === 'confirmado' && (
        <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
          <p className="font-display text-[18px] text-star">Consulta confirmada</p>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">
            {ag.sessaoId
              ? `Sua mesa está aberta. Entre quando quiser — as cartas aparecem conforme ${nomeTarologo} as põe.`
              : `No horário marcado, ${rotuloCompleto(ag.data)} às ${ag.hora}, ${nomeTarologo} abre a sua mesa e ela aparece aqui. Ela é só sua: ninguém mais entra nessa sala.`}
          </p>
          {ag.sessaoId && (
            <a
              href={`#/tiragem/${ag.sessaoId}`}
              className="mt-4 inline-block rounded-full px-6 py-3 text-[15px] font-medium text-star transition"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 12px 34px -14px #c2449d',
              }}
            >
              Entrar na minha mesa
            </a>
          )}
        </section>
      )}

      {ag.status === 'cancelado' && (
        <section className="glass mt-6 rounded-2xl p-6">
          <p className="font-display text-[18px] text-star">Reserva cancelada</p>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">
            O horário voltou para a agenda. Se foi engano, é só marcar de novo pelo catálogo.
          </p>
        </section>
      )}

      {/* ---------------------- o que só o tarólogo controla ---------------------- */}
      {ehTarologo && ag.status !== 'cancelado' && (
        <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-6">
          <p className="text-[13px] uppercase tracking-[0.18em] text-gold/90">Painel do tarólogo</p>
          <p className="mt-2 text-[14px] leading-relaxed text-mist/80">
            O Pix é estático: nenhum sistema avisa que ele caiu. Confirme depois de ver o valor de{' '}
            {formatPriceFull(ag.preco)} na conta, com o código {ag.codigo}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ag.status !== 'confirmado' && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void marcar('confirmado')}
                className="rounded-full border border-gold/60 bg-gold/15 px-5 py-2.5 text-[15px] text-gold transition hover:bg-gold/25 disabled:opacity-50"
              >
                Confirmar pagamento
              </button>
            )}
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void marcar('cancelado')}
              className="rounded-full border border-white/25 px-5 py-2.5 text-[15px] text-mist transition hover:border-rose/60 hover:text-rose disabled:opacity-50"
            >
              Cancelar e liberar o horário
            </button>
          </div>
        </section>
      )}

      <a
        href={ehTarologo ? '#/perfil' : '#/tiragem'}
        className="mt-8 inline-block text-[15px] text-mist/70 transition hover:text-star"
      >
        ← {ehTarologo ? 'Voltar à agenda' : 'Voltar ao catálogo'}
      </a>
    </main>
  )
}
