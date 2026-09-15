import { CARD_BY_ID } from '../../data/cards'
import { PANO_BY_ID, PANOS, panoDataUri } from '../../data/panos'

/**
 * A arte desenhada — a mesma de sempre, só que fora do componente.
 *
 * Estava dentro de `CartaMesa`, o que fazia cada carta na mesa construir o SEU
 * verso: numa Cruz Celta eram dez texturas idênticas na GPU, e nenhuma delas
 * era descartada. Aqui as funções só produzem a string; quem cria e destrói
 * `THREE.Texture` é o registro em `texturas.ts`.
 */

const ROMANOS = [
  '0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI',
]

export function svgVerso(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="840" viewBox="0 0 256 420">
    <rect width="256" height="420" rx="14" fill="#1b0d42"/>
    <rect x="9" y="9" width="238" height="402" rx="9" fill="none" stroke="#d9b979" stroke-width="2" opacity="0.55"/>
    <g stroke="#d9b979" fill="none" opacity="0.7">
      <circle cx="128" cy="210" r="62" stroke-width="1.6"/>
      <circle cx="128" cy="210" r="44" stroke-width="1"/>
    </g>
    <path d="M128 148 L136 202 L190 210 L136 218 L128 272 L120 218 L66 210 L120 202 Z" fill="#d9b979" opacity="0.85"/>
    <path d="M128 96a15 15 0 1 0 .1 0 11 11 0 1 1-.1 0" fill="#d9b979" opacity="0.6"/>
    <path d="M128 324a15 15 0 1 0 .1 0 11 11 0 1 1-.1 0" fill="#d9b979" opacity="0.6"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Frente da carta, desenhada a partir dos dados dela. Não há arte por carta —
 * o que identifica é o nome, o número e o símbolo do naipe, num layout de
 * baralho clássico.
 */
export function svgFrente(cardId: string): string {
  const c = CARD_BY_ID.get(cardId)
  const nome = c?.nome ?? '—'
  const simbolo = { maior: '✦', paus: '♣', copas: '♥', espadas: '♠', ouros: '♦' }[c?.naipe ?? 'maior']
  const romano = c?.naipe === 'maior' ? (ROMANOS[c.numero] ?? '') : `${c?.numero ?? ''}`
  // Quebra o nome em duas linhas quando não cabe.
  const palavras = nome.split(' ')
  const meio = Math.ceil(palavras.length / 2)
  const linhas = nome.length > 14 ? [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')] : [nome]

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="840" viewBox="0 0 256 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdf6e6"/><stop offset="100%" stop-color="#efe0c4"/>
    </linearGradient></defs>
    <rect width="256" height="420" rx="14" fill="url(#g)"/>
    <rect x="9" y="9" width="238" height="402" rx="9" fill="none" stroke="#7a5a25" stroke-width="2"/>
    <text x="128" y="52" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#7a5a25">${romano}</text>
    <text x="128" y="212" text-anchor="middle" font-size="96" fill="#6d3fd4" opacity="0.72">${simbolo}</text>
    ${linhas
      .map(
        (l, i) =>
          `<text x="128" y="${330 + i * 30}" text-anchor="middle" font-family="Georgia,serif" font-size="23" fill="#3b2a12">${l}</text>`,
      )
      .join('')}
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function svgPano(panoId: string): string {
  return panoDataUri(PANO_BY_ID.get(panoId) ?? PANOS[0])
}
