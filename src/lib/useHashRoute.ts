import { useEffect, useRef, useState } from 'react'

export type Rota = {
  /** Caminho sem a hash, ex.: `/tiragem/sala`. */
  caminho: string
  /** Segmentos do caminho, já separados. */
  partes: string[]
}

/**
 * Roteador por hash, sem dependência. A convenção é a barra: `#/sobre` é uma
 * rota, `#planos` continua sendo âncora de rolagem dentro da home.
 */
export function readRoute(): Rota {
  if (typeof window === 'undefined') return { caminho: '/', partes: [] }
  const h = window.location.hash
  const caminho = h.startsWith('#/') ? h.slice(1) : '/'
  return { caminho, partes: caminho.split('/').filter(Boolean) }
}

export function irPara(caminho: string) {
  window.location.hash = caminho === '/' ? '/' : `#${caminho}`.replace(/^##/, '#')
}

export function useHashRoute(): Rota {
  const [rota, setRota] = useState(readRoute)
  const primeira = useRef(true)

  useEffect(() => {
    const onChange = () => setRota(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // Troca de rota volta ao topo — mas não na primeira renderização, senão um
  // link direto para #planos perderia a âncora.
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [rota.caminho])

  return rota
}
