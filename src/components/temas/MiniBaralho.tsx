import { CARDS } from '../../data/cards'
import { useArteCarta } from '../../lib/temas/useArte'
import type { TemaBaralho } from '../../lib/temas/tipos'

/** Quais cartas ficam à mostra na pilha, de trás para a frente. */
const CAMADAS = [
  { dx: -10, dy: 6, giro: -8, escala: 0.94 },
  { dx: -5, dy: 3, giro: -4, escala: 0.97 },
  { dx: 0, dy: 0, giro: 0, escala: 1 },
]

function Camada({
  cardId,
  tema,
  estilo,
  z,
}: {
  cardId: string
  tema: TemaBaralho | null
  estilo: (typeof CAMADAS)[number]
  z: number
}) {
  const arte = useArteCarta(tema, cardId)
  return (
    <img
      src={arte}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full rounded-lg border border-white/20 object-cover"
      style={{
        zIndex: z,
        transform: `translate(${estilo.dx}px, ${estilo.dy}px) rotate(${estilo.giro}deg) scale(${estilo.escala})`,
        boxShadow: '0 12px 28px -10px #000, 0 0 18px -8px var(--color-violet)',
      }}
    />
  )
}

/**
 * O tema mostrado como um baralho de verdade: três cartas empilhadas e
 * levemente abertas em leque, em vez de uma grade de miniaturas.
 *
 * É a forma de olhar para um baralho e reconhecê-lo de relance — a grade serve
 * para procurar, a pilha serve para identificar.
 */
export default function MiniBaralho({
  tema,
  largura = 88,
  onClick,
  titulo,
}: {
  tema: TemaBaralho | null
  largura?: number
  onClick?: () => void
  titulo?: string
}) {
  // As três primeiras que o tema cobre, na ordem canônica. Um tema parcial
  // (só os arcanos maiores) continua mostrando as dele.
  const cobertas = tema ? CARDS.filter((c) => tema.cartas.includes(c.id)) : CARDS
  const escolhidas = [cobertas[2], cobertas[1], cobertas[0]].filter(Boolean).slice(0, 3)

  const Caixa = onClick ? 'button' : 'div'

  return (
    <Caixa
      {...(onClick ? { type: 'button' as const, onClick, title: titulo } : {})}
      className="relative block shrink-0 transition hover:scale-[1.04]"
      style={{ width: largura, height: largura * 1.7 }}
    >
      {escolhidas.map((c, i) => (
        <Camada key={c.id} cardId={c.id} tema={tema} estilo={CAMADAS[i] ?? CAMADAS[2]} z={i} />
      ))}
    </Caixa>
  )
}
