import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  RecaptchaVerifier,
  linkWithCredential,
  linkWithPhoneNumber,
  linkWithPopup,
  onIdTokenChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  unlink,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { novoToken } from './local'
import { ehEmailDeTarologo, TAROLOGO_RODRIGO } from './tarologo'
import { dadosPix } from '../pix'
import { PERFIL_VAZIO } from './types'
import type {
  Agendamento,
  Backend,
  ConfirmacaoSms,
  Convite,
  Mensagem,
  ModoSms,
  Perfil,
  Provedor,
  Sessao,
  TarologoPix,
  TarologoPublico,
  Unsubscribe,
  Usuario,
} from './types'

/**
 * Quem é tarólogo. Isto NÃO é uma barreira de segurança — só decide o que a
 * interface mostra. A regra que vale é a do Firestore, no servidor, que traz o
 * mesmo e-mail e ainda exige que ele venha verificado. Veja `firestore.rules`.
 */
const idTarologo = (email: string | null | undefined) => (email ?? '').trim().toLowerCase()

const PROVEDORES: Record<string, Provedor> = {
  'google.com': 'google',
  password: 'senha',
  phone: 'telefone',
}

const paraUsuario = (u: User, habilitado = false): Usuario => ({
  uid: u.uid,
  // Quem entrou só pelo telefone não tem nome nem e-mail: o número é o único
  // jeito de a pessoa se reconhecer na tela até preencher o perfil.
  nome: u.displayName ?? u.email?.split('@')[0] ?? u.phoneNumber ?? 'Visitante',
  email: u.email ?? '',
  emailVerificado: u.email ? u.emailVerified : Boolean(u.phoneNumber),
  foto: u.photoURL ?? undefined,
  telefone: u.phoneNumber ?? undefined,
  papel: habilitado || (u.emailVerified && ehEmailDeTarologo(u.email)) ? 'tarologo' : 'cliente',
  admin: u.emailVerified && ehEmailDeTarologo(u.email),
  provedores: u.providerData
    .map((p) => PROVEDORES[p.providerId])
    .filter((p): p is Provedor => Boolean(p)),
})

/**
 * O Firestore recusa `undefined` em tempo de execução — não o ignora como o
 * `JSON.stringify` faz. Um campo opcional que não veio derrubaria a gravação
 * inteira, então ele é retirado antes.
 */
function semVazios<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

/** Mensagens do SDK são em inglês e cheias de código. Isto é o que a pessoa lê. */
function traduzir(e: unknown): Error {
  const codigo = (e as { code?: string })?.code ?? ''
  const mapa: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha inválidos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'E-mail ou senha inválidos.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
    'auth/weak-password': 'A senha precisa de ao menos 6 caracteres.',
    'auth/requires-recent-login': 'Por segurança, entre de novo antes de alterar isto.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
    'auth/credential-already-in-use': 'Esta conta Google já está ligada a outro cadastro.',
    'auth/no-such-provider': 'Esta forma de entrar não está vinculada à conta.',
    'auth/invalid-phone-number': 'Número de telefone inválido.',
    'auth/missing-phone-number': 'Informe o número de telefone.',
    'auth/invalid-verification-code': 'Código incorreto. Confira o SMS e tente de novo.',
    'auth/code-expired': 'O código expirou. Peça um novo SMS.',
    'auth/quota-exceeded': 'A cota de SMS do projeto acabou por hoje. Entre por e-mail ou Google.',
    // O Firebase só envia SMS em projeto com faturamento ligado (plano Blaze) e
    // com a região do número liberada. Nos dois casos quem precisa agir é o dono
    // do projeto, não o visitante — então a mensagem o manda para uma porta que
    // funciona em vez de pedir que ele tente de novo.
    'auth/billing-not-enabled':
      'A entrada por SMS está indisponível no momento. Use o Google ou seu e-mail e senha.',
    'auth/admin-restricted-operation':
      'A criação de novas contas está temporariamente suspensa. Se já tem uma conta, entre normalmente.',
    'auth/captcha-check-failed': 'A verificação anti-robô falhou. Recarregue a página e tente de novo.',
    'auth/account-exists-with-different-credential':
      'Este contato já pertence a outra conta. Entre por ela e vincule os dois no perfil.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com o servidor. Verifique a internet e tente de novo.',
    'permission-denied': 'Não foi possível reservar. Confira o horário, o preço e o Pix deste tarólogo.',

    // Os três seguintes não são erro de quem está usando o site: são passos do
    // console do Firebase que faltam. Sem uma mensagem própria, a pessoa lê um
    // código em inglês e conclui que errou a senha — e quem for arrumar perde
    // uma tarde procurando no lugar errado. Veja "Ligando o Firebase", no
    // README.
    'auth/configuration-not-found':
      'O login ainda não foi ativado neste projeto do Firebase (Authentication › Get started).',
    'auth/operation-not-allowed':
      'Esta forma de entrar não está habilitada no Firebase (Authentication › Sign-in method).',
    'auth/unauthorized-domain':
      'Este endereço não está na lista de domínios autorizados do Firebase (Authentication › Settings).',
  }
  return new Error(mapa[codigo] ?? (e instanceof Error ? e.message : 'Não foi possível concluir.'))
}

