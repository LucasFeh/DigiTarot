import { RepoLocal } from './repoLocal'
import type { RepositorioTemas } from './tipos'

export * from './tipos'
export { ErroDeCota } from './db'
export { avisarTemas, ouvirTemas } from './canal'

/**
 * Mesmo padrão de `src/lib/backend/index.ts`: um singleton e um import
 * dinâmico reservado para quando houver Firebase. Enquanto não houver, o
 * acervo inteiro mora no IndexedDB deste navegador.
 *
 * Só a camada de temas importa este módulo — a home não o toca, e por isso o
 * IndexedDB nunca é aberto por quem só veio ver o site.
 */
let instancia: RepositorioTemas | null = null

export function repoTemas(): RepositorioTemas {
  if (!instancia) instancia = new RepoLocal()
  return instancia
}

/** Ponto de entrada assíncrono, para o dia em que o repositório do Firestore
 *  entrar por import dinâmico sem tocar em tela nenhuma. */
export async function carregarRepoTemas(): Promise<RepositorioTemas> {
  return repoTemas()
}
