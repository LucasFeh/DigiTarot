import { LocalBackend } from './local'
import type { Backend } from './types'

export * from './types'
export { TAROLOGO_DEMO } from './local'

/**
 * Escolhe o backend pelas variáveis de ambiente. Sem as chaves do Firebase o
 * app roda inteiro no modo local — a sala, os papéis e o tempo real entre abas
 * funcionam igual, só não há conta de verdade. Basta preencher o `.env` para
 * trocar, sem tocar em nenhuma tela.
 */
const env = import.meta.env
const temFirebase = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID)

let instancia: Backend | null = null

export function backend(): Backend {
  if (instancia) return instancia
  if (temFirebase) {
    // Import dinâmico: sem as chaves, o SDK do Firebase nem entra no bundle.
    throw new Error('backend(): use `carregarBackend()` quando o Firebase estiver configurado')
  }
  instancia = new LocalBackend()
  return instancia
}

/** Resolve o backend, carregando o Firebase sob demanda quando configurado. */
export async function carregarBackend(): Promise<Backend> {
  if (instancia) return instancia
  if (temFirebase) {
    const { FirebaseBackend } = await import('./firebase')
    instancia = new FirebaseBackend({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  } else {
    instancia = new LocalBackend()
  }
  return instancia
}
