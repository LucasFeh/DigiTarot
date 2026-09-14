import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { Backend, Sessao, Unsubscribe, Usuario } from './types'

/**
 * Quem é tarólogo. As chaves do Firebase são públicas por natureza, mas isto
 * NÃO é uma barreira de segurança — só decide o que a interface mostra. A
 * regra que vale é a do Firestore, no servidor: só o dono da sessão pode
 * escrever nela. Veja `firestore.rules` na raiz.
 */
function papelDe(email: string | null): Usuario['papel'] {
  const lista = (import.meta.env.VITE_TAROLOGO_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
  return email && lista.includes(email.toLowerCase()) ? 'tarologo' : 'cliente'
}

const paraUsuario = (u: User): Usuario => ({
  uid: u.uid,
  nome: u.displayName ?? u.email?.split('@')[0] ?? 'Visitante',
  email: u.email ?? '',
  foto: u.photoURL ?? undefined,
  papel: papelDe(u.email),
})

export class FirebaseBackend implements Backend {
  readonly modo = 'firebase' as const

  private auth
  private db

  constructor(config: FirebaseOptions) {
    const app = initializeApp(config)
    this.auth = getAuth(app)
    this.db = getFirestore(app)
  }

  observarUsuario(cb: (u: Usuario | null) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, (u) => cb(u ? paraUsuario(u) : null))
  }

  async entrarComGoogle() {
    await signInWithPopup(this.auth, new GoogleAuthProvider())
  }

  async entrarComEmail(email: string, senha: string) {
    await signInWithEmailAndPassword(this.auth, email, senha)
  }

  async sair() {
    await signOut(this.auth)
  }

  async criarSessao(dados: Omit<Sessao, 'id' | 'criadaEm'>) {
    const ref = await addDoc(collection(this.db, 'sessoes'), {
      ...dados,
      criadaEm: new Date().toISOString(),
    })
    return ref.id
  }

  observarSessao(id: string, cb: (s: Sessao | null) => void): Unsubscribe {
    return onSnapshot(doc(this.db, 'sessoes', id), (d) =>
      cb(d.exists() ? ({ ...(d.data() as Omit<Sessao, 'id'>), id: d.id }) : null),
    )
  }

  async atualizarSessao(id: string, patch: Partial<Sessao>) {
    await updateDoc(doc(this.db, 'sessoes', id), patch)
  }

  observarSessoesAbertas(cb: (s: Sessao[]) => void): Unsubscribe {
    const q = query(
      collection(this.db, 'sessoes'),
      where('encerrada', '==', false),
      orderBy('criadaEm', 'desc'),
    )
    return onSnapshot(q, (snap) =>
      cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Sessao, 'id'>), id: d.id }))),
    )
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
