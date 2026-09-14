import { createContext } from 'react'
import type { Backend, Usuario } from './backend'

export type EstadoAuth = {
  usuario: Usuario | null
  /** Ainda resolvendo quem está logado — evita piscar a tela de login. */
  carregando: boolean
  backend: Backend | null
  entrarComGoogle: () => Promise<void>
  entrarComEmail: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

export const AuthCtx = createContext<EstadoAuth | null>(null)
