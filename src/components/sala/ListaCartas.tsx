import { useArteCarta } from '../../lib/temas/useArte'
import type { TarotCard } from '../../data/cards'
import type { TemaBaralho } from '../../lib/temas/tipos'

/**
 * Uma linha da lista: a miniatura da carta no baralho ESCOLHADO, e o nome ao
 * lado. É daqui que a carta é puxada para a mesa.
 */
function Linha({
  carta,
  tema,
  jaNaMesa,
  onPegar,
}: {
  carta: TarotCard
  tema: TemaBaralho | null
  jaNaMesa: boolean
  onPegar: (cardId: string, e: React.PointerEvent) => void
}) {
  const arte = useArteCarta(tema, carta.id)

  return (
    <button
      type="button"
      disabled={jaNaMesa}
      // Só `pointerdown`: quem decide se aquilo virou um arrasto ou um clique é
      // a página, comparando a distância percorrida. Um `onClick` aqui dispararia
      // TAMBÉM no fim de um arrasto, pondo a carta duas vezes.
      onPointerDown={(e) => !jaNaMesa && onPegar(carta.id, e)}
      title={jaNaMesa ? `${carta.nome} — já está na mesa` : `${carta.nome} — arraste até um lugar da mesa`}
      className="flex w-full items-center gap-3 rounded-lg border border-white/12 bg-white/5 p-2 text-left transition enabled:hover:border-gold/50 enabled:hover:bg-white/10 disabled:opacity-35"
    >
      <img
        src={arte}
        alt=""
        // `lazy` importa: a lista tem 78 linhas e, num tema do usuário, cada
        // imagem é um blob do IndexedDB. Sem isso, abrir a aba carrega o
        // baralho inteiro de uma vez.
        loading="lazy"
        draggable={false}
        className="h-[62px] w-[37px] shrink-0 rounded border border-white/15 object-cover"
      />
      <span className="min-w-0 flex-1 text-[13px] leading-tight text-star">{carta.nome}</span>
      {jaNaMesa && <span className="shrink-0 pr-1 text-[12px] text-gold/80">na mesa</span>}
    </button>
  )
}

export default function ListaCartas({
  cartas,
  tema,
  usadas,
  onPegar,
}: {
  cartas: TarotCard[]
  tema: TemaBaralho | null
  usadas: ReadonlySet<string>
  onPegar: (cardId: string, e: React.PointerEvent) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {cartas.map((c) => (
        <Linha key={c.id} carta={c} tema={tema} jaNaMesa={usadas.has(c.id)} onPegar={onPegar} />
      ))}
    </div>
  )
}
