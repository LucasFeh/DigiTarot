import { useCallback, useEffect, useRef, useState } from 'react'
import { PERFIL_VAZIO, type Perfil, type Usuario } from './backend'
import { useAuth } from './useAuth'

export type { Perfil }

/**
 * O perfil de quem está logado, já reagindo a mudanças — inclusive as feitas em
 * outra aba ou em outro aparelho.
 *
 * O armazenamento agora é do backend: no modo local continua sendo o
 * `localStorage` do navegador, e no Firebase é o documento `perfis/{uid}`, que
 * segue a pessoa para qualquer lugar de onde ela entrar. Nenhuma tela precisou
 * saber da diferença — é a mesma razão de o backend ser uma interface.
 */
export function usePerfil(usuario: Usuario | null) {
  const { backend } = useAuth()
  const uid = usuario?.uid ?? null
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VAZIO)
  /**
   * Já veio a primeira leitura? Enquanto isto é falso, `perfil` é o VAZIO —
   * indistinguível de um perfil de verdade sem nada preenchido. Quem só mostra
   * campos de texto pode ignorar; quem toma decisão a partir de um valor
   * gravado (a sala escolhe o nível de detalhe por aqui) precisa saber a
   * diferença, senão decide com o padrão e se corrige na frente da pessoa.
   */
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    if (!backend || !uid) {
      setPerfil(PERFIL_VAZIO)
      setPronto(true)
      return
    }
    setPronto(false)
    return backend.observarPerfil(uid, (p) => {
      setPerfil(p)
      setPronto(true)
    })
  }, [backend, uid])

  const salvar = useCallback(
    (patch: Partial<Perfil>) => {
      if (!backend || !uid) return
      // Otimista: o campo de texto não pode esperar a ida ao servidor a cada
      // tecla. O `observarPerfil` confirma (ou corrige) logo em seguida.
      setPerfil((p) => ({ ...p, ...patch }))
      void backend.salvarPerfil(uid, patch)
    },
    [backend, uid],
  )

  /**
   * Quem entra pelo Google começa com a foto do Google.
   *
   * Ela é COPIADA para o perfil, e não apenas exibida a partir da conta: o
   * tarólogo precisa ver o rosto de quem agendou, e o que ele lê é o documento
   * `perfis/{uid}` — a foto da conta alheia não está ao alcance dele. Sem esta
   * cópia, a agenda mostraria iniciais para todo mundo enquanto a própria
   * pessoa via o próprio rosto no menu, o que não faz sentido nenhum.
   *
   * Acontece uma vez só. Depois que existe `perfil.foto`, a condição não é mais
   * verdadeira, e trocar a foto aqui nunca mais é desfeito pelo Google.
   */
  const semeada = useRef<string | null>(null)
  useEffect(() => {
    if (!backend || !uid || !usuario?.foto) return
    if (perfil.foto || semeada.current === uid) return
    semeada.current = uid
    void backend.salvarPerfil(uid, { foto: usuario.foto })
  }, [backend, uid, usuario?.foto, perfil.foto])

  // O nome do perfil tem prioridade sobre o da conta: é o que a pessoa escolheu
  // ser chamada aqui.
  const nomeExibido = perfil.nome.trim() || usuario?.nome || 'Visitante'

  return { perfil, pronto, salvar, nomeExibido }
}
