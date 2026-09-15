import { EMAIL_TAROLOGO, ehEmailDeTarologo } from './tarologo'
import { PERFIL_VAZIO } from './types'
import type {
  Agendamento,
  Backend,
  ConfirmacaoSms,
  ModoSms,
  Perfil,
  Provedor,
  Sessao,
  Unsubscribe,
  Usuario,
} from './types'

const CHAVE_USER = 'tarot.usuario'
const CHAVE_CONTAS = 'tarot.contas'
const CHAVE_UID = 'tarot.uid'
const CHAVE_PERFIS = 'tarot.perfis'
const CHAVE_SESSOES = 'tarot.sessoes'
const CHAVE_AGENDA = 'tarot.agendamentos'
const CHAVE_HORARIOS = 'tarot.horarios'
const CANAL = 'tarot.sync'

/**
 * A conta do tarólogo no modo local. A senha daqui é de DEMONSTRAÇÃO e existe
 * só para abrir a mesa sem montar backend nenhum.
 *
 * Em produção não há senha alguma: o Rodrigo entra pelo Google, com este mesmo
 * e-mail, e as regras do Firestore exigem que o endereço venha verificado. Duas
 * consequências boas de uma escolha só — não há credencial para vazar num
 * repositório público, e não há como alguém se cadastrar com o endereço dele
 * para herdar o papel.
 */
export const CONTA_TAROLOGO = { email: EMAIL_TAROLOGO, senha: 'tarot-local' }

/**
 * Um visitante de teste, para percorrer o caminho do cliente — catálogo,
 * agenda, Pix, mesa — sem precisar criar conta a cada vez.
 *
 * Existe só no modo local. Assim que as chaves do Firebase entram no `.env`,
 * nada deste arquivo roda e esta conta simplesmente não existe, o que é a
 * garantia de que ela nunca vai parar no site publicado com conta de verdade.
 */
export const CONTA_TESTE = { email: 'visitante@teste.com', senha: 'tarot123' }

/**
 * O codigo que o "SMS" do modo local sempre aceita. Nao ha operadora aqui, e
 * sortear um numero para depois imprimi-lo na tela seria teatro: a pessoa que
 * testa precisa e de um valor que ela ja sabe. No Firebase o codigo vem da
 * mensagem de verdade e nada disto roda.
 */
export const CODIGO_SMS_LOCAL = '123456'

/**
 * O usuário fica em `sessionStorage` e o resto em `localStorage`. É essa
 * divisão que deixa testar a sala de verdade num navegador só: cada aba faz o
 * seu login (tarólogo numa, cliente noutra) enquanto as duas enxergam a mesma
 * mesa. Com tudo em localStorage, as abas dividiriam o mesmo login.
 */
type Onde = 'local' | 'sessao'

/**
 * O armazenamento é resolvido DENTRO do try, e nunca recebido como parâmetro.
 * Em navegador com dados de site bloqueados, ou num iframe sem
 * `allow-same-origin`, só tocar em `localStorage` já lança `SecurityError` — e
 * um valor padrão de parâmetro (`store: Storage = localStorage`) é avaliado na
 * chamada, antes de o corpo entrar no try. O throw escapava por fora, a
 * promessa do AuthProvider rejeitava e a tela ficava presa em "Carregando…".
 */
function store(onde: Onde): Storage {
  return onde === 'local' ? localStorage : sessionStorage
}

function ler<T>(chave: string, padrao: T, onde: Onde = 'local'): T {
  try {
    const raw = store(onde).getItem(chave)
    return raw ? (JSON.parse(raw) as T) : padrao
  } catch {
    return padrao
  }
}

function gravar(chave: string, valor: unknown, onde: Onde = 'local') {
  try {
    store(onde).setItem(chave, JSON.stringify(valor))
  } catch {
    /* modo privado, cota cheia ou storage bloqueado: o app segue sem persistir */
  }
}

function apagar(chave: string, onde: Onde = 'local') {
  try {
    store(onde).removeItem(chave)
  } catch {
    /* idem */
  }
}

/**
 * Uma conta no modo local. A senha fica em claro no `localStorage` — o que é
 * aceitável exatamente porque isto NÃO é um servidor: nada aqui sai do
 * navegador de quem está testando. No modo Firebase quem guarda credencial é o
 * Identity Platform, e nada deste arquivo roda.
 */
