import { useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { formatarE164 } from '../../lib/telefone'
import VerificacaoTelefone from '../conta/VerificacaoTelefone'

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/40 focus:border-lilac/60'

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-white/10 pt-6">
      <h3 className="font-display text-[17px] text-star">{titulo}</h3>
      <p className="mt-1 max-w-lg text-[14px] leading-relaxed text-mist/70">{descricao}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/**
 * A conta em si: e-mail de acesso, senha, Google e telefone.
 *
 * A regra que atravessa a tela inteira é uma só — ninguém pode ficar sem porta.
 * Cada vínculo só pode ser removido enquanto sobrar outro, e o botão que
 * fecharia a última saída nasce desligado, dizendo por quê, em vez de falhar
 * depois do clique.
 */
export default function SecaoConta() {
  const {
    usuario,
    backend,
    trocarEmail,
    definirSenha,
    vincularGoogle,
    desvincularGoogle,
    desvincularTelefone,
  } = useAuth()

  const [novoEmail, setNovoEmail] = useState('')
  const [senhaEmail, setSenhaEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (!usuario) return null

  const temSenha = usuario.provedores.includes('senha')
  const temGoogle = usuario.provedores.includes('google')
  const temTelefone = usuario.provedores.includes('telefone')
  // Quantas portas de entrada sobram se esta for removida. Zero significa
  // trancar a pessoa do lado de fora da própria conta.
  const portasSem = (qual: string) => usuario.provedores.filter((p) => p !== qual).length
  const outrasPortas = portasSem('telefone')
  const noFirebase = backend?.modo === 'firebase'

  const tentar = async (fn: () => Promise<void>, sucesso: string, limpar?: () => void) => {
    setErro(null)
    setAviso(null)
    setOcupado(true)
    try {
      await fn()
      setAviso(sucesso)
      limpar?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="glass max-w-3xl rounded-2xl p-7">
      <h2 className="mb-1 font-display text-xl text-star">Sua conta</h2>
      <p className="mb-6 text-[14px] text-mist/70">
        Por onde você entra. Isto é separado do seu perfil — trocar o e-mail aqui não muda o nome
        que aparece na mesa.
      </p>

      {/* ------------------------- estado atual ------------------------- */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] uppercase tracking-[0.14em] text-mist/60">E-mail de acesso</p>
          <p className="mt-1 truncate text-[16px] text-star">{usuario.email || '—'}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {temSenha && (
            <span className="rounded-full border border-white/20 px-3 py-1 text-[12px] uppercase tracking-[0.12em] text-mist">
              senha
            </span>
          )}
          {temGoogle && (
            <span className="rounded-full border border-white/20 px-3 py-1 text-[12px] uppercase tracking-[0.12em] text-mist">
              google
            </span>
          )}
          {temTelefone && (
            <span className="rounded-full border border-white/20 px-3 py-1 text-[12px] uppercase tracking-[0.12em] text-mist">
              telefone
            </span>
          )}
        </div>
      </div>

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

      <div className="mt-7 flex flex-col gap-7">
        {/* ------------------------- trocar e-mail ------------------------- */}
        <Bloco
          titulo="Trocar o e-mail"
          descricao={
            noFirebase
              ? 'Enviamos um link de confirmação para o endereço novo. O e-mail só muda depois que você clicar nele — é o que impede alguém de mudar a conta para um endereço que não controla.'
              : 'O endereço passa a valer na hora.'
          }
        >
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault()
              void tentar(
                () => trocarEmail(novoEmail, senhaEmail || undefined),
                noFirebase
                  ? 'Link enviado. Abra o e-mail novo e confirme para concluir a troca.'
                  : 'E-mail atualizado.',
                () => {
                  setNovoEmail('')
                  setSenhaEmail('')
                },
              )
            }}
          >
            <div className="flex flex-1 flex-col gap-3">
              <input
                type="email"
                required
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="Novo e-mail"
                className={CAMPO}
              />
              {temSenha && (
                <input
                  type="password"
                  required
                  value={senhaEmail}
                  onChange={(e) => setSenhaEmail(e.target.value)}
                  placeholder="Sua senha atual"
                  autoComplete="current-password"
                  className={CAMPO}
                />
              )}
            </div>
            <button
              type="submit"
              disabled={ocupado}
              className="shrink-0 rounded-xl border border-white/25 px-5 py-3 text-[15px] text-star transition hover:border-gold/60 disabled:opacity-50"
            >
              Trocar
            </button>
          </form>
        </Bloco>

        {/* --------------------------- senha --------------------------- */}
        <Bloco
          titulo={temSenha ? 'Trocar a senha' : 'Criar uma senha'}
          descricao={
            temSenha
              ? 'Mínimo de 6 caracteres.'
              : 'Você entrou pelo Google e ainda não tem senha. Criar uma agora é o que te dá uma segunda porta — e o que permite desvincular o Google depois.'
          }
        >
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault()
              void tentar(
                () => definirSenha(novaSenha, senhaAtual || undefined),
                temSenha ? 'Senha atualizada.' : 'Senha criada. Agora você pode entrar dos dois jeitos.',
                () => {
                  setNovaSenha('')
                  setSenhaAtual('')
                },
              )
            }}
          >
            <div className="flex flex-1 flex-col gap-3">
              {temSenha && (
                <input
                  type="password"
                  required
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Senha atual"
                  autoComplete="current-password"
                  className={CAMPO}
                />
              )}
              <input
                type="password"
                required
                minLength={6}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Nova senha"
                autoComplete="new-password"
                className={CAMPO}
              />
            </div>
            <button
              type="submit"
              disabled={ocupado}
              className="shrink-0 rounded-xl border border-white/25 px-5 py-3 text-[15px] text-star transition hover:border-gold/60 disabled:opacity-50"
            >
              Salvar
            </button>
          </form>
        </Bloco>

        {/* --------------------------- google --------------------------- */}
        <Bloco
          titulo="Conta Google"
          descricao={
            temGoogle
              ? 'Entrar com um clique. Você pode desvincular a qualquer momento, desde que tenha uma senha para continuar entrando.'
              : 'Vincule para passar a entrar com um clique, sem digitar senha.'
          }
        >
          {temGoogle ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={ocupado || portasSem('google') === 0}
                onClick={() =>
                  void tentar(desvincularGoogle, 'Google desvinculado da sua conta.')
                }
                className="rounded-xl border border-white/25 px-5 py-3 text-[15px] text-star transition hover:border-rose/60 hover:text-rose disabled:cursor-not-allowed disabled:opacity-40"
              >
                Desvincular o Google
              </button>
              {portasSem('google') === 0 && (
                <span className="text-[14px] text-gold/90">
                  É a sua única forma de entrar. Crie uma senha ou vincule um telefone antes.
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void tentar(vincularGoogle, 'Conta Google vinculada.')}
              className="rounded-xl border border-white/25 px-5 py-3 text-[15px] text-star transition hover:border-gold/60 disabled:opacity-50"
            >
              Vincular conta Google
            </button>
          )}
        </Bloco>

        {/* -------------------------- telefone -------------------------- */}
        <Bloco
          titulo="Telefone"
          descricao={
            temTelefone
              ? 'Você entra pedindo um código por SMS, sem senha nenhuma.'
              : 'Vincule um número para passar a entrar com um código por SMS. Ele também serve de contato para as consultas.'
          }
        >
          {temTelefone ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[16px] text-star">
                {formatarE164(usuario.telefone ?? '')}
              </span>
              <button
                type="button"
                disabled={ocupado || outrasPortas === 0}
                onClick={() =>
                  void tentar(desvincularTelefone, 'Telefone desvinculado da sua conta.')
                }
                className="rounded-xl border border-white/25 px-5 py-3 text-[15px] text-star transition hover:border-rose/60 hover:text-rose disabled:cursor-not-allowed disabled:opacity-40"
              >
                Desvincular
              </button>
              {outrasPortas === 0 && (
                <span className="text-[14px] text-gold/90">
                  É a sua única forma de entrar. Crie uma senha ou vincule o Google antes.
                </span>
              )}
            </div>
          ) : (
            <div className="max-w-sm">
              <VerificacaoTelefone
                modo="vincular"
                containerId="recaptcha-perfil"
                rotuloEnviar="Enviar código por SMS"
              />
            </div>
          )}
        </Bloco>
      </div>

      {!noFirebase && (
        <p className="mt-7 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-mist/55">
          Modo local: a conta existe só neste navegador. Com o Firebase ligado, ela passa a valer em
          qualquer aparelho.
        </p>
      )}
    </div>
  )
}
