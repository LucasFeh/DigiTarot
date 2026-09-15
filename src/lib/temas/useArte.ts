import { useEffect, useState } from 'react'
import { panoEmbutidoIdDe } from './embutidos'
import { repoTemas } from './index'
import { svgFrente, svgPano } from './svgCarta'
import type { TemaBaralho, TemaPano } from './tipos'

/**
 * A arte de uma carta como URL de `<img>` — para as listas e miniaturas em
 * HTML, fora do 3D.
 *
 * Deliberadamente separado de `texturas.ts`: aquele é o registro de
 * `THREE.Texture` e importa o three inteiro. Um painel que mostra 78
 * miniaturas não deve arrastar meio megabyte de motor 3D para exibir imagem.
 *
 * Três origens, uma saída:
 *  - tema embutido → a URL estática direto (o navegador cacheia, sem blob);
 *  - tema do usuário → blob do IndexedDB, alugado como object URL;
 *  - sem tema → o SVG desenhado, que já é um data URI.
 */

const alugadas = new Map<string, { url: string; usos: number; ocioso: number }>()
const CARENCIA = 20000
const TETO = 160

function alugar(chave: string, blob: Blob) {
  const e = alugadas.get(chave)
  if (e) {
    e.usos++
    e.ocioso = 0
    return e.url
  }
  const url = URL.createObjectURL(blob)
  alugadas.set(chave, { url, usos: 1, ocioso: 0 })
  return url
}

function devolver(chave: string) {
  const e = alugadas.get(chave)
  if (!e) return
  e.usos--
  if (e.usos <= 0) {
    e.usos = 0
    e.ocioso = Date.now()
  }
  // Poda preguiçosa, no mesmo momento em que algo é devolvido. A carência
  // existe porque trocar de naipe no painel desmonta e remonta a lista inteira
  // no mesmo quadro: sem ela, cada troca revogaria e recriaria 14 URLs.
  const agora = Date.now()
  for (const [k, x] of [...alugadas.entries()]) {
    if (x.usos === 0 && x.ocioso > 0 && agora - x.ocioso > CARENCIA) {
      URL.revokeObjectURL(x.url)
      alugadas.delete(k)
    }
  }
  if (alugadas.size > TETO) {
    const sobra = [...alugadas.entries()]
      .filter(([, x]) => x.usos === 0)
      .sort((a, b) => a[1].ocioso - b[1].ocioso)
      .slice(0, alugadas.size - TETO)
    for (const [k, x] of sobra) {
      URL.revokeObjectURL(x.url)
      alugadas.delete(k)
    }
  }
}

export function useArteCarta(tema: TemaBaralho | null, cardId: string): string {
  const cobre = Boolean(tema?.cartas.includes(cardId))
  const temaId = cobre ? tema!.id : null
  // Tema embutido: a URL é estática e não precisa de blob nenhum.
  const direta = cobre && tema!.base ? `${tema!.base}/${cardId}.webp` : null
  const [url, setUrl] = useState<string>(() => direta ?? svgFrente(cardId))

  useEffect(() => {
    if (direta) {
      setUrl(direta)
      return
    }
    if (!temaId) {
      setUrl(svgFrente(cardId))
      return
    }
    let vivo = true
    let chave: string | null = null
    repoTemas()
      .imagem(temaId, cardId)
      .then((b) => {
        if (!vivo || !b) return
        chave = `${temaId}|${cardId}`
        setUrl(alugar(chave, b))
      })
      .catch(() => {})
    return () => {
      vivo = false
      if (chave) devolver(chave)
    }
  }, [temaId, cardId, direta])

  return url
}

/**
 * A arte de um pano como URL de `<img>`/`background-image`. Mesma mecânica da
 * carta: URL direta quando é embutido de arquivo, blob quando vem do banco, e
 * o SVG desenhado quando não há tema.
 */
export function useArtePano(tema: TemaPano | null, panoEmbutidoId: string): string {
  // Pano do site: o data URI do SVG serve direto num `<img>` ou num
  // `background-image`, sem blob e sem object URL para administrar.
  const embutido = tema ? panoEmbutidoIdDe(tema.id) : null
  const temaId = embutido ? null : (tema?.id ?? null)
  const svgId = embutido ?? panoEmbutidoId
  const direta = !embutido && tema?.base ? `${tema.base}/fundo.webp` : null
  const [url, setUrl] = useState<string>(() => direta ?? svgPano(svgId))

  useEffect(() => {
    if (direta) {
      setUrl(direta)
      return
    }
    if (!temaId) {
      setUrl(svgPano(svgId))
      return
    }
    let vivo = true
    let chave: string | null = null
    repoTemas()
      .imagem(temaId, 'fundo')
      .then((b) => {
        if (!vivo || !b) return
        chave = `${temaId}|fundo`
        setUrl(alugar(chave, b))
      })
      .catch(() => {})
    return () => {
      vivo = false
      if (chave) devolver(chave)
    }
  }, [temaId, svgId, direta])

  return url
}
