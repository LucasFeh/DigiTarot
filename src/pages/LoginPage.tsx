import { useState } from 'react'
import { motion } from 'framer-motion'
import { TAROLOGO_DEMO } from '../lib/backend'
import { useAuth } from '../lib/useAuth'

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

export default function LoginPage() {
  const { entrarComGoogle, entrarComEmail, backend } = useAuth()
  const [modo, setModo] = useState<'cliente' | 'tarologo'>('cliente')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const tentar = async (fn: () => Promise<void>) => {
    setErro(null)
    setOcupado(true)
    try {
      await fn()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally {
      setOcupado(false)
    }
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
          <h1 className="text-nebula mt-3 text-3xl">Entre na sala</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mist">
            Com uma conta você acompanha a leitura ao vivo e guarda o histórico das suas consultas.
          </p>

          {/* -------------------------- escolha do modo -------------------------- */}
          <div className="mt-7 flex gap-1 rounded-full border border-white/12 bg-white/5 p-1">
            {(
              [
                ['cliente', 'Sou cliente'],
                ['tarologo', 'Sou tarólogo'],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setModo(id)
                  setErro(null)
                }}
                className="flex-1 rounded-full px-3 py-2 text-[14px] tracking-wide transition"
                style={{
                  color: modo === id ? '#fff' : '#cbbde8',
                  background: modo === id ? 'linear-gradient(100deg, #6d3fd4, #c2449d)' : 'transparent',
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {modo === 'cliente' ? (
            <div className="mt-6">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => tentar(entrarComGoogle)}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-[16px] font-medium text-[#1f1f1f] transition hover:bg-white/90 disabled:opacity-60"
              >
                <GoogleIcon />
                Continuar com Google
              </button>
              {backend?.modo === 'local' && (
                <p className="mt-3 text-[13px] leading-relaxed text-mist/60">
                  Sem as chaves do Firebase, este botão cria um visitante local — serve para testar a
                  sala inteira sem conta nenhuma.
                </p>
              )}
            </div>
          ) : (
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                void tentar(() => entrarComEmail(email, senha))
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                autoComplete="username"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none placeholder:text-mist/50 focus:border-gold/50"
              />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none placeholder:text-mist/50 focus:border-gold/50"
              />
              <button
                type="submit"
                disabled={ocupado}
                className="rounded-xl px-4 py-3.5 text-[16px] font-medium text-star transition disabled:opacity-60"
                style={{
                  background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                  boxShadow: '0 12px 34px -14px #c2449d',
                }}
              >
                Entrar
              </button>

              {backend?.modo === 'local' && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail(TAROLOGO_DEMO.email)
                    setSenha(TAROLOGO_DEMO.senha)
                  }}
                  className="rounded-lg border border-white/12 px-3 py-2 text-left text-[13px] leading-relaxed text-mist/70 transition hover:text-mist"
                >
                  Conta de demonstração: <span className="text-gold">{TAROLOGO_DEMO.email}</span> /{' '}
                  <span className="text-gold">{TAROLOGO_DEMO.senha}</span> — clique para preencher.
                </button>
              )}
            </form>
          )}

          {erro && (
            <p className="mt-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
              {erro}
            </p>
          )}

          <a
            href="#/"
            className="mt-6 block text-center text-[14px] text-mist/70 transition hover:text-star"
          >
            ← Voltar para a home
          </a>
        </div>
      </motion.div>
    </main>
  )
}
