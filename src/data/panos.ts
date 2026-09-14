export type Pano = {
  id: string
  nome: string
  /** Cor de base do tecido. */
  cor: string
  /** Cor do bordado/desenho. */
  traco: string
  /**
   * Desenho do pano, em SVG de 512×512, convertido em textura. É este bloco que
   * o cliente vai poder trocar no futuro — por isso o pano é dado, e não código
   * dentro da cena.
   */
  desenho: string
}

/** Roda dos 12 signos, usada por mais de um pano. */
function roda(traco: string, raio: number) {
  const marcas = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    const x1 = 256 + Math.cos(a) * (raio - 16)
    const y1 = 256 + Math.sin(a) * (raio - 16)
    const x2 = 256 + Math.cos(a) * raio
    const y2 = 256 + Math.sin(a) * raio
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${traco}" stroke-width="3"/>`
  }).join('')
  return `<circle cx="256" cy="256" r="${raio}" fill="none" stroke="${traco}" stroke-width="2.5"/>${marcas}`
}

/** Polígono estrelado {n/step}. */
function estrela(n: number, step: number, r: number, traco: string, largura = 2) {
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const a = ((i * step) % n) * ((Math.PI * 2) / n) - Math.PI / 2
    pts.push(`${(256 + Math.cos(a) * r).toFixed(1)},${(256 + Math.sin(a) * r).toFixed(1)}`)
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${traco}" stroke-width="${largura}"/>`
}

export const PANOS: Pano[] = [
  {
    id: 'lua',
    nome: 'Roda da Lua',
    cor: '#2a1050',
    traco: '#d9b979',
    desenho: `${roda('#d9b979', 226)}${estrela(12, 5, 186, '#d9b979', 1.6)}
      <circle cx="256" cy="256" r="120" fill="none" stroke="#d9b979" stroke-width="2"/>
      <path d="M256 160a96 96 0 1 0 .1 0 72 72 0 1 1-.1 0" fill="#d9b979" opacity="0.5"/>`,
  },
  {
    id: 'sol',
    nome: 'Sol Nascente',
    cor: '#3a1338',
    traco: '#f0c977',
    desenho: `${roda('#f0c977', 226)}
      <circle cx="256" cy="256" r="72" fill="#f0c977" opacity="0.55"/>
      ${Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        const longo = i % 2 === 0
        return `<line x1="${256 + Math.cos(a) * 86}" y1="${256 + Math.sin(a) * 86}" x2="${256 + Math.cos(a) * (longo ? 168 : 128)}" y2="${256 + Math.sin(a) * (longo ? 168 : 128)}" stroke="#f0c977" stroke-width="${longo ? 4 : 2}" opacity="0.75"/>`
      }).join('')}`,
  },
  {
    id: 'pentagrama',
    nome: 'Pentagrama',
    cor: '#1d1246',
    traco: '#c9a7ff',
    desenho: `${roda('#c9a7ff', 226)}${estrela(5, 2, 190, '#c9a7ff', 3)}
      <circle cx="256" cy="256" r="190" fill="none" stroke="#c9a7ff" stroke-width="2" opacity="0.7"/>`,
  },
  {
    id: 'liso',
    nome: 'Veludo liso',
    cor: '#2b0f34',
    traco: '#e0b96a',
    desenho: `<rect x="34" y="34" width="444" height="444" rx="18" fill="none" stroke="#e0b96a" stroke-width="2.5" opacity="0.6"/>
      <rect x="52" y="52" width="408" height="408" rx="12" fill="none" stroke="#e0b96a" stroke-width="1.2" opacity="0.4"/>`,
  },
]

export const PANO_BY_ID = new Map(PANOS.map((p) => [p.id, p]))

/** Monta o SVG completo do pano como data URI, pronto para virar textura. */
export function panoDataUri(p: Pano): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${p.cor}"/>
    <g opacity="0.85">${p.desenho}</g>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
