import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { TAROLOGO_RODRIGO } from './backend/tarologo'
import type { TarologoPublico } from './backend'

export function useTarologos(): {
  tarologos: TarologoPublico[]
  carregando: boolean
  erro?: string
} {
  const { backend } = useAuth()
  const [lista, setLista] = useState<TarologoPublico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | undefined>()

  useEffect(() => {
    if (!backend) return
    return backend.observarTarologos(
      (novos) => {
        setLista(novos)
        setErro(undefined)
        setCarregando(false)
      },
      (mensagem) => {
        setErro(mensagem)
        setCarregando(false)
      },
    )
  }, [backend])

  // A vitrine já pode mostrar Rodrigo antes de ele inaugurar os documentos no
  // Firestore. As regras só aceitam reserva depois do seed persistido.
  const tarologos = lista.some((t) => t.uid === TAROLOGO_RODRIGO.uid)
    ? lista
    : [TAROLOGO_RODRIGO, ...lista]

  return { tarologos, carregando, erro }
}
