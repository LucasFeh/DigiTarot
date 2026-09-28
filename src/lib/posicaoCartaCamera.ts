import type { CartaNaMesa } from './backend'
import type { Spread } from '../data/spreads'

export type CartaReconhecida = { cardId: string; x: number; y: number; invertida: boolean }

/** Encaixa a posição vista de cima no lugar livre mais próximo do layout 3D. */
export function slotDaCamera(
  carta: CartaReconhecida,
  spread: Spread,
  ocupadas: CartaNaMesa[],
): number | null {
  if (ocupadas.some((item) => item.cardId === carta.cardId)) return null
  const livres = spread.slots.map((slot, indice) => ({ slot, indice }))
    .filter(({ indice }) => !ocupadas.some((item) => item.slot === indice))
  if (!livres.length) return null

  const limiteX = Math.max(0.8, ...spread.slots.map((slot) => Math.abs(slot.x) + 0.2))
  const limiteZ = Math.max(0.8, ...spread.slots.map((slot) => Math.abs(slot.z) + 0.2))
  const x = (carta.x - 0.5) * 2 * limiteX
  const z = (carta.y - 0.5) * 2 * limiteZ
  livres.sort((a, b) =>
    (a.slot.x - x) ** 2 + (a.slot.z - z) ** 2
    - (b.slot.x - x) ** 2 - (b.slot.z - z) ** 2,
  )
  return livres[0].indice
}
