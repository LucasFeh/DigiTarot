import { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!backend || !uid) {
      setPerfil(PERFIL_VAZIO)
      return
    }
    return backend.observarPerfil(uid, setPerfil)
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

  // O nome do perfil tem prioridade sobre o da conta: é o que a pessoa escolheu
  // ser chamada aqui.
  const nomeExibido = perfil.nome.trim() || usuario?.nome || 'Visitante'

  return { perfil, salvar, nomeExibido }
}
