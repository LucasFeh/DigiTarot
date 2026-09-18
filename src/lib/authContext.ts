import { createContext } from 'react'
import type { Backend, ConfirmacaoSms, ModoSms, Usuario } from './backend'

export type EstadoAuth = {
  usuario: Usuario | null
  /** Ainda resolvendo quem está logado — evita piscar a tela de login. */
  carregando: boolean
  backend: Backend | null

  entrarComGoogle: () => Promise<void>
  entrarComEmail: (email: string, senha: string) => Promise<void>
  enviarLinkEmail: (nome: string, email: string) => Promise<void>
  concluirLinkEmail: (nome: string, email: string, link: string) => Promise<{ novo: boolean }>
  enviarVerificacaoEmail: () => Promise<void>
  atualizarVerificacaoEmail: () => Promise<boolean>
  recuperarSenha: (email: string) => Promise<void>
  sair: () => Promise<void>

  trocarEmail: (novoEmail: string, senhaAtual?: string) => Promise<void>
  definirSenha: (novaSenha: string, senhaAtual?: string) => Promise<void>
  vincularGoogle: () => Promise<void>
  desvincularGoogle: () => Promise<void>

  /** Dispara o SMS. `containerId` é onde o reCAPTCHA invisível se monta. */
  enviarCodigoSms: (
    telefone: string,
    containerId: string,
    modo: ModoSms,
  ) => Promise<ConfirmacaoSms>
  desvincularTelefone: () => Promise<void>
}

export const AuthCtx = createContext<EstadoAuth | null>(null)