type Conta = {
  uid: string
  nome: string
  email: string
  senha: string
  provedores: Provedor[]
  foto?: string
  /** Em E.164, quando a conta tem telefone. */
  telefone?: string
}

/**
 * Id único para contas, reservas e mesas.
 *
 * O relógio sozinho não basta: `Date.now()` tem resolução de milissegundo, e
 * duas contas criadas dentro do mesmo milissegundo receberiam o MESMO id — a
 * segunda sobrescreveria a primeira no armazenamento, e as duas pessoas
 * passariam a dividir uma conta só. Acontece em teste automatizado, e acontece
 * de verdade quando alguém clica duas vezes rápido.
 */
function novoId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const semSenha = (c: Conta): Usuario => ({
  uid: c.uid,
  nome: c.nome,
  email: c.email,
  foto: c.foto,
  telefone: c.telefone,
  papel: ehEmailDeTarologo(c.email) ? 'tarologo' : 'cliente',
  provedores: c.provedores,
})

/**
 * Backend que roda inteiro no navegador. O tempo real entre o tarólogo e o
 * cliente é feito com `BroadcastChannel`: abrindo a mesa em duas abas, uma vê a
 * carta que a outra põe — o mesmo comportamento que o Firestore dá depois, sem
 * precisar de conta nenhuma para testar.
 */
export class LocalBackend implements Backend {
  readonly modo = 'local' as const

