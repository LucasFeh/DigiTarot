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

/**
 * O que UMA pessoa escolheu para si nesta sessão.
 *
 * `null` = "não escolhi nada" — para o cliente, isso significa herdar do
 * tarólogo. A string `'padrao'` (PADRAO, em `lib/temas/visibilidade`) é uma
 * escolha de verdade: "quero a arte desenhada do site", mesmo que o tarólogo
 * esteja num tema de foto. Sem essa sentinela o cliente não teria como dizer
 * isso, e um valor teria dois significados.
 *
 * Nunca `undefined` nos campos: `JSON.stringify({a: undefined})` devolve `{}` e
 * o campo sumiria ao gravar no LocalBackend; e o `updateDoc()` do Firestore
 * recusa `undefined` em tempo de execução. `null` atravessa os dois.
 */
export type EscolhaVisual = {
  /** null | 'padrao' | id de um tema de baralho do acervo. */
  baralhoId: string | null
  /** null | 'padrao' | id de PANOS ('lua') | 'tema:<id>' do acervo. */
  panoId: string | null
}

export type Sessao = {
  id: string
  tarologoUid: string
  tarologoNome: string
  /** Preenchido quando um cliente entra na sala. */
  clienteUid?: string
  clienteNome?: string
  spreadId: string
  /**
   * @deprecated Pano compartilhado da v1. Sempre significou "o pano que o
   * tarólogo escolheu", e é assim que `escolhasDaSessao()` o dobra. Fica
   * opcional para as sessões já gravadas não perderem a mesa; sessões novas não
   * o escrevem. NUNCA leia este campo direto — use `escolhasDaSessao()`, o
   * único lugar que conhece a herança.
   */
  panoId?: string
  cartas: CartaNaMesa[]
  /** ISO. Guardado como string para o mesmo formato servir aos dois backends. */
  criadaEm: string
  encerrada: boolean
  /** Título que o cliente vê no histórico. */
  titulo: string

  /** Escolha do tarólogo. Replicada porque é o fallback do cliente. */
  visualTarologo?: EscolhaVisual
  /** Escolha do cliente. Replicada só para o tarólogo poder espelhar. */
  visualCliente?: EscolhaVisual
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
