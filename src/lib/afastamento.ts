/**
 * Quanto o cliente pode afastar a mesa, e por quê esses números.
 *
 * Mora fora do `Sala3D` de propósito: a `SalaPage` precisa dos limites para
 * saber quando desabilitar os botões, e a sala inteira entra por `lazy()`
 * justamente para o three não cair no bundle de quem nunca abriu uma mesa.
 * Uma constante importada de lá arrastaria o motor 3D junto.
 */

/** Descanso — o enquadramento desenhado, que é o mais perto que ele chega. */
export const AFASTAMENTO_MIN = 1

/**
 * O teto. Multiplicar a distância por 1,4 e não mais, porque três contas
 * diferentes caem quase no mesmo número:
 *
 *  · a Cruz Celta só cabe inteira numa tela 4:3 a partir de 1,03 — o ponto
 *    teimoso é o canto de "Você nisso", que hoje some uns 21 px de cada lado
 *    em 1024×768. Com folga para o hover levantar a carta, 1,15 já resolve;
 *  · o tampo TODO (3,7 de lado) passa a caber em 4:3 a partir de 1,387;
 *  · o tarólogo já podia ir até 5,4 de distância no OrbitControls, que sobre
 *    os 3,90 do padrão dá 1,386 — o cliente não passa de onde ele vai.
 *
 * Acima disso a neblina (que começa em 4,5) lava a mesa e ela vira miniatura:
 * a 1,4 já são ~17% de névoa sobre o tampo, a 2,0 seriam 52%.
 */
export const AFASTAMENTO_MAX = 1.4

/** Três toques no botão percorrem o curso inteiro, de ponta a ponta. */
export const PASSO_BOTAO = Math.cbrt(AFASTAMENTO_MAX / AFASTAMENTO_MIN)

export function limitarAfastamento(f: number) {
  return Math.min(AFASTAMENTO_MAX, Math.max(AFASTAMENTO_MIN, f))
}
