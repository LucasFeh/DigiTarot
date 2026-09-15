const CHAVE = 'tarot.espelho.'

/**
 * O interruptor "ver tema do cliente", por sala.
 *
 * Mora em `sessionStorage`, e não na `Sessao`, por três motivos:
 *
 * 1. É preferência de QUEM OLHA, não estado da mesa. Se fosse para a sessão,
 *    marcar a caixa viraria um broadcast e a mesa do cliente piscaria — ele
 *    veria a própria tela reagir a uma decisão que não é dele.
 * 2. Sobrevive ao F5 do tarólogo no meio de uma leitura.
 * 3. No modo local o "cliente" é a OUTRA ABA do mesmo navegador. Em
 *    `localStorage` a chave apareceria para ele também.
 */
export function lerEspelho(sessaoId: string): boolean {
  try {
    return sessionStorage.getItem(CHAVE + sessaoId) === '1'
  } catch {
    // Dados de site bloqueados: o recurso simplesmente fica desligado.
    return false
  }
}

export function gravarEspelho(sessaoId: string, v: boolean) {
  try {
    if (v) sessionStorage.setItem(CHAVE + sessaoId, '1')
    else sessionStorage.removeItem(CHAVE + sessaoId)
  } catch {
    /* idem */
  }
}
