import type { Backend, Sessao, Unsubscribe, Usuario } from './types'

const CHAVE_USER = 'tarot.usuario'
const CHAVE_UID = 'tarot.uid'
const CHAVE_SESSOES = 'tarot.sessoes'
const CANAL = 'tarot.sync'

/**
 * Credenciais do tarólogo no modo local. É uma conta de demonstração: existe só
 * para você poder abrir a mesa sem montar backend nenhum. No modo Firebase o
 * papel vem do e-mail autenticado, e nada disso é usado.
 */
export const TAROLOGO_DEMO = { email: 'tarologo@tarot.local', senha: 'tarot123' }

/**
 * O usuário fica em `sessionStorage` e as sessões em `localStorage`. É essa
 * divisão que deixa testar a sala de verdade num navegador só: cada aba faz o
 * seu login (tarólogo numa, cliente noutra) enquanto as duas enxergam a mesma
 * mesa. Com tudo em localStorage, as abas dividiriam o mesmo login.
 */
function ler<T>(chave: string, padrao: T, store: Storage = localStorage): T {
  try {
    const raw = store.getItem(chave)
    return raw ? (JSON.parse(raw) as T) : padrao
  } catch {
    return padrao
  }
}

function gravar(chave: string, valor: unknown, store: Storage = localStorage) {
  try {
    store.setItem(chave, JSON.stringify(valor))
  } catch {
    /* modo privado ou cota cheia: o app segue, só não persiste */
  }
}

/**
 * Backend que roda inteiro no navegador. O tempo real entre o tarólogo e o
 * cliente é feito com `BroadcastChannel`: abrindo a mesa em duas abas, uma vê a
 * carta que a outra põe — o mesmo comportamento que o Firestore dará depois,
 * sem precisar de conta nenhuma para testar.
 */
export class LocalBackend implements Backend {
  readonly modo = 'local' as const

  private canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL) : null
  private ouvintesUsuario = new Set<(u: Usuario | null) => void>()
  private ouvintesSessoes = new Set<() => void>()

  constructor() {
    this.canal?.addEventListener('message', (e) => {
      if (e.data === 'sessoes') this.ouvintesSessoes.forEach((f) => f())
    })
    // `storage` cobre o caso de o BroadcastChannel não existir.
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === CHAVE_SESSOES) this.ouvintesSessoes.forEach((f) => f())
      })
    }
  }

  private avisar() {
    this.canal?.postMessage('sessoes')
    this.ouvintesSessoes.forEach((f) => f())
  }

  private sessoes(): Sessao[] {
    return ler<Sessao[]>(CHAVE_SESSOES, [])
  }

  // ------------------------------- auth -------------------------------

  observarUsuario(cb: (u: Usuario | null) => void): Unsubscribe {
    this.ouvintesUsuario.add(cb)
    cb(ler<Usuario | null>(CHAVE_USER, null, sessionStorage))
    return () => this.ouvintesUsuario.delete(cb)
  }

  private definirUsuario(u: Usuario | null) {
    if (u) gravar(CHAVE_USER, u, sessionStorage)
    else sessionStorage.removeItem(CHAVE_USER)
    this.ouvintesUsuario.forEach((f) => f(u))
  }

  async entrarComGoogle() {
    // Sem provedor real aqui, o visitante é simulado. O id fica em
    // localStorage, e não na aba: assim, ao voltar ao site, é a MESMA pessoa e
    // o histórico dela continua lá — que é o que a conta Google fará depois.
    let uid = ler<string | null>(CHAVE_UID, null)
    if (!uid) {
      uid = `cliente-${Date.now().toString(36)}`
      gravar(CHAVE_UID, uid)
    }
    this.definirUsuario({ uid, nome: 'Visitante', email: 'visitante@exemplo.com', papel: 'cliente' })
  }

  async entrarComEmail(email: string, senha: string) {
    if (email.trim().toLowerCase() !== TAROLOGO_DEMO.email || senha !== TAROLOGO_DEMO.senha) {
      throw new Error('E-mail ou senha inválidos.')
    }
    this.definirUsuario({
      uid: 'tarologo-demo',
      nome: 'Tarólogo',
      email: TAROLOGO_DEMO.email,
      papel: 'tarologo',
    })
  }

  async sair() {
    this.definirUsuario(null)
  }

  // ------------------------------ sessões ------------------------------

  async criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>) {
    const id = `s-${Date.now().toString(36)}-${Math.floor(performance.now() % 1000)}`
    const nova: Sessao = { ...dados, id, criadaEm: new Date().toISOString() }
    gravar(CHAVE_SESSOES, [nova, ...this.sessoes()])
    this.avisar()
    return id
  }

  observarSessao(id: string, cb: (s: Sessao | null) => void): Unsubscribe {
    const emitir = () => cb(this.sessoes().find((s) => s.id === id) ?? null)
    this.ouvintesSessoes.add(emitir)
    emitir()
    return () => this.ouvintesSessoes.delete(emitir)
  }

  async atualizarSessao(id: string, patch: Partial<Sessao>) {
    gravar(
      CHAVE_SESSOES,
      this.sessoes().map((s) => (s.id === id ? { ...s, ...patch } : s)),
    )
    this.avisar()
  }

  observarSessoesAbertas(cb: (s: Sessao[]) => void): Unsubscribe {
    const emitir = () => cb(this.sessoes().filter((s) => !s.encerrada))
    this.ouvintesSessoes.add(emitir)
    emitir()
    return () => this.ouvintesSessoes.delete(emitir)
  }

  observarMinhasSessoes(uid: string, cb: (s: Sessao[]) => void): Unsubscribe {
    const emitir = () => cb(this.sessoes().filter((s) => s.clienteUid === uid || s.tarologoUid === uid))
    this.ouvintesSessoes.add(emitir)
    emitir()
    return () => this.ouvintesSessoes.delete(emitir)
  }
}
