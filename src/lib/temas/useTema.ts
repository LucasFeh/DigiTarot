import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { ouvirTemas } from './canal'
import { panoEmbutidoIdDe } from './embutidos'
import { repoTemas } from './index'
import { adquirirArte, adquirirSvg } from './texturas'
import { PREFIXO_TEMA } from './visibilidade'
import type { Tema, TemaBaralho, TemaCarregado, TemaPano, TipoTema } from './tipos'

/**
 * O adaptador entre "um id" e "um documento carregado".
 *
 * Roda FORA do `<Canvas>` de propósito: o react-three-fiber é outra raiz de
 * reconciliação, o contexto do host não a atravessa, e IO assíncrona dentro da
 * cena vira exatamente o tipo de bug que ninguém consegue depurar depois. A
 * página resolve o documento e passa pronto para a cena.
 */
export function useTema<T extends Tema = Tema>(ref: string | null, tipo: TipoTema): TemaCarregado<T> {
  // `tema:xyz` e `xyz` resolvem para o mesmo documento; um id de PANOS ('lua')
  // não é tema nenhum e sai como 'nenhum' — quem trata pano embutido é a cena.
  const id = ref?.startsWith(PREFIXO_TEMA) ? ref.slice(PREFIXO_TEMA.length) : tipo === 'baralho' ? ref : null

  // Nasce já em 'carregando' quando há id. Começar em 'nenhum' fazia a tela de
  // prévia pintar "Tema não encontrado" no primeiro quadro de TODO tema válido,
  // antes de o efeito sequer rodar.
  const [estado, setEstado] = useState<TemaCarregado<T>>(() => ({
    estado: id ? 'carregando' : 'nenhum',
    tema: null,
  }))
  const [tick, setTick] = useState(0)

  // O acervo mudou (aqui ou em outra aba): o tema pode ter sido apagado, e
  // então este documento precisa virar 'ausente' para a cena voltar à arte
  // desenhada em vez de segurar uma referência morta.
  useEffect(() => ouvirTemas(() => setTick((t) => t + 1)), [])

  useEffect(() => {
    if (!id) {
      setEstado({ estado: 'nenhum', tema: null })
      return
    }
    let vivo = true
    setEstado({ estado: 'carregando', tema: null })
    repoTemas()
      .obter(id)
      .then((t) => {
        if (!vivo) return
        // 'ausente' não é 'nenhum': o id existe na sessão mas este navegador
        // não tem o tema. A tela precisa saber a diferença para poder dizer
        // "tema indisponível neste dispositivo" em vez de fingir normalidade.
        if (!t || t.tipo !== tipo) setEstado({ estado: 'ausente', tema: null })
        else setEstado({ estado: 'pronto', tema: t as T })
      })
      .catch(() => vivo && setEstado({ estado: 'ausente', tema: null }))
    return () => {
      vivo = false
    }
  }, [id, tipo, tick])

  return estado
}

/**
 * Empresta uma textura pelo tempo de vida do componente.
 *
 * ADQUIRE DENTRO DO `useEffect`, nunca em `useMemo`: com `<StrictMode>` ligado
 * (e ele está, em `main.tsx`) o `useMemo` roda duas vezes e só um `soltar`
 * seria agendado — a contagem vazaria para sempre e o registro nunca liberaria
 * nada em desenvolvimento.
 */
function useEmprestimo(
  chave: string,
  carregar: () => Promise<{ tex: THREE.Texture; soltar: () => void } | null>,
) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  // A função de carregar muda de identidade a cada render, mas o que a
  // identifica é a `chave`. Guardá-la numa ref deixa o efeito depender só da
  // chave — sem lista de dependências dinâmica, que é a forma de escrever isto
  // que o linter (com razão) não consegue verificar.
  const fn = useRef(carregar)
  fn.current = carregar

  useEffect(() => {
    let vivo = true
    let soltar: (() => void) | null = null
    void fn
      .current()
      .then((e) => {
        // Desmontou antes de a textura chegar: devolve o empréstimo na hora,
        // senão a contagem fica presa em 1 para sempre.
        if (!vivo) {
          e?.soltar()
          return
        }
        soltar = e?.soltar ?? null
        setTex(e?.tex ?? null)
      })
      .catch(() => {
        if (vivo) setTex(null)
      })
    return () => {
      vivo = false
      soltar?.()
    }
  }, [chave])

  return tex
}

/** Frente de uma carta: a arte do tema, ou o SVG desenhado se ela faltar. */
export function useTexturaCarta(cardId: string, tema: TemaBaralho | null): THREE.Texture | null {
  const temNoTema = Boolean(tema?.cartas.includes(cardId))
  const temaId = temNoTema ? tema!.id : null
  return useEmprestimo(`c|${temaId ?? ''}|${cardId}`, () =>
    temaId
      ? adquirirArte(temaId, cardId).then((e) => e ?? adquirirSvg(`carta:${cardId}`))
      : adquirirSvg(`carta:${cardId}`),
  )
}

export function useTexturaVerso(tema: TemaBaralho | null): THREE.Texture | null {
  const temaId = tema?.temVerso ? tema.id : null
  return useEmprestimo(`v|${temaId ?? ''}`, () =>
    temaId ? adquirirArte(temaId, 'verso').then((e) => e ?? adquirirSvg('verso')) : adquirirSvg('verso'),
  )
}

export function useTexturaPano(panoEmbutidoId: string, tema: TemaPano | null): THREE.Texture | null {
  // Pano que vem do site é SVG: segue pelo TextureLoader, não pelo blob.
  const embutido = tema ? panoEmbutidoIdDe(tema.id) : null
  const temaId = embutido ? null : (tema?.id ?? null)
  const svgId = embutido ?? panoEmbutidoId
  return useEmprestimo(`p|${temaId ?? ''}|${svgId}`, () =>
    temaId
      ? adquirirArte(temaId, 'fundo').then((e) => e ?? adquirirSvg(`pano:${svgId}`))
      : adquirirSvg(`pano:${svgId}`),
  )
}
