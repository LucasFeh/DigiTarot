import { useEffect, useRef, useState, type RefObject } from 'react'
import { CARDS, CARD_BY_ID } from '../../data/cards'
import { RIDER_WAITE } from '../../lib/temas/embutidos'
import { repoTemas } from '../../lib/temas'
import type { TemaBaralho } from '../../lib/temas/tipos'
import type { CartaReconhecida, GuiaCamera } from '../../lib/posicaoCartaCamera'

type Referencia = { id: string; url?: string; blob?: Blob }
type Deteccao = CartaReconhecida & { pontos: number }
type Resposta =
  | { tipo: 'pronto' | 'progresso'; carregadas: number; total: number }
  | { tipo: 'resultado'; deteccoes: Deteccao[] }
  | { tipo: 'erro'; mensagem: string }

async function referenciasDoBaralho(tema: TemaBaralho | null): Promise<Referencia[]> {
  const escolhido = tema ?? RIDER_WAITE
  return Promise.all(CARDS.map(async (carta) => {
    if (escolhido.cartas.includes(carta.id)) {
      if (escolhido.base) return { id: carta.id, url: `${escolhido.base}/${carta.id}.webp` }
      const blob = await repoTemas().imagem(escolhido.id, carta.id).catch(() => null)
      if (blob) return { id: carta.id, blob }
    }
    return { id: carta.id, url: `${RIDER_WAITE.base}/${carta.id}.webp` }
  }))
}

