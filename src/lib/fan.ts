/** Distância do pivô imaginário do leque ao centro da carta. Define a curvatura. */
export const FAN_RADIUS = 716

/**
 * Ângulo de uma carta no leque.
 */
export function fanSlot(i: number, total: number, maxSpread: number): { angle: number } {
  const spread = Math.min(total * 11, maxSpread)
  const angle = total > 1 ? -spread / 2 + (spread / (total - 1)) * i : 0
  return { angle }
}

/**
 * Deslocamento da carta em relação ao centro do leque, para um dado ângulo.
 *
 * O arco poderia sair de graça com `transform-origin` num pivô lá embaixo, e
 * era assim que funcionava antes — mas aí QUALQUER mudança de `rotate` faz a
 * carta orbitar esse pivô num arco de 716px. Na saída ela orbitava em vez de ir
 * até o buraco negro. Com a posição explícita e origem no centro, `x`/`y` movem
 * em linha reta e `rotate` gira a carta no próprio eixo — as duas coisas
 * independentes, que é o que a animação de saída precisa.
 */
export function fanOffset(angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  return { x: FAN_RADIUS * Math.sin(a), y: FAN_RADIUS * (1 - Math.cos(a)) }
}

/** Ruído determinístico 0..1 — mantém o "aleatório" estável entre renders. */
export function noise(n: number): number {
  const x = Math.sin(n * 127.1 + 11.7) * 43758.5453
  return x - Math.floor(x)
}
