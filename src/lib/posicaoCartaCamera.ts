import type { CartaNaMesa } from './backend'
import type { Spread } from '../data/spreads'

export type CartaReconhecida = { cardId: string; x: number; y: number; invertida: boolean }

export type GuiaCamera = {
  slot: number
  x: number
  y: number
  largura: number
  altura: number
  rotulo: string
}

/** Mesma escala usada para encaixar uma carta reconhecida no layout da mesa. */
export function guiasDaCamera(spread: Spread): GuiaCamera[] {
  const limiteX = Math.max(0.8, ...spread.slots.map((slot) => Math.abs(slot.x) + 0.2))
  const limiteZ = Math.max(0.8, ...spread.slots.map((slot) => Math.abs(slot.z) + 0.2))
  return spread.slots.map((slot, indice) => {
    const deLado = Math.abs(slot.rot ?? 0) % 180 === 90
    return {
      slot: indice,
      x: slot.x / (2 * limiteX) + 0.5,
      y: slot.z / (2 * limiteZ) + 0.5,
      largura: (deLado ? 0.72 : 0.42) / (2 * limiteX),
      altura: (deLado ? 0.42 : 0.72) / (2 * limiteZ),
      rotulo: slot.rotulo,
    }
  })
}

/** Encaixa a posição vista de cima no lugar livre mais próximo do layout 3D. */
export function slotDaCamera(
  carta: CartaReconhecida,
  spread: Spread,
  ocupadas: CartaNaMesa[],
  usarGuias = false,
): number | null {
  if (ocupadas.some((item) => item.cardId === carta.cardId)) return null
  const livres = spread.slots.map((slot, indice) => ({ slot, indice }))
    .filter(({ indice }) => !ocupadas.some((item) => item.slot === indice))
  if (!livres.length) return null

  if (usarGuias) {
    const guias = guiasDaCamera(spread)
    const candidatas = guias.filter((guia) => livres.some(({ indice }) => indice === guia.slot)
      && Math.abs(carta.x - guia.x) <= guia.largura / 2 + 0.055
      && Math.abs(carta.y - guia.y) <= guia.altura / 2 + 0.055)
    if (!candidatas.length) return null
    candidatas.sort((a, b) =>
      ((a.x - carta.x) / a.largura) ** 2 + ((a.y - carta.y) / a.altura) ** 2
      - ((b.x - carta.x) / b.largura) ** 2 - ((b.y - carta.y) / b.altura) ** 2,
    )
    return candidatas[0].slot
  }

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
