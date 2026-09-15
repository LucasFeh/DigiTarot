import type { Usuario } from '../backend'

/**
 * O ÚNICO arquivo de tipos do sistema de temas. Nenhum outro módulo de
 * `src/lib/temas/` exporta tipo de domínio — se precisar de um, ele vem daqui.
 * Sem lógica, sem import de three, sem import de React.
 */

export type TipoTema = 'baralho' | 'pano'

/**
 * Chave de uma imagem DENTRO de um tema: um cardId (`maior-0`, `copas-7`),
 * `verso`, `fundo` (a imagem do pano) ou `mini` (a miniatura da grade).
 */
export type ChaveArte = string

/** Um cardId de `src/data/cards.ts`, ou `verso`. É o que a grade endereça. */
export type Alvo = string

type TemaBase = {
  id: string
  /** 2 a 40 caracteres, já com trim. */
  nome: string
  autorUid: string
  autorNome: string
  /** ISO — mesmo motivo de `Sessao.criadaEm`: um formato só serve aos dois backends. */
  criadoEm: string
  /** Soma dos bytes gravados. Vai no card e no aviso de armazenamento. */
  bytes: number
  /**
   * Tema que vem com o site: os bytes moram em `public/` e são buscados por
   * `fetch` a partir deste prefixo, não no IndexedDB. Ausente nos temas que a
   * pessoa cria. Ver `embutidos.ts`.
   */
  base?: string
}

export type TemaBaralho = TemaBase & {
  tipo: 'baralho'
  /**
   * Os cardIds que este tema cobre, na ordem canônica de CARDS. Parcial de
   * propósito: 22 arcanos maiores é um tema legítimo, e o que não estiver aqui
   * cai na arte desenhada de `svgCarta.ts` — a mesma de hoje.
   */
  cartas: string[]
  /** Há imagem em `${id}|verso`. Sem ela, vale o verso desenhado. */
  temVerso: boolean
}

export type TemaPano = TemaBase & {
  tipo: 'pano'
  /**
   * Cor média da imagem, calculada na gravação. Pinta o card da grade e a borda
   * da mesa enquanto a textura ainda não subiu para a GPU.
   */
  cor: string
}

export type Tema = TemaBaralho | TemaPano

export type Aba = 'comunidade' | 'pessoais' | 'favoritos'

export type ImagemGuardada = {
  /** Sempre `${temaId}|${chave}`, montado por `refImagem()` em `db.ts`. */
  id: string
  blob: Blob
  largura: number
  altura: number
  bytes: number
}

/** O que o assistente entrega ao repositório: TUDO já processado. Salvar é IO. */
export type EntradaTema = {
  tipo: TipoTema
  nome: string
  autor: Usuario
  /** chave -> imagem já composta no tamanho final. Inclui sempre `mini`. */
  imagens: Map<ChaveArte, Omit<ImagemGuardada, 'id'>>
  /** Só para tipo `pano`. */
  cor?: string
}

export interface RepositorioTemas {
  readonly modo: 'local' | 'firebase'
  /** `uid` null = visitante deslogado: só a aba comunidade responde. */
  listar(q: { tipo: TipoTema; aba: Aba; uid: string | null; limite?: number }): Promise<Tema[]>
  obter(id: string): Promise<Tema | null>
  salvar(e: EntradaTema): Promise<Tema>
  apagar(id: string, uid: string): Promise<void>
  /**
   * Os bytes de uma imagem. `null` significa "não tenho" — tema de outro
   * navegador, ou carta que este tema não cobre. Quem chama decide o fallback,
   * e é este `null` que sustenta o estado `ausente` da interface.
   */
  imagem(temaId: string, chave: ChaveArte): Promise<Blob | null>
  favoritos(uid: string): Promise<ReadonlySet<string>>
  favoritar(uid: string, temaId: string, on: boolean): Promise<void>
}

// ───────────────────────────── importação ─────────────────────────────

export type EstadoItem =
  /** Veio por estrutura ou apelido exato: aplicado. */
  | 'casado'
  /** Veio por semelhança: proposto, aguarda um clique. */
  | 'sugerido'
  /** Não casou, ou perdeu a disputa por um alvo. */
  | 'solto'
  /** `createImageBitmap` falhou (HEIC de iPhone, arquivo corrompido). */
  | 'ilegivel'

export type ItemImportado = {
  /** `i-0`, `i-1`… estável durante a importação. Não é o id do tema. */
  id: string
  /** `file.webkitRelativePath || file.name` — a pasta é pista de naipe. */
  caminho: string
  /** Só o nome do arquivo, para caber no cartão da bandeja. */
  rotulo: string
  estado: EstadoItem
  alvo: Alvo | null
  /** Até 3 palpites ordenados, viram botões no cartão. */
  palpites: Alvo[]
  /** A textura final. É isto que vai para o IndexedDB, sem reprocessar. */
  cheia?: Omit<ImagemGuardada, 'id'>
  /** 128px de largura, só para a grade e a bandeja. */
  mini?: Omit<ImagemGuardada, 'id'>
  /** Object URL da `mini`, criada uma vez no fim do envio e revogada ao sair. */
  miniUrl?: string
  /** Preenchido quando `estado === 'ilegivel'`. */
  erro?: string
}

export type Conferencia = {
  itens: ItemImportado[]
  /** alvo -> id do item. Um alvo, um item: quem chega depois fica na bandeja. */
  porAlvo: Map<Alvo, string>
  /** Um passo de desfazer. Mais que isso é infraestrutura para um clique. */
  anterior?: { itens: ItemImportado[]; porAlvo: Map<Alvo, string> }
}

export type AcaoConferencia =
  | { tipo: 'atribuir'; itemId: string; alvo: Alvo }
  | { tipo: 'desatribuir'; itemId: string }
  | { tipo: 'aceitarTodas' }
  | { tipo: 'desfazer' }

export type ProgressoEnvio = {
  feitas: number
  total: number
  /** Nome do arquivo em processamento — a barra não pode ser um número mudo. */
  atual: string
}

// ───────── o que o adaptador entrega às telas (id -> documento) ─────────

/**
 * `nenhum`     = ninguém escolheu tema (arte desenhada, o padrão)
 * `carregando` = o id existe e o documento está sendo lido
 * `pronto`     = documento em mãos
 * `ausente`    = escolheram um tema que ESTE navegador não tem. É o caso que
 *                aparece na tela como "Tema indisponível neste dispositivo", e
 *                não pode ser confundido com `nenhum`.
 */
export type EstadoTema = 'nenhum' | 'carregando' | 'pronto' | 'ausente'

export type TemaCarregado<T extends Tema = Tema> = { estado: EstadoTema; tema: T | null }
