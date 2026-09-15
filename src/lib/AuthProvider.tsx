import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarBackend, type Backend, type ModoSms, type Usuario } from './backend'
import { AuthCtx, type EstadoAuth } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    let parar: (() => void) | undefined

    carregarBackend()
      .then((b) => {
        if (!vivo) return
        setBackend(b)
        parar = b.observarUsuario((u) => {
          setUsuario(u)
          setCarregando(false)
        })
      })
      // Sem este catch, qualquer falha ao montar o backend deixaria a tela
      // presa em "Carregando…" para sempre. Melhor degradar para "não logado".
      .catch(() => {
        if (vivo) setCarregando(false)
      })

    return () => {
      vivo = false
      parar?.()
    }
  }, [])

  /**
   * O backend pode ainda não ter chegado quando a pessoa clica — o import do
   * Firebase é dinâmico. Cada ação espera por ele em vez de falhar calada.
   */
  const com = useCallback(
    <A extends unknown[], R>(fn: (b: Backend, ...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const b = backend ?? (await carregarBackend())
        return fn(b, ...args)
      },
    [backend],
  )

  const valor = useMemo<EstadoAuth>(
    () => ({
      usuario,
      carregando,
      backend,
      entrarComGoogle: com((b) => b.entrarComGoogle()),
      entrarComEmail: com((b, email: string, senha: string) => b.entrarComEmail(email, senha)),
      cadastrarComEmail: com((b, nome: string, email: string, senha: string) =>
        b.cadastrarComEmail(nome, email, senha),
      ),
      recuperarSenha: com((b, email: string) => b.recuperarSenha(email)),
      sair: com((b) => b.sair()),
      trocarEmail: com((b, novo: string, atual?: string) => b.trocarEmail(novo, atual)),
      definirSenha: com((b, nova: string, atual?: string) => b.definirSenha(nova, atual)),
      vincularGoogle: com((b) => b.vincularGoogle()),
      desvincularGoogle: com((b) => b.desvincularGoogle()),
      enviarCodigoSms: com((b, tel: string, container: string, modo: ModoSms) =>
        b.enviarCodigoSms(tel, container, modo),
      ),
      desvincularTelefone: com((b) => b.desvincularTelefone()),
    }),
    [usuario, carregando, backend, com],
  )

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}