export class FirebaseBackend implements Backend {
  readonly modo = 'firebase' as const

  private auth
  private db

  constructor(config: FirebaseOptions) {
    const app = initializeApp(config)
    const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim()
    if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      })
    }
    this.auth = getAuth(app)
    this.db = getFirestore(app)
  }

  private exigirUsuario(): User {
    const u = this.auth.currentUser
    if (!u) throw new Error('Entre na sua conta primeiro.')
    return u
  }

  /**
   * O Firebase exige login recente para mexer em e-mail e senha. Quem tem senha
   * reautentica com ela; quem só entrou pelo Google reabre a janela do Google.
   */
  private async reautenticar(senhaAtual?: string) {
    const u = this.exigirUsuario()
    const temSenha = u.providerData.some((p) => p.providerId === 'password')
    if (temSenha && senhaAtual && u.email) {
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, senhaAtual))
    } else if (!temSenha) {
      await reauthenticateWithPopup(u, new GoogleAuthProvider())
    }
  }

  // ------------------------------- conta -------------------------------

  observarUsuario(cb: (u: Usuario | null) => void): Unsubscribe {
    let pararPerfil: Unsubscribe | undefined
    const pararAuth = onIdTokenChanged(this.auth, (u) => {
      pararPerfil?.()
      pararPerfil = undefined
      if (!u) {
        cb(null)
        return
      }
      if (u.emailVerified && ehEmailDeTarologo(u.email)) {
        void this.semearRodrigo().catch((e) => console.error('Perfil inicial do Rodrigo:', e))
        cb(paraUsuario(u))
        return
      }
      if (!u.emailVerified || !u.email) {
        cb(paraUsuario(u))
        return
      }
      pararPerfil = onSnapshot(
        doc(this.db, 'tarologos', idTarologo(u.email)),
        (d) => cb(paraUsuario(u, d.exists())),
        () => cb(paraUsuario(u)),
      )
    })
    return () => {
      pararPerfil?.()
      pararAuth()
    }
  }

  private async semearRodrigo() {
    const ref = doc(this.db, 'tarologos', TAROLOGO_RODRIGO.uid)
    if (!(await getDoc(ref)).exists()) await setDoc(ref, TAROLOGO_RODRIGO)
    const pix = dadosPix()
    if (!pix.configurado || !pix.nome || !pix.cidade) return
    const pixRef = doc(this.db, 'pixTarologos', TAROLOGO_RODRIGO.uid)
    if (!(await getDoc(pixRef)).exists()) {
      await setDoc(pixRef, { chave: pix.chave, nome: pix.nome, cidade: pix.cidade })
    }
  }

  async entrarComGoogle() {
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider())
    } catch (e) {
      throw traduzir(e)
    }
  }

  async entrarComEmail(email: string, senha: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), senha)
    } catch (e) {
      throw traduzir(e)
    }
  }

  async cadastrarComEmail(nome: string, email: string, senha: string) {
    try {
      const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), senha)
      const limpo = nome.trim()
      if (limpo) await updateProfile(user, { displayName: limpo })
      this.auth.languageCode = 'pt'
      await sendEmailVerification(user)
    } catch (e) {
      throw traduzir(e)
    }
  }

  async enviarVerificacaoEmail() {
    try {
      const u = this.exigirUsuario()
      if (!u.email || u.emailVerified) return
      this.auth.languageCode = 'pt'
      await sendEmailVerification(u)
    } catch (e) {
      throw traduzir(e)
    }
  }

  async atualizarVerificacaoEmail(): Promise<boolean> {
    try {
      const u = this.exigirUsuario()
      await u.reload()
      if (u.emailVerified) await u.getIdToken(true)
      return !u.email || u.emailVerified
    } catch (e) {
      throw traduzir(e)
    }
  }

  async recuperarSenha(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email.trim())
    } catch (e) {
      // Conta inexistente não vira erro na tela: dizer "esse e-mail não existe"
      // transforma o formulário num verificador de quem é cliente daqui.
      const codigo = (e as { code?: string })?.code ?? ''
      if (codigo === 'auth/user-not-found') return
      throw traduzir(e)
    }
  }

  async sair() {
    await signOut(this.auth)
  }

  async trocarEmail(novoEmail: string, senhaAtual?: string) {
    try {
      await this.reautenticar(senhaAtual)
      // `verifyBeforeUpdateEmail`, e não `updateEmail`: o e-mail só passa a
      // valer depois de a pessoa clicar no link enviado para o endereço NOVO.
      // É o caminho que o Firebase mantém aberto com a proteção contra
      // enumeração de e-mails ligada (o padrão em projetos criados hoje), e
      // impede alguém de mudar a conta para um endereço que não controla.
      await verifyBeforeUpdateEmail(this.exigirUsuario(), novoEmail.trim())
    } catch (e) {
      throw traduzir(e)
    }
  }

  async definirSenha(novaSenha: string, senhaAtual?: string) {
    try {
      const u = this.exigirUsuario()
      const temSenha = u.providerData.some((p) => p.providerId === 'password')
      await this.reautenticar(senhaAtual)
      if (temSenha) {
        await updatePassword(u, novaSenha)
      } else {
        // Conta que só tinha Google: a senha entra como um provedor NOVO,
        // ligado à mesma conta. É isto que dá à pessoa uma segunda porta antes
        // de ela fechar a do Google.
        if (!u.email) throw new Error('Sua conta não tem e-mail para usar com senha.')
        await linkWithCredential(u, EmailAuthProvider.credential(u.email, novaSenha))
      }
      await u.reload()
    } catch (e) {
      throw traduzir(e)
    }
  }

  async vincularGoogle() {
    try {
      const u = this.exigirUsuario()
      await linkWithPopup(u, new GoogleAuthProvider())
      await u.reload()
    } catch (e) {
      throw traduzir(e)
    }
  }

  async desvincularGoogle() {
    try {
      const u = this.exigirUsuario()
      // Antes esta condição era "tem senha". Com o telefone virando uma porta
      // de entrada legítima, quem entra por SMS ficaria preso ao Google sem
      // motivo — o que importa não é QUAL provedor sobra, e sim que sobre um.
      if (u.providerData.filter((p) => p.providerId !== 'google.com').length === 0) {
        throw new Error(
          'O Google é a sua única forma de entrar. Crie uma senha ou vincule um telefone antes de removê-lo.',
        )
      }
      await unlink(u, 'google.com')
      await u.reload()
    } catch (e) {
      throw traduzir(e)
    }
  }

  // ------------------------------ telefone ------------------------------

  async enviarCodigoSms(
    telefone: string,
    containerId: string,
    modo: ModoSms,
  ): Promise<ConfirmacaoSms> {
    const usuario = modo === 'vincular' ? this.exigirUsuario() : null

    // O reCAPTCHA é obrigatório: é ele que impede alguém de usar o projeto
    // como uma máquina de mandar SMS por conta dos outros — cada mensagem é
    // cobrada de quem é dono do Firebase. Invisível, ele só aparece se a
    // verificação achar a tentativa suspeita.
    const verificador = new RecaptchaVerifier(this.auth, containerId, { size: 'invisible' })

    try {
      const confirmacao =
        modo === 'vincular'
          ? await linkWithPhoneNumber(usuario as User, telefone, verificador)
          : await signInWithPhoneNumber(this.auth, telefone, verificador)

      return {
        telefone,
        confirmar: async (codigo: string) => {
          try {
            const { user } = await confirmacao.confirm(codigo.trim())
            await user.reload()
          } catch (e) {
            throw traduzir(e)
          } finally {
            verificador.clear()
          }
        },
        // Sem isto, desistir no meio deixa o widget preso na página e o próximo
        // envio falha dizendo que o container já foi usado.
        cancelar: () => verificador.clear(),
      }
    } catch (e) {
      verificador.clear()
      throw traduzir(e)
    }
  }

  async desvincularTelefone() {
    try {
      const u = this.exigirUsuario()
      const outros = u.providerData.filter((p) => p.providerId !== 'phone')
      if (outros.length === 0) {
        throw new Error(
          'O telefone é a sua única forma de entrar. Vincule um e-mail ou o Google antes de removê-lo.',
        )
      }
      await unlink(u, 'phone')
      await u.reload()
    } catch (e) {
      throw traduzir(e)
    }
  }

  // ------------------------------- perfil -------------------------------

  observarPerfil(uid: string, cb: (p: Perfil) => void): Unsubscribe {
    return onSnapshot(doc(this.db, 'perfis', uid), (d) => {
      const p = (d.data() ?? {}) as Partial<Perfil>
      cb({ ...PERFIL_VAZIO, ...p, padrao: { ...PERFIL_VAZIO.padrao, ...(p.padrao ?? {}) } })
    })
  }

  async salvarPerfil(uid: string, patch: Partial<Perfil>) {
    // `merge`, e não `updateDoc`: na primeira gravação o documento ainda não
    // existe, e `updateDoc` falharia em vez de criá-lo.
    await setDoc(doc(this.db, 'perfis', uid), semVazios(patch), { merge: true })
  }

  // ---------------------------- tarólogos ----------------------------

  observarTarologos(cb: (lista: TarologoPublico[]) => void, onError?: (erro: string) => void): Unsubscribe {
    return onSnapshot(
      collection(this.db, 'tarologos'),
      (s) => cb(s.docs.map((d) => ({ ...(d.data() as TarologoPublico), uid: d.id }))),
      (e) => {
        console.error('Tarólogos:', e.message)
        onError?.('Não foi possível carregar os tarólogos. Confira as regras do Firestore.')
      },
    )
  }

  observarTarologo(uid: string, cb: (perfil: TarologoPublico | null) => void): Unsubscribe {
    return onSnapshot(
      doc(this.db, 'tarologos', idTarologo(uid)),
      (d) => cb(d.exists() ? { ...(d.data() as TarologoPublico), uid: d.id } : null),
      () => cb(null),
    )
  }

  async salvarTarologo(uid: string, patch: Partial<TarologoPublico>) {
    const id = idTarologo(uid)
    if (!id || id.includes('/')) throw new Error('Informe um e-mail válido para o tarólogo.')
    const ref = doc(this.db, 'tarologos', id)
    const existente = await getDoc(ref)
    const novo: TarologoPublico = {
      nome: '',
      foto: '',
      personagem: '',
      bio: '',
      avaliacao: { media: 5, total: 0 },
      modalidades: {},
      ativo: true,
      ...(existente.data() as Partial<TarologoPublico> | undefined),
      ...patch,
      uid: id,
      email: id,
    }
    await setDoc(ref, novo)
  }

  observarPixTarologo(uid: string, cb: (pix: TarologoPix | null) => void): Unsubscribe {
    return onSnapshot(
      doc(this.db, 'pixTarologos', idTarologo(uid)),
      (d) => cb(d.exists() ? (d.data() as TarologoPix) : null),
      () => cb(null),
    )
  }

  async salvarPixTarologo(uid: string, pix: TarologoPix) {
    await setDoc(doc(this.db, 'pixTarologos', idTarologo(uid)), pix)
  }

  // ---------------------------- agendamentos ----------------------------

  async criarAgendamento(dados: Omit<Agendamento, 'id' | 'criadoEm'>) {
    const ref = doc(collection(this.db, 'agendamentos'))
    const perfilId = idTarologo(dados.tarologoUid)
    const slot = doc(this.db, 'horarios', `${perfilId}_${dados.data}T${dados.hora}`)
    const pixAcesso = doc(this.db, 'pixAcessos', `${perfilId}_${dados.clienteUid}`)
    try {
      // Os três registros nascem juntos; falha em qualquer um não prende o horário.
      const lote = writeBatch(this.db)
      lote.set(slot, {
        uid: dados.clienteUid,
        tarologoUid: perfilId,
        agendamentoId: ref.id,
        criadoEm: new Date().toISOString(),
      })
      lote.set(ref, semVazios({ ...dados, tarologoUid: perfilId, criadoEm: new Date().toISOString() }))
      lote.set(pixAcesso, {
        clienteUid: dados.clienteUid,
        tarologoUid: perfilId,
        agendamentoId: ref.id,
      })
      await lote.commit()
    } catch (e) {
      throw traduzir(e)
    }
    return ref.id
  }

  observarAgendamento(id: string, cb: (a: Agendamento | null) => void): Unsubscribe {
    return onSnapshot(doc(this.db, 'agendamentos', id), (d) =>
      cb(d.exists() ? { ...(d.data() as Omit<Agendamento, 'id'>), id: d.id } : null),
    )
  }

  observarMeusAgendamentos(uid: string, cb: (a: Agendamento[]) => void): Unsubscribe {
    const q = query(collection(this.db, 'agendamentos'), where('clienteUid', '==', uid))
    return onSnapshot(q, (s) =>
      cb(
        s.docs
          .map((d) => ({ ...(d.data() as Omit<Agendamento, 'id'>), id: d.id }))
          .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`)),
      ),
    )
  }

  observarTodosAgendamentos(cb: (a: Agendamento[]) => void): Unsubscribe {
    const u = this.auth.currentUser
    const admin = Boolean(u?.emailVerified && ehEmailDeTarologo(u.email))
    const q = admin
      ? query(collection(this.db, 'agendamentos'), orderBy('data'))
      : query(collection(this.db, 'agendamentos'), where('tarologoUid', '==', idTarologo(u?.email)))
    return onSnapshot(q, (s) =>
      cb(
        s.docs
          .map((d) => ({ ...(d.data() as Omit<Agendamento, 'id'>), id: d.id }))
          .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`)),
      ),
    )
  }

  async atualizarAgendamento(id: string, patch: Partial<Agendamento>) {
    const ref = doc(this.db, 'agendamentos', id)

    // Cancelar devolve o encaixe para a agenda. O horário reservado é um
    // documento à parte, e sem apagá-lo aquele minuto ficaria bloqueado para
    // sempre por uma consulta que não existe mais.
    if (patch.status === 'cancelado') {
      const atual = (await getDoc(ref)).data() as Agendamento | undefined
      if (atual && atual.status !== 'cancelado') {
        const slotId = atual.tarologoUid
          ? `${atual.tarologoUid}_${atual.data}T${atual.hora}`
          : `${atual.data}T${atual.hora}`
        const lote = writeBatch(this.db)
        lote.update(ref, semVazios(patch))
        lote.delete(doc(this.db, 'horarios', slotId))
        await lote.commit()
        return
      }
    }
    if (patch.status === 'confirmado') patch = { ...patch, confirmadoEm: new Date().toISOString() }
    await updateDoc(ref, semVazios(patch))
  }

  observarHorariosOcupados(cb: (slots: string[]) => void): Unsubscribe {
    return onSnapshot(collection(this.db, 'horarios'), (s) => cb(s.docs.map((d) => d.id)))
  }

  // ------------------------ sessões particulares ------------------------

  async criarConvite(dados: Omit<Convite, 'token' | 'criadoEm'>) {
    const token = novoToken()
    // O token é o ID do documento, e não um campo: é isso que permite a regra
    // liberar `get` sem `list`. Quem tem o endereço lê aquele documento; quem
    // não tem não consegue nem descobrir que ele existe.
    await setDoc(
      doc(this.db, 'convites', token),
      semVazios({ ...dados, token, criadoEm: new Date().toISOString() }),
    )
    return token
  }

  observarConvite(token: string, cb: (c: Convite | null) => void): Unsubscribe {
    return onSnapshot(
      doc(this.db, 'convites', token),
      (d) => cb(d.exists() ? ({ ...(d.data() as Convite), token: d.id }) : null),
      // Sem este tratamento, o convidado deslogado que abrisse um link inválido
      // ficaria com a tela girando para sempre em vez de ver "convite não
      // encontrado".
      () => cb(null),
    )
  }

  observarMeusConvites(uid: string, cb: (c: Convite[]) => void): Unsubscribe {
    const q = query(collection(this.db, 'convites'), where('tarologoUid', '==', uid))
    return onSnapshot(
      q,
      (s) =>
        cb(
          s.docs
            .map((d) => ({ ...(d.data() as Convite), token: d.id }))
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
        ),
      // Uma consulta negada pelas regras falha CALADA numa assinatura sem este
      // tratamento: a lista simplesmente nunca chega, e a tela fica dizendo que
      // não há nada. Foi assim que a regra errada passou despercebida.
      (e) => {
        console.error('convites:', e.message)
        cb([])
      },
    )
  }

  async atualizarConvite(token: string, patch: Partial<Convite>) {
    await updateDoc(doc(this.db, 'convites', token), semVazios(patch))
  }

  // ------------------------------ sessões ------------------------------

  async criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>) {
    const ref = doc(collection(this.db, 'sessoes'))
    await setDoc(ref, semVazios({ ...dados, criadaEm: new Date().toISOString() }))
    return ref.id
  }

  observarSessao(id: string, cb: (s: Sessao | null) => void): Unsubscribe {
    return onSnapshot(
      doc(this.db, 'sessoes', id),
      (d) => cb(d.exists() ? { ...(d.data() as Omit<Sessao, 'id'>), id: d.id } : null),
      // Mesa de outra pessoa devolve permissão negada, e isso não é um erro a
      // registrar: é a resposta certa. A tela trata como "não encontrada".
      () => cb(null),
    )
  }

  async atualizarSessao(id: string, patch: Partial<Sessao>) {
    await updateDoc(doc(this.db, 'sessoes', id), patch)
  }

  // ------------------------------ conversa ------------------------------

  observarMensagens(sessaoId: string, cb: (m: Mensagem[]) => void): Unsubscribe {
    const q = query(collection(this.db, 'sessoes', sessaoId, 'mensagens'), orderBy('em'))
    return onSnapshot(
      q,
      (s) => cb(s.docs.map((d) => ({ ...(d.data() as Omit<Mensagem, 'id'>), id: d.id }))),
      () => cb([]),
    )
  }

  async enviarMensagem(sessaoId: string, dados: Omit<Mensagem, 'id' | 'em'>) {
    // `em` é gravado pelo relógio do cliente, e não por `serverTimestamp()`, de
    // propósito: com o carimbo do servidor o campo chega `null` na primeira
    // emissão local do onSnapshot, e a mensagem recém-enviada saltaria para o
    // começo da conversa antes de voltar ao lugar certo. Um relógio adiantado
    // desordena duas falas quase simultâneas; o salto acontecia em todas.
    await setDoc(doc(collection(this.db, 'sessoes', sessaoId, 'mensagens')), {
      ...dados,
      em: new Date().toISOString(),
    })
  }

  observarSessoesAbertas(cb: (s: Sessao[]) => void): Unsubscribe {
    // Cada mesa nasce com dono e convidado definidos, então "abertas" aqui quer
    // dizer "minhas mesas em andamento" — não há mais sala pública para entrar.
    const u = this.auth.currentUser
    if (!u) {
      cb([])
      return () => {}
    }
    return this.observarMinhasSessoes(u.uid, (todas) => cb(todas.filter((s) => !s.encerrada)))
  }

  observarMinhasSessoes(uid: string, cb: (s: Sessao[]) => void): Unsubscribe {
    // Duas consultas porque o Firestore não tem OR entre campos diferentes;
    // os resultados são unidos aqui.
    const comoCliente = query(collection(this.db, 'sessoes'), where('clienteUid', '==', uid))
    const comoTarologo = query(collection(this.db, 'sessoes'), where('tarologoUid', '==', uid))

    let a: Sessao[] = []
    let b: Sessao[] = []
    const emitir = () => {
      const mapa = new Map<string, Sessao>()
      ;[...a, ...b].forEach((s) => mapa.set(s.id, s))
      cb([...mapa.values()].sort((x, y) => y.criadaEm.localeCompare(x.criadaEm)))
    }

    const u1 = onSnapshot(comoCliente, (s) => {
      a = s.docs.map((d) => ({ ...(d.data() as Omit<Sessao, 'id'>), id: d.id }))
      emitir()
    })
    const u2 = onSnapshot(comoTarologo, (s) => {
      b = s.docs.map((d) => ({ ...(d.data() as Omit<Sessao, 'id'>), id: d.id }))
      emitir()
    })
    return () => {
      u1()
      u2()
    }
  }
}
