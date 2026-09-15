import { useCallback, useEffect, useState } from 'react'
import type { EscolhaVisual, Usuario } from './backend'

const CHAVE = 'tarot.perfil.'
const EVENTO = 'tarot:perfil'

/**
 * O perfil da pessoa: o que ela edita sobre si, mais o baralho e o pano com
 * que ela entra em toda sala.
 *
 * Mora em `localStorage` por uid, e não na `Sessao`: perfil é da PESSOA e
 * atravessa salas, enquanto a sessão é de uma leitura só. Quando o Firebase
 * entrar, isto vira um documento em `perfis/{uid}` — a forma já é a de um
 * documento, justamente para a troca não tocar em tela nenhuma.
 */
export type Perfil = {
  nome: string
  /** Telefone, WhatsApp, o que a pessoa quiser deixar. Livre de propósito. */
  contato: string
  /** @ do Instagram, sem o arroba. */
  instagram: string
  /** URL da foto. O avatar do Header já sabe cair na inicial do nome. */
  foto: string
  /**
   * O tema com que a pessoa entra em toda sala. A escolha feita DENTRO de uma
   * sala vale só para aquela leitura e não mexe aqui — é o que separa
   * "experimentar um baralho" de "mudar o meu padrão".
   */
  padrao: EscolhaVisual
}

const VAZIO: Perfil = {
  nome: '',
  contato: '',
  instagram: '',
  foto: '',
  padrao: { baralhoId: null, panoId: null },
}

export function lerPerfil(uid: string): Perfil {
  try {
    const cru = localStorage.getItem(CHAVE + uid)
    if (!cru) return VAZIO
    const p = JSON.parse(cru) as Partial<Perfil>
    // Espalhado sobre VAZIO: perfil gravado por uma versão anterior pode não
    // ter todos os campos, e `undefined` num input faz o React reclamar de
    // campo não controlado.
    return { ...VAZIO, ...p, padrao: { ...VAZIO.padrao, ...(p.padrao ?? {}) } }
  } catch {
    // Dados de site bloqueados: o app roda, só não lembra.
    return VAZIO
  }
}

export function gravarPerfil(uid: string, patch: Partial<Perfil>) {
  const novo = { ...lerPerfil(uid), ...patch }
  try {
    localStorage.setItem(CHAVE + uid, JSON.stringify(novo))
  } catch {
    /* cota ou modo privado: segue sem persistir */
  }
  // Evento próprio: `storage` só dispara em OUTRAS abas, e a tela que acabou
  // de gravar também precisa se redesenhar.
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: uid }))
  return novo
}

/**
 * O perfil de quem está logado, já reagindo a mudanças — inclusive as feitas
 * em outra aba, que é o caso normal no modo local (tarólogo numa, cliente
 * noutra).
 */
export function usePerfil(usuario: Usuario | null) {
  const uid = usuario?.uid ?? null
  const [perfil, setPerfil] = useState<Perfil>(VAZIO)

  useEffect(() => {
    if (!uid) {
      setPerfil(VAZIO)
      return
    }
    const recarregar = () => setPerfil(lerPerfil(uid))
    recarregar()
    const outraAba = (e: StorageEvent) => {
      if (e.key === CHAVE + uid) recarregar()
    }
    window.addEventListener(EVENTO, recarregar)
    window.addEventListener('storage', outraAba)
    return () => {
      window.removeEventListener(EVENTO, recarregar)
      window.removeEventListener('storage', outraAba)
    }
  }, [uid])

  const salvar = useCallback(
    (patch: Partial<Perfil>) => {
      if (!uid) return
      setPerfil(gravarPerfil(uid, patch))
    },
    [uid],
  )

  // O nome do perfil tem prioridade sobre o da conta: é o que a pessoa
  // escolheu ser chamada aqui.
  const nomeExibido = perfil.nome.trim() || usuario?.nome || 'Visitante'

  return { perfil, salvar, nomeExibido }
}
