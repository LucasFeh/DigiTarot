import { useState } from 'react'
import { useAuth } from '../lib/useAuth'

export default function VerificarEmailPage() {
  const { usuario, enviarVerificacaoEmail, atualizarVerificacaoEmail, sair } = useAuth()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const executar = async (acao: () => Promise<void>, mensagem: string) => {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      await acao()
      setAviso(mensagem)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir. Tente novamente.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-5 py-16">
      <section className="glass w-full rounded-3xl p-7 sm:p-10">
        <p className="text-[12px] uppercase tracking-[0.28em] text-gold">Confirmação de conta</p>
        <h1 className="font-display mt-4 text-3xl text-star sm:text-4xl">Confirme seu e-mail para continuar</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-mist/80">
          Confirme o endereço <strong className="break-all text-star">{usuario?.email}</strong> pelo link recebido e volte aqui.
          Se não recebeu a mensagem, peça um novo link. Assim podemos proteger sua conta e seus agendamentos.
        </p>

        {aviso && <p role="status" className="mt-6 rounded-xl border border-gold/35 bg-gold/10 p-4 text-[14px] text-gold">{aviso}</p>}
        {erro && <p role="alert" className="mt-6 rounded-xl border border-rose/35 bg-rose/10 p-4 text-[14px] text-rose">{erro}</p>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void executar(async () => {
              const confirmado = await atualizarVerificacaoEmail()
              if (!confirmado) throw new Error('O e-mail ainda não foi confirmado. Abra o link recebido e tente novamente.')
            }, 'E-mail confirmado. Você já pode continuar.')}
            className="rounded-full bg-gold px-6 py-3 text-[15px] font-semibold text-void transition hover:bg-star disabled:opacity-50"
          >
            Já confirmei meu e-mail
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void executar(enviarVerificacaoEmail, 'Enviamos outro link. Confira também a pasta de spam.')}
            className="rounded-full border border-white/25 px-6 py-3 text-[15px] text-star transition hover:border-gold/60 disabled:opacity-50"
          >
            Reenviar link
          </button>
        </div>
        <button type="button" onClick={() => void sair()} className="mt-7 text-[14px] text-mist/65 underline-offset-4 hover:text-star hover:underline">
          Sair e usar outra conta
        </button>
      </section>
    </main>
  )
}
