import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarBackend, type Backend, type Usuario } from './backend'
import { AuthCtx, type EstadoAuth } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    let parar: (() => void) | undefined

    carregarBackend().then((b) => {
      if (!vivo) return
      setBackend(b)
      parar = b.observarUsuario((u) => {
        setUsuario(u)
        setCarregando(false)
      })
    })

    return () => {
      vivo = false
      parar?.()
    }
  }, [])

  const valor = useMemo<EstadoAuth>(
    () => ({
      usuario,
      carregando,
      backend,
      entrarComGoogle: async () => {
        const b = backend ?? (await carregarBackend())
        await b.entrarComGoogle()
      },
      entrarComEmail: async (email, senha) => {
        const b = backend ?? (await carregarBackend())
        await b.entrarComEmail(email, senha)
      },
      sair: async () => {
        const b = backend ?? (await carregarBackend())
        await b.sair()
      },
    }),
    [usuario, carregando, backend],
  )

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}
