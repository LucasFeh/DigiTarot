import { useEffect, useState } from 'react'

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

  useEffect(() => {
    /**
     * O scroll é decidido pelo hash BRUTO, não pelo caminho derivado. Tanto
     * `#planos` quanto `#/` resolvem para o caminho '/', então um efeito que
     * dependesse de `rota.caminho` não dispararia ao voltar da âncora para a
     * home — e o navegador também não rola sozinho, porque o fragmento '/' não
     * casa com nenhum elemento. O link "Home" parecia morto.
     *
     * Só rola em navegação de rota (`#/algo`); uma âncora como `#planos` fica
     * a cargo do próprio navegador. E só no `hashchange`, nunca na primeira
     * renderização, para não estragar um link direto para `#planos`.
     */
    const onChange = () => {
      const h = window.location.hash
      setRota(readRoute())
      if (h === '' || h === '#' || h.startsWith('#/')) window.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return rota
}
