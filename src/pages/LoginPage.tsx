import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'
import VerificacaoTelefone from '../components/conta/VerificacaoTelefone'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.6-.4-3.9Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9Z" />
    </svg>
  )
}

const CAMPO =
  'rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/50 focus:border-gold/50'

type Modo = 'entrar' | 'criar' | 'link' | 'recuperar' | 'telefone'

/**
 * Uma porta só para todo mundo. O tarólogo entra com e-mail e senha como
 * qualquer pessoa — o que o distingue é o endereço, conferido no servidor pelas
 * regras do Firestore, nunca um botão "sou tarólogo" nesta tela. Um botão desses
 * não protege nada e ainda anuncia que existe uma área restrita.
 */
export default function LoginPage({
  titulo = 'Entre na sala',
  descricao = 'Com uma conta você reserva sua consulta, acompanha a leitura ao vivo e guarda o histórico.',
}: {
  titulo?: string
  descricao?: string
}) {
  const { backend, entrarComGoogle, entrarComEmail, enviarLinkEmail, recuperarSenha } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const tentar = async (fn: () => Promise<void>, sucesso?: string) => {
    setErro(null)
    setAviso(null)
    setOcupado(true)
    try {
      await fn()
      if (sucesso) setAviso(sucesso)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally {
      setOcupado(false)
    }
  }

  const trocarModo = (m: Modo) => {
    setModo(m)
    setErro(null)
    setAviso(null)
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    if (modo === 'entrar') void tentar(() => entrarComEmail(email, senha))
    else if (modo === 'criar' || modo === 'link') {
      void tentar(async () => {
        await enviarLinkEmail(modo === 'criar' ? nome : '', email)
        if (backend?.modo === 'local') irPara('/confirmar-cadastro')
      }, 'Enviamos um link para seu e-mail. Abra a mensagem para confirmar e entrar. Confira também o spam.')
    }
    else
      void tentar(
        () => recuperarSenha(email),
        'Se houver uma conta com este e-mail, o link para redefinir a senha acabou de ser enviado.',
      )
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="glass relative w-full max-w-md overflow-hidden rounded-3xl p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-20 h-48 blur-3xl"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #7b5cff88, transparent 70%)' }}
        />

        <div className="relative">
          <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Tiragem digital</p>
          <h1 className="text-nebula mt-3 text-3xl">
            {modo === 'criar'
              ? 'Criar sua conta'
              : modo === 'link'
                ? 'Entrar por e-mail'
              : modo === 'recuperar'
                ? 'Recuperar acesso'
                : modo === 'telefone'
                  ? 'Entrar com telefone'
                  : titulo}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mist">
            {modo === 'recuperar'
              ? 'Informe o e-mail da sua conta e enviaremos um link para você definir uma senha nova.'
              : modo === 'criar'
                ? 'Enviaremos um link para confirmar seu e-mail. Sua conta só será criada quando você abrir o link.'
              : modo === 'link'
                ? 'Receba um link para entrar sem senha. Se for sua primeira vez, a conta será criada após a confirmação.'
              : modo === 'telefone'
                ? 'Enviamos um código por SMS. Se for a sua primeira vez, a conta é criada na hora.'
                : descricao}
          </p>

          {(modo === 'entrar' || modo === 'criar') && (
            <>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void tentar(entrarComGoogle)}
                className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-[16px] font-medium text-[#1f1f1f] transition hover:bg-white/90 disabled:opacity-60"
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[13px] uppercase tracking-[0.2em] text-mist/45">
                <span className="h-px flex-1 bg-white/12" />
                ou
                <span className="h-px flex-1 bg-white/12" />
              </div>
            </>
          )}

          {modo === 'telefone' ? (
            <div className="mt-7">
              <VerificacaoTelefone modo="entrar" containerId="recaptcha-login" />
            </div>
          ) : (
          <form className={`flex flex-col gap-3 ${modo === 'recuperar' || modo === 'link' ? 'mt-7' : ''}`} onSubmit={enviar}>
            {modo === 'criar' && (
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                className={CAMPO}
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              autoComplete="username"
              className={CAMPO}
            />
            {modo === 'entrar' && (
              <input
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className={CAMPO}
              />
            )}

            <button
              type="submit"
              disabled={ocupado}
              className="rounded-xl px-4 py-3.5 text-[16px] font-medium text-star transition disabled:opacity-60"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 12px 34px -14px #c2449d',
              }}
            >
              {ocupado
                ? 'Aguarde…'
                : modo === 'criar'
                  ? 'Enviar link de confirmação'
                  : modo === 'link'
                    ? 'Enviar link para entrar'
                  : modo === 'recuperar'
                    ? 'Enviar link'
                    : 'Entrar'}
            </button>
          </form>
          )}

          {erro && (
            <p className="mt-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
              {erro}
            </p>
          )}
          {aviso && (
            <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[14px] text-gold">
              {aviso}
            </p>
          )}

          {modo === 'entrar' && (
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => trocarModo('link')}
                className="w-full rounded-xl border border-white/20 px-4 py-3 text-[15px] text-star transition hover:border-gold/60 hover:bg-white/5"
              >
                Entrar com link por e-mail
              </button>
              <button
                type="button"
                onClick={() => trocarModo('telefone')}
                className="w-full rounded-xl border border-white/20 px-4 py-3 text-[15px] text-star transition hover:border-gold/60 hover:bg-white/5"
              >
                Entrar com meu telefone
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[14px]">
            {modo === 'entrar' ? (
              <>
                <button
                  type="button"
                  onClick={() => trocarModo('criar')}
                  className="text-mist/80 underline-offset-4 transition hover:text-star hover:underline"
                >
                  Ainda não tenho conta
                </button>
                <button
                  type="button"
                  onClick={() => trocarModo('recuperar')}
                  className="text-mist/60 underline-offset-4 transition hover:text-star hover:underline"
                >
                  Esqueci a senha
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => trocarModo('entrar')}
                className="text-mist/80 underline-offset-4 transition hover:text-star hover:underline"
              >
                {modo === 'telefone' ? '← Outras formas de entrar' : '← Já tenho conta'}
              </button>
            )}
          </div>

          <a
            href="#/"
            className="mt-6 block text-center text-[14px] text-mist/60 transition hover:text-star"
          >
            Voltar para a home
          </a>
        </div>
      </motion.div>
    </main>
  )
}
