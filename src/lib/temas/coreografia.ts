/**
 * A prévia do tema inteira como função de um escalar.
 *
 * Puro: sem React e sem three. A cena só lê `estadoDaCarta(t, i)` e aplica — o
 * que faz a animação ser inspecionável, determinística e capaz de andar para
 * trás quando a pessoa arrasta a barra de progresso.
 */

/** Duração de uma carta em cena, em segundos. */
export const DUR = 3.0
/** Quanto uma carta ainda está em cena quando a próxima entra. */
export const SOBREPOSICAO = 0.45
/** Intervalo entre entradas. */
export const PASSO = DUR - SOBREPOSICAO

export type EstadoCarta = {
  pos: [number, number, number]
  /** Giro sobre X: 0 = verso para cima, π = frente. */
  giroX: number
  escala: number
  opacidade: number
  revelada: boolean
  /** 0..1 — intensidade do clarão de magia no instante da virada. */
  magia: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Interpolação suave entre a e b, com aceleração e desaceleração. */
function suave(a: number, b: number, u: number) {
  const k = clamp01(u)
  return a + (b - a) * (k * k * (3 - 2 * k))
}

/** Rampa de 0 a 1 entre `de` e `ate`. */
const faixa = (u: number, de: number, ate: number) => clamp01((u - de) / (ate - de))

export const tempoDaCarta = (i: number) => i * PASSO
export const totalDoDesfile = (n: number) => Math.max(0, (n - 1) * PASSO + DUR)
/** Qual carta está no centro da cena neste instante. */
export const cartaEm = (t: number) => Math.max(0, Math.floor(t / PASSO))

/**
 * O estado da carta `i` no instante `t` da linha do tempo. `null` quando ela
 * ainda não entrou ou já saiu — a cena usa isso para nem montar o mesh.
 *
 * A virada é sobre X, o MESMO eixo da mesa. É isso que deixa a prévia usar a
 * mesma textura da carta, com a mesma rotação de UV, sem clone e sem uma
 * segunda orientação para manter em sincronia.
 */
export function estadoDaCarta(t: number, i: number): EstadoCarta | null {
  const u = (t - tempoDaCarta(i)) / DUR
  if (u < 0 || u > 1) return null

  // Sobe flutuando da frente/baixo, para no centro, e sai por cima para trás.
  const entrada = faixa(u, 0, 0.3)
  const saida = faixa(u, 0.82, 1)
  const y = suave(-0.55, 0, entrada) + suave(0, 1.15, saida)
  const z = suave(0.85, 0, entrada) + suave(0, -0.55, saida)
  // Balanço lateral mínimo: é o que tira o aspecto de trilho.
  const x = Math.sin((t - tempoDaCarta(i)) * 1.15) * 0.045

  const giroX = suave(0, Math.PI, faixa(u, 0.3, 0.56))
  const escala = suave(0.82, 1, entrada) * suave(1, 1.08, saida)
  const opacidade = Math.min(faixa(u, 0, 0.16), 1 - faixa(u, 0.84, 1))

  // O clarão acompanha a virada e apaga logo: um pico em 0,43.
  const magia = Math.sin(clamp01(faixa(u, 0.28, 0.62)) * Math.PI)

  return { pos: [x, y, z], giroX, escala, opacidade, revelada: u > 0.5, magia }
}
