export type Papel = 'cliente' | 'tarologo'

export type Usuario = {
  uid: string
  nome: string
  email: string
  foto?: string
  papel: Papel
}

/** Uma carta posta pelo tarólogo num slot do layout. */
export type CartaNaMesa = {
  slot: number
  cardId: string
  /** Cartas invertidas têm outro significado. */
  invertida: boolean
  /** Enquanto falsa, o cliente vê só o verso. */
  revelada: boolean
}

export type Sessao = {
  id: string
  tarologoUid: string
  tarologoNome: string
  /** Preenchido quando um cliente entra na sala. */
  clienteUid?: string
  clienteNome?: string
  spreadId: string
  panoId: string
  cartas: CartaNaMesa[]
  /** ISO. Guardado como string para o mesmo formato servir aos dois backends. */
  criadaEm: string
  encerrada: boolean
  /** Título que o cliente vê no histórico. */
  titulo: string
}

export type Unsubscribe = () => void

/**
 * Tudo que o app precisa de um servidor. Existem duas implementações — uma
 * local, que roda sem nenhuma conta, e a do Firebase. A tela não sabe qual está
 * em uso, o que permite construir e testar tudo antes de haver credenciais.
 */
export interface Backend {
  /** Nome curto para a interface mostrar em que modo está rodando. */
  readonly modo: 'local' | 'firebase'

  observarUsuario(cb: (u: Usuario | null) => void): Unsubscribe
  entrarComGoogle(): Promise<void>
  entrarComEmail(email: string, senha: string): Promise<void>
  sair(): Promise<void>

  criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>): Promise<string>
  observarSessao(id: string, cb: (s: Sessao | null) => void): Unsubscribe
  atualizarSessao(id: string, patch: Partial<Sessao>): Promise<void>
  /** Sessões abertas de qualquer tarólogo — é por onde o cliente entra. */
  observarSessoesAbertas(cb: (s: Sessao[]) => void): Unsubscribe
  /** Histórico: tudo em que este usuário participou. */
  observarMinhasSessoes(uid: string, cb: (s: Sessao[]) => void): Unsubscribe
}
