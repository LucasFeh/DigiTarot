import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'
import { site } from '../data/site'
import { formatPriceFull } from '../data/plans'
import PixCobranca from '../components/PixCobranca'
import AvisoModoLocal from '../components/AvisoModoLocal'
import type { Convite } from '../lib/backend'

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/40 focus:border-gold/50'

/**
 * O que a pessoa convidada vê. Sem login, sem cadastro, sem senha.
 *
 * Esta é a única tela do site que funciona deslogada, e por isso ela nunca
 * pergunta nada além do primeiro nome: não há conta para preencher, e pedir
 * e-mail ou telefone a quem foi convidado por mensagem seria cobrar um cadastro
 * disfarçado — exatamente o que o link existe para evitar.
 */
export default function ConvitePage({ token }: { token: string }) {
  const { backend } = useAuth()
  const [convite, setConvite] = useState<Convite | null | undefined>(undefined)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!backend) return
    return backend.observarConvite(token, setConvite)
  }, [backend, token])

  // O nome já gravado vira o valor do campo — quem volta ao link depois não
  // precisa se apresentar de novo.
  useEffect(() => {
    if (convite?.convidadoNome) setNome((n) => n || convite.convidadoNome)
  }, [convite?.convidadoNome])

  /**
   * No instante em que o tarólogo confirma, a mesa abre aqui sozinha.
   *
   * A pessoa está esperando com a página aberta, sem nada para fazer — mandá-la
   * procurar um botão que acabou de aparecer é pedir que ela fique vigiando a
   * tela. A assinatura já traz a mudança em tempo real; só faltava agir sobre
   * ela.
   *
   * O `entrou` impede que voltar da mesa para o link jogue a pessoa de volta
   * para dentro num laço — sair da sala tem que ser possível.
   */
  const entrou = useRef(false)
  useEffect(() => {
    if (!convite?.sessaoId || convite.status !== 'confirmado' || entrou.current) return
    entrou.current = true
    irPara(`/tiragem/${convite.sessaoId}`)
  }, [convite?.sessaoId, convite?.status])

  if (convite === undefined) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Abrindo o convite…</p>
      </main>
    )
  }

  if (!convite) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-nebula text-3xl">Convite não encontrado</h1>
        <p className="mx-auto mt-3 max-w-sm text-[16px] leading-relaxed text-mist">
          O link pode ter sido digitado errado, ou a sessão pode ter sido cancelada. Peça um novo
          para quem te enviou.
        </p>
        <a
          href="#/"
          className="mt-7 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
        >
          Ir para a home
        </a>
      </main>
    )
  }

  const salvarNome = async () => {
    if (!backend || !nome.trim() || salvando) return
    setSalvando(true)
    try {
      await backend.atualizarConvite(token, { convidadoNome: nome.trim() })
    } finally {
      setSalvando(false)
    }
  }

  const avisarPagamento = async () => {
    if (!backend || salvando) return
    setSalvando(true)
    try {
      // O nome vai junto: quem digitou e foi direto ao pagamento não deve
      // chegar do outro lado como "convidado".
      const patch: Partial<Convite> = { status: 'pago' }
      if (nome.trim() && nome.trim() !== convite.convidadoNome) {
        await backend.atualizarConvite(token, { convidadoNome: nome.trim() })
      }
      await backend.atualizarConvite(token, patch)
    } finally {
      setSalvando(false)
    }
  }

  const mensagem = `Olá! Acabei de pagar a sessão ${convite.codigo} — ${convite.titulo}.`
  const linkZap = site.whatsapp
    ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(mensagem)}`
    : null

  const seApresentou = Boolean(convite.convidadoNome)

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-5 py-12">
      <AvisoModoLocal />

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Convite</p>
        <h1 className="text-nebula mt-3 text-3xl sm:text-4xl">{convite.titulo}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-mist">
          {convite.tarologoNome} preparou esta sessão para você. Não é preciso criar conta — só
          dizer seu nome e concluir o pagamento.
        </p>
      </motion.div>

      {convite.descricao && (
        <section className="glass mt-6 rounded-2xl p-6">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-mist">
            {convite.descricao}
          </p>
        </section>
      )}

      {/* ------------------------- quem está entrando ------------------------- */}
      <section className="glass mt-6 rounded-2xl p-6">
        <h2 className="font-display text-[17px] text-star">Como você quer ser chamado</h2>
        <p className="mt-1 text-[14px] text-mist/70">
          É o nome que aparece para {convite.tarologoNome} na mesa.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className={CAMPO}
          />
          <button
            type="button"
            disabled={!nome.trim() || salvando || nome.trim() === convite.convidadoNome}
            onClick={() => void salvarNome()}
            className="shrink-0 rounded-xl border border-white/25 px-5 py-3 text-[15px] text-star transition hover:border-gold/60 disabled:opacity-40"
          >
            {nome.trim() === convite.convidadoNome ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </section>

      {/* ------------------------------ pagamento ------------------------------ */}
      {convite.status === 'aguardando' && (
        <section className="glass mt-6 rounded-2xl p-6 sm:p-7">
          <PixCobranca
            valor={convite.preco}
            codigo={convite.codigo}
            descricao={`${convite.titulo} — ${convite.codigo}`}
          />

          <ol className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-[14px] leading-relaxed text-mist/80">
            <li>1. Pague pelo QR Code ou pelo código copia e cola, no app do seu banco.</li>
            <li>2. Envie o comprovante citando o código {convite.codigo}.</li>
            <li>3. Assim que o pagamento for identificado, a mesa abre para você aqui mesmo.</li>
          </ol>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={salvando || !seApresentou}
              onClick={() => void avisarPagamento()}
              title={seApresentou ? undefined : 'Diga seu nome primeiro.'}
              className="rounded-full px-6 py-3 text-[15px] font-medium text-star transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 12px 34px -14px #c2449d',
              }}
            >
              Já fiz o pagamento
            </button>
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

      {convite.status === 'pago' && (
        <section className="glass mt-6 rounded-2xl p-6">
          <p className="font-display text-[18px] text-star">Pagamento em conferência</p>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">
            {convite.tarologoNome} está conferindo a entrada. Pode deixar esta página aberta: quando
            a mesa abrir, o botão de entrar aparece aqui sozinho.
          </p>
        </section>
      )}

      {convite.status === 'confirmado' && (
        <section className="glass mt-6 rounded-2xl p-6">
          <p className="font-display text-[18px] text-star">
            {convite.sessaoId ? 'Sua mesa está aberta' : 'Pagamento confirmado'}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">
            {convite.sessaoId
              ? 'Levando você para a mesa…'
              : `Tudo certo. Assim que ${convite.tarologoNome} abrir a mesa, você entra automaticamente.`}
          </p>
          {convite.sessaoId && (
            <a
              href={`#/tiragem/${convite.sessaoId}`}
              className="mt-4 inline-block rounded-full px-6 py-3 text-[15px] font-medium text-star transition"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 12px 34px -14px #c2449d',
              }}
            >
              Entrar na mesa
            </a>
          )}
        </section>
      )}

      {convite.status === 'cancelado' && (
        <section className="glass mt-6 rounded-2xl p-6">
          <p className="font-display text-[18px] text-star">Sessão cancelada</p>
          <p className="mt-2 text-[15px] leading-relaxed text-mist/85">
            Fale com {convite.tarologoNome} se foi engano.
          </p>
        </section>
      )}

      <p className="mt-8 text-[13px] leading-relaxed text-mist/55">
        Guarde este link: é por ele que você volta à sua mesa. Valor combinado:{' '}
        {formatPriceFull(convite.preco)}.
      </p>
    </main>
  )
}
