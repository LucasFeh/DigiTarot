import { useEffect, useRef, useState } from 'react'

/**
 * Roteador mínimo por hash, sem dependência. A convenção é a barra: `#/sobre` é
 * uma rota, `#planos` continua sendo âncora de rolagem dentro da home.
 */
export function readRoute(): string {
  if (typeof window === 'undefined') return '/'
  const h = window.location.hash
  return h.startsWith('#/') ? h.slice(1) : '/'
}

export function useHashRoute(): string {
  const [route, setRoute] = useState(readRoute)
  const first = useRef(true)

  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // Troca de rota volta ao topo — mas não na primeira renderização, senão um
  // link direto para #planos perderia a âncora.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  return route
}
