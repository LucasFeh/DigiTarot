import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../useAuth'
import { ouvirTemas } from './canal'
import { repoTemas } from './index'
import type { Aba, Tema, TipoTema } from './tipos'

/**
 * As três abas do acervo. Sem paginação: é um navegador só, e 60 temas já é
 * mais do que qualquer pessoa vai criar à mão.
 */
export function useCatalogo(tipo: TipoTema, aba: Aba) {
  const { usuario } = useAuth()
  const uid = usuario?.uid ?? null
  const [temas, setTemas] = useState<Tema[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const recarregar = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    repoTemas()
      .listar({ tipo, aba, uid })
      .then((t) => {
        if (!vivo) return
        setTemas(t)
        setErro(null)
      })
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : 'Não deu para abrir o acervo.'))
      .finally(() => vivo && setCarregando(false))
    return () => {
      vivo = false
    }
  }, [tipo, aba, uid, tick])

  // Outra aba criou ou apagou um tema: recarrega.
  useEffect(() => ouvirTemas(recarregar), [recarregar])

  return { temas, carregando, erro, recarregar }
}

export function useFavoritos() {
  const { usuario } = useAuth()
  const uid = usuario?.uid ?? null
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (!uid) {
      setIds(new Set())
      return
    }
    let vivo = true
    repoTemas()
      .favoritos(uid)
      .then((s) => vivo && setIds(s))
      .catch(() => vivo && setIds(new Set()))
    return () => {
      vivo = false
    }
  }, [uid])

  const alternar = useCallback(
    (temaId: string) => {
      if (!uid) return
      const on = !ids.has(temaId)
      // Otimista: a grade responde no clique, e o IndexedDB alcança depois.
      setIds((s) => {
        const n = new Set(s)
        if (on) n.add(temaId)
        else n.delete(temaId)
        return n
      })
      void repoTemas().favoritar(uid, temaId, on)
    },
    [uid, ids],
  )

  return { ids, alternar, podeFavoritar: Boolean(uid) }
}

/**
 * Object URL da miniatura, alugado com revogação adiada.
 *
 * A revogação adiada não é luxo: esta SPA roteia por hash e NUNCA descarrega o
 * documento, então ir e voltar entre as abas do acervo revogaria e recriaria a
 * mesma URL sem parar — a grade pisca e a memória sobe.
 */
const urls = new Map<string, { url: string; usos: number; ocioso: number }>()
const CARENCIA = 15000
const TETO = 120

function alugarUrl(temaId: string, blob: Blob): string {
  const e = urls.get(temaId)
  if (e) {
    e.usos++
    e.ocioso = 0
    return e.url
  }
  const url = URL.createObjectURL(blob)
  urls.set(temaId, { url, usos: 1, ocioso: 0 })
  return url
}

function devolverUrl(temaId: string) {
  const e = urls.get(temaId)
  if (!e) return
  e.usos--
  if (e.usos <= 0) {
    e.usos = 0
    e.ocioso = Date.now()
  }
  // Poda: o que passou da carência, e o excedente do teto.
  const agora = Date.now()
  for (const [id, x] of [...urls.entries()]) {
    const velho = x.usos === 0 && x.ocioso > 0 && agora - x.ocioso > CARENCIA
    if (velho) {
      URL.revokeObjectURL(x.url)
      urls.delete(id)
    }
  }
  if (urls.size > TETO) {
    const sobra = [...urls.entries()]
      .filter(([, x]) => x.usos === 0)
      .sort((a, b) => a[1].ocioso - b[1].ocioso)
      .slice(0, urls.size - TETO)
    for (const [id, x] of sobra) {
      URL.revokeObjectURL(x.url)
      urls.delete(id)
    }
  }
}

export function useMiniatura(tema: Tema): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const id = tema.id

  useEffect(() => {
    let vivo = true
    let alugado = false
    repoTemas()
      .imagem(id, 'mini')
      .then((b) => {
        if (!vivo || !b) return
        alugado = true
        setUrl(alugarUrl(id, b))
      })
      .catch(() => {})
    return () => {
      vivo = false
      if (alugado) devolverUrl(id)
    }
  }, [id])

  return url
}
