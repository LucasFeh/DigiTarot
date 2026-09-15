import { CARD_BY_ID } from '../../data/cards'
import { useArteCarta } from '../../lib/temas/useArte'
import type { TemaBaralho } from '../../lib/temas/tipos'

/**
 * A carta que saiu da lista e está viajando na ponta do ponteiro.
 *
 * `pointer-events: none` é obrigatório: sem isso ela fica embaixo do cursor e
 * come todos os eventos da cena, então nenhum slot seria detectado. A posição
 * vem em coordenadas de cliente e o elemento é `fixed`, o que o mantém no
 * lugar certo mesmo com a página rolada.
 */
export default function CartaFlutuante({
  cardId,
  tema,
  x,
  y,
  sobreAlvo,
}: {
  cardId: string
  tema: TemaBaralho | null
  x: number
  y: number
  /** Em cima de um slot válido: a carta cresce e acende, dizendo que pode soltar. */
  sobreAlvo: boolean
}) {
  const arte = useArteCarta(tema, cardId)
  const nome = CARD_BY_ID.get(cardId)?.nome ?? ''

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[95] transition-[transform,filter] duration-150"
      style={{
        left: x,
        top: y,
        // -50% centraliza no ponteiro; a inclinação some ao chegar no alvo,
        // como uma carta se assentando na mesa.
        transform: `translate(-50%, -50%) rotate(${sobreAlvo ? 0 : -7}deg) scale(${sobreAlvo ? 1.12 : 1})`,
        filter: sobreAlvo
          ? 'drop-shadow(0 18px 34px #000c) drop-shadow(0 0 22px var(--color-gold))'
          : 'drop-shadow(0 22px 30px #000b) drop-shadow(0 0 18px var(--color-violet))',
      }}
    >
      <img
        src={arte}
        alt={nome}
        className="h-[190px] w-[112px] rounded-lg border object-cover"
        style={{ borderColor: sobreAlvo ? 'var(--color-gold)' : '#ffffff35' }}
        draggable={false}
      />
    </div>
  )
}