/** A câmera conectada é analisada continuamente neste aparelho. */
export default function ReconhecimentoCamera({ videoRef, temaBaralho, onDeteccao, guias, spreadId }: {
  videoRef: RefObject<HTMLVideoElement | null>
  temaBaralho: TemaBaralho | null
  onDeteccao: (carta: CartaReconhecida) => boolean
  guias: GuiaCamera[]
  spreadId: string
}) {
  const [estado, setEstado] = useState('Preparando reconhecimento automático…')
  const aoDetectar = useRef(onDeteccao)
  const guiasAtuais = useRef(guias)
  const enviadas = useRef(new Set<string>())
  useEffect(() => { aoDetectar.current = onDeteccao }, [onDeteccao])
  useEffect(() => { guiasAtuais.current = guias }, [guias])
  useEffect(() => { enviadas.current.clear() }, [spreadId, temaBaralho])

  useEffect(() => {
    let cancelado = false
    let intervalo: ReturnType<typeof setInterval> | undefined
    let trabalhador: Worker | undefined
    let ocupado = false
    const estaveis = new Map<string, { x: number; y: number; invertida: boolean; vezes: number }>()
    const canvas = document.createElement('canvas')
    const contexto = canvas.getContext('2d', { willReadFrequently: true })

    const capturar = () => {
      const video = videoRef.current
      if (!trabalhador || ocupado || !contexto || !video || video.readyState < 2 || !video.videoWidth) return
      const largura = Math.min(640, video.videoWidth)
      const altura = Math.round(largura * video.videoHeight / video.videoWidth)
      if (!altura) return
      canvas.width = largura
      canvas.height = altura
      contexto.drawImage(video, 0, 0, largura, altura)
      if (guiasAtuais.current.length) {
        contexto.save()
        contexto.globalCompositeOperation = 'destination-in'
        contexto.fillStyle = '#fff'
        contexto.beginPath()
        for (const guia of guiasAtuais.current) {
          const margemX = 0.02
          const margemY = 0.025
          contexto.rect(
            (guia.x - guia.largura / 2 - margemX) * largura,
            (guia.y - guia.altura / 2 - margemY) * altura,
            (guia.largura + margemX * 2) * largura,
            (guia.altura + margemY * 2) * altura,
          )
        }
        contexto.fill()
        contexto.restore()
      }
      const quadro = contexto.getImageData(0, 0, largura, altura)
      ocupado = true
      trabalhador.postMessage({ tipo: 'quadro', largura, altura, pixels: quadro.data.buffer }, [quadro.data.buffer])
    }

    const iniciar = async () => {
      if (!contexto || !window.Worker) {
        setEstado('Este navegador não permite analisar a câmera localmente.')
        return
      }
      setEstado('Preparando imagens das cartas…')
      try {
        const referencias = await referenciasDoBaralho(temaBaralho)
        if (cancelado) return
        trabalhador = new Worker(new URL('../../workers/reconhecerCartas.worker.ts', import.meta.url), { type: 'module' })
        trabalhador.onerror = () => {
          if (cancelado) return
          if (intervalo) clearInterval(intervalo)
          setEstado('Não foi possível reconhecer as cartas. Reconecte a câmera para tentar novamente.')
        }
        trabalhador.onmessage = (evento: MessageEvent<Resposta>) => {
          if (cancelado) return
          const mensagem = evento.data
          if (mensagem.tipo === 'progresso') {
            setEstado(`Preparando baralho: ${mensagem.carregadas}/${mensagem.total}`)
          } else if (mensagem.tipo === 'pronto') {
            if (mensagem.carregadas === 0) {
              setEstado('Nenhuma arte do baralho pôde ser lida. Confira as imagens selecionadas.')
              return
            }
            setEstado(`Pronto: ${mensagem.carregadas} cartas. Mostre a frente das cartas à câmera.`)
            capturar()
            intervalo = setInterval(capturar, 1400)
          } else if (mensagem.tipo === 'resultado') {
            ocupado = false
            const vistos = new Set(mensagem.deteccoes.map((d) => d.cardId))
            for (const [id] of estaveis) if (!vistos.has(id)) estaveis.delete(id)
            for (const deteccao of mensagem.deteccoes) {
              if (enviadas.current.has(deteccao.cardId)) continue
              const anterior = estaveis.get(deteccao.cardId)
              const consistente = anterior && anterior.invertida === deteccao.invertida
                && Math.hypot(anterior.x - deteccao.x, anterior.y - deteccao.y) < 0.09
              const vezes = consistente ? anterior.vezes + 1 : 1
              estaveis.set(deteccao.cardId, { x: deteccao.x, y: deteccao.y, invertida: deteccao.invertida, vezes })
              if (vezes < 2) continue
              const video = videoRef.current
              const proporcaoVideo = video?.videoHeight ? video.videoWidth / video.videoHeight : undefined
              if (aoDetectar.current({ ...deteccao, proporcaoVideo })) {
                enviadas.current.add(deteccao.cardId)
                const nome = CARD_BY_ID.get(deteccao.cardId)?.nome ?? 'Carta'
                setEstado(`${nome}${deteccao.invertida ? ' invertida' : ''} colocada na mesa.`)
              }
            }
          } else {
            ocupado = false
            setEstado('A análise falhou. Reconecte a câmera para tentar novamente.')
          }
        }
        trabalhador.postMessage({ tipo: 'iniciar', referencias })
      } catch {
        if (!cancelado) setEstado('Não foi possível preparar as imagens deste baralho.')
      }
    }
    void iniciar()
    return () => {
      cancelado = true
      if (intervalo) clearInterval(intervalo)
      trabalhador?.terminate()
    }
  }, [temaBaralho, videoRef])

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-20 flex max-w-[55%] flex-col items-end gap-1.5">
      <p role="status" className="max-w-56 rounded-lg border border-gold/40 bg-black/85 px-2 py-1 text-right text-[11px] leading-snug text-gold">✦ Reconhecimento automático · {estado}</p>
      <p className="max-w-56 rounded-lg bg-black/85 px-2 py-1 text-right text-[11px] leading-snug text-mist">{guias.length ? 'As guias definem o lugar; a análise lê qual carta entrou em cada marcação.' : 'Use o mesmo baralho das imagens selecionadas e a câmera apontada de cima.'}</p>
    </div>
  )
}
