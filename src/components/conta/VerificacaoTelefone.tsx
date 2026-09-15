import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { formatarE164, mascararBR, paraE164 } from '../../lib/telefone'
import { CODIGO_SMS_LOCAL, type ConfirmacaoSms, type ModoSms } from '../../lib/backend'

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/50 focus:border-gold/50'

/**
 * A verificação por SMS, em dois tempos: manda o código, confere o código.
 *
 * O mesmo componente serve para ENTRAR e para VINCULAR o telefone a uma conta
 * existente — o que muda é só o `modo` que vai ao backend. A conversa com a
 * pessoa é idêntica nos dois casos, e duplicá-la seria manter dois lugares onde
 * o contador de reenvio pode ficar errado.
 */
export default function VerificacaoTelefone({
  modo,
  containerId,
  rotuloEnviar = 'Enviar código',
  aoConcluir,
}: {
  modo: ModoSms
  /** Id único do container do reCAPTCHA nesta tela. */
  containerId: string
  rotuloEnviar?: string
  aoConcluir?: () => void
}) {
  const { enviarCodigoSms, backend } = useAuth()
  const [etapa, setEtapa] = useState<'numero' | 'codigo'>('numero')
  const [numero, setNumero] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [espera, setEspera] = useState(0)
  const confirmacao = useRef<ConfirmacaoSms | null>(null)

  // Contador do reenvio. Sem ele, quem não recebe o SMS aperta o botão em
  // sequência — e cada toque é uma mensagem cobrada do projeto.
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  // Sair da tela no meio do processo tem que levar o reCAPTCHA junto: ele fica
  // preso ao container, e o próximo envio falharia dizendo que já foi usado.
  useEffect(() => {
    return () => confirmacao.current?.cancelar()
  }, [])

  const enviar = async () => {
    const e164 = paraE164(numero)
    if (!e164) {
      setErro('Número incompleto. Escreva com DDD: (31) 98267-6254.')
      return
    }
    setErro(null)
    setOcupado(true)
    try {
      confirmacao.current = await enviarCodigoSms(e164, containerId, modo)
      setEtapa('codigo')
      setEspera(45)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o código.')
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = async () => {
    if (!confirmacao.current) return
    setErro(null)
    setOcupado(true)
    try {
      await confirmacao.current.confirmar(codigo)
      confirmacao.current = null
      setCodigo('')
      setNumero('')
      setEtapa('numero')
      aoConcluir?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Código incorreto.')
    } finally {
      setOcupado(false)
    }
  }

  const voltar = () => {
    confirmacao.current?.cancelar()
    confirmacao.current = null
    setEtapa('numero')
    setCodigo('')
    setErro(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {etapa === 'numero' ? (
        <>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={numero}
            onChange={(e) => setNumero(mascararBR(e.target.value))}
            placeholder="(31) 98267-6254"
            className={CAMPO}
          />
          <button
            type="button"
            disabled={ocupado || numero.trim().length < 8}
            onClick={() => void enviar()}
            className="rounded-xl px-4 py-3.5 text-[16px] font-medium text-star transition disabled:opacity-50"
            style={{
              background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
              boxShadow: '0 12px 34px -14px #c2449d',
            }}
          >
            {ocupado ? 'Enviando…' : rotuloEnviar}
          </button>
          <p className="text-[13px] leading-relaxed text-mist/60">
            Você recebe um SMS com um código de 6 dígitos. Cobram-se as tarifas normais da sua
            operadora.
          </p>
        </>
      ) : (
        <>
          <p className="text-[14px] text-mist">
            Código enviado para{' '}
            <span className="text-star">{formatarE164(confirmacao.current?.telefone ?? '')}</span>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className={`${CAMPO} text-center font-display text-[24px] tracking-[0.4em]`}
          />
          <button
            type="button"
            disabled={ocupado || codigo.length !== 6}
            onClick={() => void confirmar()}
            className="rounded-xl px-4 py-3.5 text-[16px] font-medium text-star transition disabled:opacity-50"
            style={{
              background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
              boxShadow: '0 12px 34px -14px #c2449d',
            }}
          >
            {ocupado ? 'Conferindo…' : 'Confirmar'}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
            <button
              type="button"
              onClick={voltar}
              className="text-mist/80 underline-offset-4 transition hover:text-star hover:underline"
            >
              ← Trocar o número
            </button>
            <button
              type="button"
              disabled={espera > 0 || ocupado}
              onClick={() => void enviar()}
              className="text-mist/60 underline-offset-4 transition hover:text-star hover:underline disabled:no-underline disabled:opacity-60"
            >
              {espera > 0 ? `Reenviar em ${espera}s` : 'Reenviar código'}
            </button>
          </div>
        </>
      )}

      {backend?.modo === 'local' && (
        <p className="rounded-lg border border-white/12 px-3 py-2 text-[13px] leading-relaxed text-mist/60">
          Modo local: nenhum SMS é enviado de verdade. O código que funciona é{' '}
          <span className="text-gold">{CODIGO_SMS_LOCAL}</span>.
        </p>
      )}

      {erro && (
        <p className="rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
          {erro}
        </p>
      )}

      {/* O reCAPTCHA invisível se monta aqui. O elemento precisa existir no DOM
          ANTES de o envio começar — por isso ele fica sempre montado, e não
          dentro de uma condição. */}
      <div id={containerId} />
    </div>
  )
}
