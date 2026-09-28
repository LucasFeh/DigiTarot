import type { CartaNaMesa } from './backend'
import type { Spread } from '../data/spreads'
import { CARTA_H, CARTA_W } from '../data/cardDimensions'

export type CartaReconhecida = { cardId: string; x: number; y: number; invertida: boolean; proporcaoVideo?: number }

export type GuiaCamera = {
  slot: number
  x: number
  y: number
  largura: number
  altura: number
  rotulo: string
}

/** Preserva o tamanho e a proporção da carta 3D no vídeo e encaixa a tiragem inteira. */
export function guiasDaCamera(spread: Spread, proporcaoVideo = 16 / 9): GuiaCamera[] {
  if (!spread.slots.length) return []
  const aspecto = Number.isFinite(proporcaoVideo) && proporcaoVideo > 0 ? proporcaoVideo : 16 / 9
  const limites = spread.slots.map((slot) => {
    const deLado = Math.abs(slot.rot ?? 0) % 180 === 90
    const largura = deLado ? CARTA_H : CARTA_W
    const altura = deLado ? CARTA_W : CARTA_H
    return { xMin: slot.x - largura / 2, xMax: slot.x + largura / 2, zMin: slot.z - altura / 2, zMax: slot.z + altura / 2 }
  })
  const xMin = Math.min(...limites.map((limite) => limite.xMin))
  const xMax = Math.max(...limites.map((limite) => limite.xMax))
  const zMin = Math.min(...limites.map((limite) => limite.zMin))
  const zMax = Math.max(...limites.map((limite) => limite.zMax))
  const centroX = (xMin + xMax) / 2
  const centroZ = (zMin + zMax) / 2
  const escala = Math.min(
    aspecto * 0.84 / (xMax - xMin),
    0.8 / (zMax - zMin),
    0.32 / CARTA_H,
  )
  return spread.slots.map((slot, indice) => {
    const deLado = Math.abs(slot.rot ?? 0) % 180 === 90
    return {
      slot: indice,
      x: 0.5 + (slot.x - centroX) * escala / aspecto,
      y: 0.5 + (slot.z - centroZ) * escala,
      largura: (deLado ? CARTA_H : CARTA_W) * escala / aspecto,
      altura: (deLado ? CARTA_W : CARTA_H) * escala,
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
  const guias = guiasDaCamera(spread, carta.proporcaoVideo)
  const aspecto = typeof carta.proporcaoVideo === 'number' && Number.isFinite(carta.proporcaoVideo) && carta.proporcaoVideo > 0
    ? carta.proporcaoVideo : 16 / 9

  if (usarGuias) {
    const candidatas = guias.filter((guia) => livres.some(({ indice }) => indice === guia.slot)
      && Math.abs(carta.x - guia.x) <= guia.largura / 2 + 0.02
      && Math.abs(carta.y - guia.y) <= guia.altura / 2 + 0.025)
    if (!candidatas.length) return null
    candidatas.sort((a, b) =>
      ((a.x - carta.x) / a.largura) ** 2 + ((a.y - carta.y) / a.altura) ** 2
      - ((b.x - carta.x) / b.largura) ** 2 - ((b.y - carta.y) / b.altura) ** 2,
    )
    return candidatas[0].slot
  }

  const distancia = (indice: number) => ((guias[indice].x - carta.x) * aspecto) ** 2 + (guias[indice].y - carta.y) ** 2
  livres.sort((a, b) => distancia(a.indice) - distancia(b.indice))
  return livres[0].indice
}
