const CHAVE = 'digitarot.cadastroPorLink'

export type CadastroPendente = { nome: string; email: string }

export function guardarCadastroPendente(cadastro: CadastroPendente) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cadastro))
  } catch {
    // O link continua utilizável: a pessoa informa o e-mail no retorno.
  }
}

export function lerCadastroPendente(): CadastroPendente | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    if (!valor) return null
    const cadastro: unknown = JSON.parse(valor)
    if (!cadastro || typeof cadastro !== 'object') return null
    const { nome, email } = cadastro as Record<string, unknown>
    return typeof nome === 'string' && typeof email === 'string' ? { nome, email } : null
  } catch {
    return null
  }
}

export function limparCadastroPendente() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // Armazenamento bloqueado.
  }
}

export function marcarSemSenha(uid: string) {
  try {
    localStorage.setItem(`digitarot.semSenha.${uid}`, '1')
  } catch {
    // Marcador somente de apresentação; o Firebase segue como fonte da conta.
  }
}

export function temSenhaPendente(uid: string): boolean {
  try {
    return localStorage.getItem(`digitarot.semSenha.${uid}`) === '1'
  } catch {
    return false
  }
}

export function limparSenhaPendente(uid: string) {
  try {
    localStorage.removeItem(`digitarot.semSenha.${uid}`)
  } catch {
    // Armazenamento bloqueado.
  }
}

/** O Firebase acrescenta o código na query; a rota por hash permanece intacta. */
export function haLinkDeEmailNaUrl(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('mode') === 'signIn' && Boolean(params.get('oobCode'))
}
