const CANAL = 'tarot.temas'

/**
 * Aviso entre abas de que o acervo de temas mudou. UMA mensagem, sem payload:
 * quem ouve recarrega o que estava mostrando.
 *
 * Canal próprio, separado do `tarot.sync` do LocalBackend, porque as duas
 * coisas têm ritmos diferentes — a mesa muda a cada carta virada, o acervo só
 * quando alguém cria ou apaga um tema. Um `storage` listener não serve aqui de
 * fallback: não há nada em localStorage para disparar o evento. O fallback é o
 * próprio recarregar ao montar a tela.
 */

const canal = (() => {
  try {
    return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL) : null
  } catch {
    // Origem opaca (iframe sem allow-same-origin): segue sem sincronia.
    return null
  }
})()

const ouvintes = new Set<() => void>()
const ouvintesApagado = new Set<(id: string) => void>()

canal?.addEventListener('message', (e) => {
  const apagado = typeof e.data === 'object' && e.data?.apagado
  if (typeof apagado === 'string') ouvintesApagado.forEach((f) => f(apagado))
  ouvintes.forEach((f) => f())
})

/** O acervo mudou: avisa as outras abas E os ouvintes desta. */
export function avisarTemas(apagado?: string) {
  try {
    canal?.postMessage(apagado ? { apagado } : 1)
  } catch {
    /* canal fechado: os ouvintes locais ainda valem */
  }
  if (apagado) ouvintesApagado.forEach((f) => f(apagado))
  ouvintes.forEach((f) => f())
}

/**
 * Um tema foi apagado — aqui ou em outra aba.
 *
 * Existe para o registro de texturas poder soltar os bytes daquele tema sem
 * que a TELA precise conhecê-lo: `texturas.ts` importa o three inteiro, e
 * fazer a grade do acervo chamá-lo direto arrastava meio megabyte de motor 3D
 * para uma página que só mostra imagens.
 */
export function ouvirTemaApagado(cb: (id: string) => void): () => void {
  ouvintesApagado.add(cb)
  return () => {
    ouvintesApagado.delete(cb)
  }
}

export function ouvirTemas(cb: () => void): () => void {
  ouvintes.add(cb)
  return () => {
    ouvintes.delete(cb)
  }
}