  /** Pode lançar em origem opaca; sem ele o app segue, só sem tempo real. */
  private canal = (() => {
    try {
      return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL) : null
    } catch {
      return null
    }
  })()
  private ouvintesUsuario = new Set<(u: Usuario | null) => void>()
  private ouvintesSessoes = new Set<() => void>()
  private ouvintesAgenda = new Set<() => void>()
  private ouvintesPerfil = new Set<() => void>()

  constructor() {
    this.canal?.addEventListener('message', (e) => this.receber(String(e.data)))
    // `storage` cobre o caso de o BroadcastChannel não existir.
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === CHAVE_SESSOES) this.receber('sessoes')
        if (e.key === CHAVE_AGENDA || e.key === CHAVE_HORARIOS) this.receber('agenda')
        if (e.key === CHAVE_PERFIS) this.receber('perfis')
      })
    }
  }

  private receber(tipo: string) {
    if (tipo === 'sessoes') this.ouvintesSessoes.forEach((f) => f())
    if (tipo === 'agenda') this.ouvintesAgenda.forEach((f) => f())
    if (tipo === 'perfis') this.ouvintesPerfil.forEach((f) => f())
  }

  private avisar(tipo: 'sessoes' | 'agenda' | 'perfis') {
    this.canal?.postMessage(tipo)
    this.receber(tipo)
  }

  private sessoes(): Sessao[] {
    return ler<Sessao[]>(CHAVE_SESSOES, [])
  }

  private agendamentos(): Agendamento[] {
    return ler<Agendamento[]>(CHAVE_AGENDA, [])
  }

  private horarios(): Record<string, string> {
    return ler<Record<string, string>>(CHAVE_HORARIOS, {})
  }

  private contas(): Record<string, Conta> {
    const mapa = ler<Record<string, Conta>>(CHAVE_CONTAS, {})
    // As contas fixas são semeadas na leitura, e não num passo de instalação:
    // quem abrir o projeto pela primeira vez já entra com as credenciais do
    // README, dos dois lados da mesa.
    let novo = false
    if (!mapa[EMAIL_TAROLOGO]) {
      mapa[EMAIL_TAROLOGO] = {
        uid: 'tarologo-rodrigo',
        nome: 'Rodrigo',
        email: CONTA_TAROLOGO.email,
        senha: CONTA_TAROLOGO.senha,
        provedores: ['senha'],
      }
      novo = true
    }
    if (!mapa[CONTA_TESTE.email]) {
      mapa[CONTA_TESTE.email] = {
        uid: 'cliente-teste',
        nome: 'Visitante de teste',
        email: CONTA_TESTE.email,
        senha: CONTA_TESTE.senha,
        provedores: ['senha'],
      }
      novo = true
    }
    if (novo) gravar(CHAVE_CONTAS, mapa)
    return mapa
  }

  /**
   * A chave do mapa é o e-mail — menos para quem entrou só pelo telefone, que
   * não tem um. Nesse caso o próprio número serve de chave, e é por isso que
   * ela é calculada aqui em vez de lida direto de `c.email`: um `''` de chave
   * faria a segunda conta sem e-mail sobrescrever a primeira.
   */
  private chaveDe(c: Conta): string {
    return (c.email || c.telefone || c.uid).toLowerCase()
  }

  private salvarConta(c: Conta) {
    const mapa = this.contas()
    const chave = this.chaveDe(c)

    // Toda entrada antiga DESTA conta sai antes de a nova entrar. A chave muda
    // sozinha em vários caminhos — trocar de e-mail, ganhar um e-mail depois de
    // ter entrado por telefone, largar o telefone — e a cópia deixada para trás
    // não fica só ocupando espaço: ela guarda um retrato obsoleto da conta, e
    // uma busca por telefone acabava achando a versão velha de si mesma e
    // ressuscitando um vínculo que a pessoa tinha acabado de remover.
    Object.keys(mapa).forEach((k) => {
      if (mapa[k].uid === c.uid && k !== chave) delete mapa[k]
    })

    mapa[chave] = c
    gravar(CHAVE_CONTAS, mapa)
  }

  /** A conta de quem está logado nesta aba. */
  private contaAtual(): Conta {
    const u = ler<Usuario | null>(CHAVE_USER, null, 'sessao')
    const conta = u ? Object.values(this.contas()).find((c) => c.uid === u.uid) : undefined
    if (!conta) throw new Error('Entre na sua conta primeiro.')
    return conta
  }

  // ------------------------------- conta -------------------------------

  observarUsuario(cb: (u: Usuario | null) => void): Unsubscribe {
    this.ouvintesUsuario.add(cb)
    cb(ler<Usuario | null>(CHAVE_USER, null, 'sessao'))
    return () => this.ouvintesUsuario.delete(cb)
  }

  private definirUsuario(u: Usuario | null) {
    if (u) gravar(CHAVE_USER, u, 'sessao')
    else apagar(CHAVE_USER, 'sessao')
    this.ouvintesUsuario.forEach((f) => f(u))
  }

  async entrarComGoogle() {
    // Sem provedor real aqui, o visitante é simulado. O id fica em
    // localStorage, e não na aba: assim, ao voltar ao site, é a MESMA pessoa e
    // o histórico dela continua lá — que é o que a conta Google faz depois.
    let uid = ler<string | null>(CHAVE_UID, null)
    if (!uid) {
      uid = novoId('cliente')
      gravar(CHAVE_UID, uid)
    }
    const existente = Object.values(this.contas()).find((c) => c.uid === uid)
    const conta: Conta = existente ?? {
      uid,
      nome: 'Visitante',
      email: `visitante.${uid}@exemplo.com`,
      senha: '',
      provedores: ['google'],
    }
    if (!conta.provedores.includes('google')) conta.provedores = [...conta.provedores, 'google']
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  async entrarComEmail(email: string, senha: string) {
    const conta = this.contas()[email.trim().toLowerCase()]
    if (!conta || conta.senha !== senha) throw new Error('E-mail ou senha inválidos.')
    this.definirUsuario(semSenha(conta))
  }

  async cadastrarComEmail(nome: string, email: string, senha: string) {
    const chave = email.trim().toLowerCase()
    if (this.contas()[chave]) throw new Error('Já existe uma conta com este e-mail.')
    if (senha.length < 6) throw new Error('A senha precisa de ao menos 6 caracteres.')
    const conta: Conta = {
      uid: novoId('cliente'),
      nome: nome.trim() || 'Visitante',
      email: email.trim(),
      senha,
      provedores: ['senha'],
    }
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  async recuperarSenha(email: string) {
    // Não existe caixa de entrada aqui. A mensagem da tela é a mesma dos dois
    // modos ("se houver conta, o link foi enviado"), então não mentir é só não
    // dizer nada além disso.
    if (!this.contas()[email.trim().toLowerCase()]) return
  }

  async sair() {
    this.definirUsuario(null)
  }

  async trocarEmail(novoEmail: string, senhaAtual?: string) {
    const conta = this.contaAtual()
    if (conta.provedores.includes('senha') && conta.senha !== (senhaAtual ?? '')) {
      throw new Error('Senha atual incorreta.')
    }
    const chave = novoEmail.trim().toLowerCase()
    if (!chave.includes('@')) throw new Error('E-mail inválido.')
    if (this.contas()[chave] && this.contas()[chave].uid !== conta.uid) {
      throw new Error('Já existe uma conta com este e-mail.')
    }
    conta.email = novoEmail.trim()
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  async definirSenha(novaSenha: string, senhaAtual?: string) {
    const conta = this.contaAtual()
    if (conta.provedores.includes('senha') && conta.senha !== (senhaAtual ?? '')) {
      throw new Error('Senha atual incorreta.')
    }
    if (novaSenha.length < 6) throw new Error('A senha precisa de ao menos 6 caracteres.')
    conta.senha = novaSenha
    if (!conta.provedores.includes('senha')) conta.provedores = [...conta.provedores, 'senha']
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  async vincularGoogle() {
    const conta = this.contaAtual()
    if (!conta.provedores.includes('google')) conta.provedores = [...conta.provedores, 'google']
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  async desvincularGoogle() {
    const conta = this.contaAtual()
    if (conta.provedores.filter((p) => p !== 'google').length === 0) {
      throw new Error(
        'O Google é a sua única forma de entrar. Crie uma senha ou vincule um telefone antes de removê-lo.',
      )
    }
    conta.provedores = conta.provedores.filter((p) => p !== 'google')
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  // ------------------------------ telefone ------------------------------

  async enviarCodigoSms(
    telefone: string,
    _containerId: string,
    modo: ModoSms,
  ): Promise<ConfirmacaoSms> {
    // Nenhuma mensagem sai daqui. O que este backend reproduz é o FORMATO da
    // conversa — enviar, esperar, confirmar —, para a tela ser escrita e testada
    // uma vez só e não mudar quando o Firebase entrar.
    const conta = modo === 'vincular' ? this.contaAtual() : null

    return {
      telefone,
      confirmar: async (codigo: string) => {
        if (codigo.trim() !== CODIGO_SMS_LOCAL) {
          throw new Error('Código incorreto. Confira o SMS e tente de novo.')
        }

        if (conta) {
          const outra = Object.values(this.contas()).find(
            (c) => c.telefone === telefone && c.uid !== conta.uid,
          )
          if (outra) throw new Error('Este telefone já pertence a outra conta.')
          conta.telefone = telefone
          if (!conta.provedores.includes('telefone')) {
            conta.provedores = [...conta.provedores, 'telefone']
          }
          this.salvarConta(conta)
          this.definirUsuario(semSenha(conta))
          return
        }

        // Entrar: reaproveita a conta daquele número, ou cria uma na hora — é o
        // que o Firebase faz, e é o que torna o telefone uma porta de entrada
        // completa, e não só um dado a mais no cadastro.
        const existente = Object.values(this.contas()).find((c) => c.telefone === telefone)
        const nova: Conta = existente ?? {
          uid: novoId('cliente'),
          nome: telefone,
          email: '',
          senha: '',
          provedores: ['telefone'],
          telefone,
        }
        if (!nova.provedores.includes('telefone')) {
          nova.provedores = [...nova.provedores, 'telefone']
        }
        // Conta sem e-mail não pode ser indexada por e-mail: a chave do mapa
        // passa a ser o próprio número.
        this.salvarConta(nova)
        this.definirUsuario(semSenha(nova))
      },
      cancelar: () => {},
    }
  }

  async desvincularTelefone() {
    const conta = this.contaAtual()
    if (conta.provedores.filter((p) => p !== 'telefone').length === 0) {
      throw new Error(
        'O telefone é a sua única forma de entrar. Vincule um e-mail ou o Google antes de removê-lo.',
      )
    }
    conta.provedores = conta.provedores.filter((p) => p !== 'telefone')
    delete conta.telefone
    this.salvarConta(conta)
    this.definirUsuario(semSenha(conta))
  }

  // ------------------------------- perfil -------------------------------

  private perfis(): Record<string, Perfil> {
    return ler<Record<string, Perfil>>(CHAVE_PERFIS, {})
  }

  observarPerfil(uid: string, cb: (p: Perfil) => void): Unsubscribe {
    const emitir = () => {
      const p = this.perfis()[uid]
      // Espalhado sobre o vazio: perfil gravado por uma versão anterior pode
      // não ter todos os campos, e `undefined` num input faz o React reclamar
      // de campo não controlado.
      cb({ ...PERFIL_VAZIO, ...(p ?? {}), padrao: { ...PERFIL_VAZIO.padrao, ...(p?.padrao ?? {}) } })
    }
    this.ouvintesPerfil.add(emitir)
    emitir()
    return () => this.ouvintesPerfil.delete(emitir)
  }

  async salvarPerfil(uid: string, patch: Partial<Perfil>) {
    const mapa = this.perfis()
    mapa[uid] = { ...PERFIL_VAZIO, ...(mapa[uid] ?? {}), ...patch }
    gravar(CHAVE_PERFIS, mapa)
    this.avisar('perfis')
  }

  // ---------------------------- agendamentos ----------------------------

  async criarAgendamento(dados: Omit<Agendamento, 'id' | 'criadoEm'>) {
    const slot = `${dados.data}T${dados.hora}`
    if (this.horarios()[slot]) throw new Error('Esse horário acabou de ser reservado. Escolha outro.')

    const id = novoId('a')
    const novo: Agendamento = { ...dados, id, criadoEm: new Date().toISOString() }
    gravar(CHAVE_AGENDA, [novo, ...this.agendamentos()])
    gravar(CHAVE_HORARIOS, { ...this.horarios(), [slot]: id })
    this.avisar('agenda')
    return id
  }

  observarAgendamento(id: string, cb: (a: Agendamento | null) => void): Unsubscribe {
    const emitir = () => cb(this.agendamentos().find((a) => a.id === id) ?? null)
    this.ouvintesAgenda.add(emitir)
    emitir()
    return () => this.ouvintesAgenda.delete(emitir)
  }

  observarMeusAgendamentos(uid: string, cb: (a: Agendamento[]) => void): Unsubscribe {
    const emitir = () => cb(this.agendamentos().filter((a) => a.clienteUid === uid))
    this.ouvintesAgenda.add(emitir)
    emitir()
    return () => this.ouvintesAgenda.delete(emitir)
  }

  observarTodosAgendamentos(cb: (a: Agendamento[]) => void): Unsubscribe {
    const emitir = () => cb(this.agendamentos())
    this.ouvintesAgenda.add(emitir)
    emitir()
    return () => this.ouvintesAgenda.delete(emitir)
  }

  async atualizarAgendamento(id: string, patch: Partial<Agendamento>) {
    const lista = this.agendamentos().map((a) => (a.id === id ? { ...a, ...patch } : a))
    gravar(CHAVE_AGENDA, lista)

    // Cancelar devolve o encaixe para a agenda; sem isso o horário ficaria
    // morto para sempre.
    if (patch.status === 'cancelado') {
      const alvo = lista.find((a) => a.id === id)
      if (alvo) {
        const mapa = this.horarios()
        delete mapa[`${alvo.data}T${alvo.hora}`]
        gravar(CHAVE_HORARIOS, mapa)
      }
    }
    this.avisar('agenda')
  }

  observarHorariosOcupados(cb: (slots: string[]) => void): Unsubscribe {
    const emitir = () => cb(Object.keys(this.horarios()))
    this.ouvintesAgenda.add(emitir)
    emitir()
    return () => this.ouvintesAgenda.delete(emitir)
  }

  // ------------------------------ sessões ------------------------------

  async criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>) {
    const id = novoId('s')
    const nova: Sessao = { ...dados, id, criadaEm: new Date().toISOString() }
    gravar(CHAVE_SESSOES, [nova, ...this.sessoes()])
    this.avisar('sessoes')
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
    this.avisar('sessoes')
  }

  observarSessoesAbertas(cb: (s: Sessao[]) => void): Unsubscribe {
    // Cada mesa nasce com dono e convidado definidos, então "abertas" aqui quer
    // dizer "minhas mesas em andamento" — não há mais sala pública para entrar.
    const emitir = () => {
      const u = ler<Usuario | null>(CHAVE_USER, null, 'sessao')
      if (!u) return cb([])
      cb(this.sessoes().filter((s) => !s.encerrada && (s.clienteUid === u.uid || s.tarologoUid === u.uid)))
    }
    this.ouvintesSessoes.add(emitir)
    emitir()
    return () => this.ouvintesSessoes.delete(emitir)
  }

  observarMinhasSessoes(uid: string, cb: (s: Sessao[]) => void): Unsubscribe {
    const emitir = () =>
      cb(this.sessoes().filter((s) => s.clienteUid === uid || s.tarologoUid === uid))
    this.ouvintesSessoes.add(emitir)
    emitir()
    return () => this.ouvintesSessoes.delete(emitir)
  }
}
