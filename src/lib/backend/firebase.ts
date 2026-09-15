import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  RecaptchaVerifier,
  linkWithCredential,
  linkWithPhoneNumber,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
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
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
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

/**
 * Quem é tarólogo. As chaves do Firebase são públicas por natureza, mas isto
 * NÃO é uma barreira de segurança — só decide o que a interface mostra. A regra
 * que vale é a do Firestore, no servidor, que traz o mesmo e-mail escrito à
 * mão. Veja `firestore.rules` na raiz.
 */
function papelDe(email: string | null): Usuario['papel'] {
  const lista = (import.meta.env.VITE_TAROLOGO_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
  return email && lista.includes(email.toLowerCase()) ? 'tarologo' : 'cliente'
}

const PROVEDORES: Record<string, Provedor> = {
  'google.com': 'google',
  password: 'senha',
  phone: 'telefone',
}

const paraUsuario = (u: User): Usuario => ({
  uid: u.uid,
  // Quem entrou só pelo telefone não tem nome nem e-mail: o número é o único
  // jeito de a pessoa se reconhecer na tela até preencher o perfil.
  nome: u.displayName ?? u.email?.split('@')[0] ?? u.phoneNumber ?? 'Visitante',
  email: u.email ?? '',
  foto: u.photoURL ?? undefined,
  telefone: u.phoneNumber ?? undefined,
  papel: papelDe(u.email),
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
      'A entrada por SMS está indisponível no momento. Use o Google ou seu e-mail e senha.',
    'auth/captcha-check-failed': 'A verificação anti-robô falhou. Recarregue a página e tente de novo.',
    'auth/account-exists-with-different-credential':
      'Este contato já pertence a outra conta. Entre por ela e vincule os dois no perfil.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com o servidor. Verifique a internet e tente de novo.',
    'permission-denied': 'Este horário acabou de ser reservado por outra pessoa.',

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
    return onAuthStateChanged(this.auth, (u) => cb(u ? paraUsuario(u) : null))
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
      // O `onAuthStateChanged` já disparou com o displayName ainda vazio. Este
      // reload devolve o usuário com o nome, e o AuthProvider reemite.
      await user.reload()
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

  // ---------------------------- agendamentos ----------------------------

  async criarAgendamento(dados: Omit<Agendamento, 'id' | 'criadoEm'>) {
    const ref = doc(collection(this.db, 'agendamentos'))
    const slot = doc(this.db, 'horarios', `${dados.data}T${dados.hora}`)

    // O horário é reservado ANTES do agendamento, e o id do documento é o
    // próprio encaixe. A regra do Firestore só permite `create` nessa coleção —
    // nunca `update` —, então o segundo cliente que tentar o mesmo minuto
    // recebe permissão negada do servidor. A trava contra reserva dupla é essa,
    // e não uma conferência na tela, que duas pessoas passariam ao mesmo tempo.
    try {
      await setDoc(slot, {
        uid: dados.clienteUid,
        agendamentoId: ref.id,
        criadoEm: new Date().toISOString(),
      })
    } catch (e) {
      throw traduzir(e)
    }

    try {
      await setDoc(ref, semVazios({ ...dados, criadoEm: new Date().toISOString() }))
    } catch (e) {
      // Sem isto, um erro aqui deixaria o encaixe bloqueado para sempre, sem
      // consulta nenhuma por trás.
      await deleteDoc(slot).catch(() => {})
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
    // Ordenar por `data` e `hora` no servidor exigiria um índice composto
    // criado à mão no console. Um campo só usa o índice automático, e o
    // desempate por hora sai daqui — são dezenas de documentos, não milhares.
    const q = query(collection(this.db, 'agendamentos'), orderBy('data'))
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
      if (atual) {
        await deleteDoc(doc(this.db, 'horarios', `${atual.data}T${atual.hora}`)).catch(() => {})
      }
    }

    await updateDoc(ref, semVazios(patch))
  }

  observarHorariosOcupados(cb: (slots: string[]) => void): Unsubscribe {
    return onSnapshot(collection(this.db, 'horarios'), (s) => cb(s.docs.map((d) => d.id)))
  }

  // ------------------------------ sessões ------------------------------

  async criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>) {
    const ref = doc(collection(this.db, 'sessoes'))
    await setDoc(ref, semVazios({ ...dados, criadaEm: new Date().toISOString() }))
    return ref.id
  }

  observarSessao(id: string, cb: (s: Sessao | null) => void): Unsubscribe {
    return onSnapshot(doc(this.db, 'sessoes', id), (d) =>
      cb(d.exists() ? { ...(d.data() as Omit<Sessao, 'id'>), id: d.id } : null),
    )
  }

  async atualizarSessao(id: string, patch: Partial<Sessao>) {
    await updateDoc(doc(this.db, 'sessoes', id), patch)
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
