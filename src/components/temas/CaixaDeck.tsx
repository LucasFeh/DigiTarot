import { useEffect, useState } from 'react'
import { useArteCarta } from '../../lib/temas/useArte'
import type { TemaBaralho } from '../../lib/temas/tipos'

/** Quantas cartas ficam montadas por vez. Uma janela pequena é o que impede
 *  uma grade de temas de carregar centenas de imagens. */
const JANELA = 4
/** Ritmo do folhear. Mais rápido que isto vira ruído. */
const PASSO_MS = 380

function Carta({
  cardId,
  tema,
  d,
}: {
  cardId: string
  tema: TemaBaralho | null
  /** Distância até a carta da frente: -1 já passou, 0 é a da frente. */
  d: number
}) {
  const arte = useArteCarta(tema, cardId)
  const passou = d < 0

  return (
    <img
      src={arte}
      alt=""
      draggable={false}
      loading="lazy"
      className="absolute inset-0 h-full w-full rounded-md border border-white/20 object-cover transition-[transform,opacity] duration-300 ease-out"
      style={{
        zIndex: 10 - d,
        // A que passou sai pelo lado, girando — é o gesto de folhear um maço.
        transform: passou
          ? 'translateX(82%) rotate(15deg) scale(0.98)'
          : `translate(${-d * 4}%, ${d * 3}%) scale(${1 - d * 0.045})`,
        opacity: passou ? 0 : 1 - d * 0.08,
        boxShadow: d === 0 ? '0 10px 22px -10px #000' : 'none',
      }}
    />
  )
}

/**
 * O tema como uma caixinha de baralho: um maço fechado que, ao passar o mouse,
 * vai folheando as cartas para o lado.
 *
 * Só a janela em volta da carta da frente fica montada — numa grade de temas,
 * montar os 78 de cada um significaria centenas de imagens vivas ao mesmo
 * tempo.
 */
export default function CaixaDeck({
  tema,
  largura = 62,
}: {
  tema: TemaBaralho | null
  largura?: number
}) {
  const [indice, setIndice] = useState(0)
  const [sobre, setSobre] = useState(false)

  const cartas = tema?.cartas ?? []
  const total = cartas.length

  useEffect(() => {
    if (!sobre || total < 2) return
    const id = setInterval(() => setIndice((i) => (i + 1) % total), PASSO_MS)
    return () => clearInterval(id)
  }, [sobre, total])

  // Sair volta ao começo: o maço fica sempre fechado na mesma carta, e a grade
  // não guarda um estado que ninguém pediu.
  useEffect(() => {
    if (!sobre) setIndice(0)
  }, [sobre])

  if (!total) return null

  // De -1 (a que está saindo) até a última da janela, sempre em volta.
  const visiveis = Array.from({ length: JANELA + 1 }, (_, k) => {
    const d = k - 1
    return { d, cardId: cartas[(indice + d + total) % total] }
  })

  return (
    <div
      className="relative shrink-0"
      style={{ width: largura, height: largura * 1.7 }}
      onPointerEnter={() => setSobre(true)}
      onPointerLeave={() => setSobre(false)}
    >
      {visiveis.map(({ d, cardId }) => (
        // A chave é a POSIÇÃO, não a carta: assim o React reaproveita o mesmo
        // elemento e a transição de CSS corre. Com a carta na chave, cada
        // avanço remontaria tudo e não haveria animação nenhuma.
        <Carta key={d} cardId={cardId} tema={tema} d={d} />
      ))}
    </div>
  )
}
