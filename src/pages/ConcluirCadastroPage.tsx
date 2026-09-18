import { useState, type FormEvent } from 'react'
import { haLinkDeEmailNaUrl, lerCadastroPendente } from '../lib/cadastroPorLink'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none placeholder:text-mist/50 focus:border-gold/50'

export default function ConcluirCadastroPage() {
  const pendente = lerCadastroPendente()
  const { backend, concluirLinkEmail, definirSenha } = useAuth()
  const [nome, setNome] = useState(pendente?.nome ?? '')
  const [email, setEmail] = useState(pendente?.email ?? '')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [novo, setNovo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const temLink = backend?.modo === 'local' || haLinkDeEmailNaUrl()

  const confirmarEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (ocupado) return
    setErro(null)
    setOcupado(true)
    try {
      const resultado = await concluirLinkEmail(nome, email, window.location.href)
      // O código é de uso único. Tiramos da barra de endereço e mantemos a
      // tela de criação de senha aberta mesmo quando o estado de login muda.
      window.history.replaceState(null, '', `${window.location.pathname}#/confirmar-cadastro`)
      window.dispatchEvent(new Event('hashchange'))
      if (resultado.novo) setNovo(true)
      else irPara('/perfil')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível confirmar o link.')
    } finally {
      setOcupado(false)
    }
  }

  const criarSenha = async (e: FormEvent) => {
    e.preventDefault()
    if (ocupado) return
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }
    setErro(null)
    setOcupado(true)
    try {
      await definirSenha(senha)
      irPara('/perfil')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível criar a senha. Tente novamente.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-5 py-16">
      <section className="glass w-full rounded-3xl p-7 sm:p-10">
        <p className="text-[12px] uppercase tracking-[0.28em] text-gold">DigiTarot</p>
        <h1 className="font-display mt-4 text-3xl text-star sm:text-4xl">
          {novo ? 'E-mail confirmado' : 'Confirme seu e-mail'}
        </h1>

        {novo ? (
          <>
            <p className="mt-4 text-[15px] leading-relaxed text-mist/80">
              Sua conta já foi criada. Crie uma senha para entrar da próxima vez ou continue usando o link por e-mail.
            </p>
            <form className="mt-7 flex flex-col gap-3" onSubmit={(e) => void criarSenha(e)}>
              <input
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Nova senha (mínimo 6 caracteres)"
                autoComplete="new-password"
                className={CAMPO}
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Confirme a senha"
                autoComplete="new-password"
                className={CAMPO}
              />
              <button type="submit" disabled={ocupado} className="rounded-xl bg-gold px-5 py-3 font-semibold text-void disabled:opacity-50">
                {ocupado ? 'Aguarde…' : 'Criar senha e continuar'}
              </button>
            </form>
            <button type="button" onClick={() => irPara('/perfil')} className="mt-5 text-[14px] text-mist underline-offset-4 hover:text-star hover:underline">
              Fazer isso depois
            </button>
          </>
        ) : temLink ? (
          <>
            <p className="mt-4 text-[15px] leading-relaxed text-mist/80">
              Informe o endereço que recebeu o link. A conta só será criada depois desta confirmação.
            </p>
            <form className="mt-7 flex flex-col gap-3" onSubmit={(e) => void confirmarEmail(e)}>
              {!pendente?.nome && (
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome (opcional)"
                  autoComplete="name"
                  className={CAMPO}
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail que recebeu o link"
                autoComplete="email"
                className={CAMPO}
              />
              <button type="submit" disabled={ocupado} className="rounded-xl bg-gold px-5 py-3 font-semibold text-void disabled:opacity-50">
                {ocupado ? 'Confirmando…' : 'Confirmar e entrar'}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-[15px] leading-relaxed text-mist/80">
            Este link não está disponível. Solicite outro na tela de entrada.
          </p>
        )}

        {erro && <p role="alert" className="mt-5 rounded-xl border border-rose/35 bg-rose/10 p-4 text-[14px] text-rose">{erro}</p>}
        {!novo && <a href="#/perfil" className="mt-6 block text-[14px] text-mist underline-offset-4 hover:text-star hover:underline">Voltar para a entrada</a>}
      </section>
    </main>
  )
}
