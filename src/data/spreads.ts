export type Slot = {
  /** Posição na mesa, em unidades do mundo 3D (x para a direita, z para o fundo). */
  x: number
  z: number
  /** Giro da carta sobre a mesa, em graus. */
  rot?: number
  /** O que aquela posição significa na leitura. */
  rotulo: string
}

export type Spread = {
  id: string
  nome: string
  descricao: string
  slots: Slot[]
}

/**
 * Layouts de tiragem. As coordenadas são do tampo da mesa — o centro é (0,0), x
 * cresce para a direita e z para o fundo. Uma carta ocupa cerca de 0,42 × 0,72,
 * então manter ~0,5 entre centros evita sobreposição.
 */
export const SPREADS: Spread[] = [
  {
    id: 'tres',
    nome: 'Três cartas',
    descricao: 'Passado, presente e futuro — a leitura mais direta.',
    slots: [
      { x: -0.62, z: 0, rotulo: 'Passado' },
      { x: 0, z: 0, rotulo: 'Presente' },
      { x: 0.62, z: 0, rotulo: 'Futuro' },
    ],
  },
  {
    id: 'una',
    nome: 'Carta única',
    descricao: 'Uma pergunta objetiva, uma resposta.',
    slots: [{ x: 0, z: 0, rotulo: 'A resposta' }],
  },
  {
    id: 'cruz-celta',
    nome: 'Cruz Celta',
    descricao: 'Dez cartas: o mapa completo de uma situação.',
    slots: [
      { x: -0.35, z: 0, rotulo: 'A situação' },
      { x: -0.35, z: 0, rot: 90, rotulo: 'O que atravessa' },
      { x: -0.35, z: 0.78, rotulo: 'A base' },
      { x: -1.05, z: 0, rotulo: 'O passado' },
      { x: -0.35, z: -0.78, rotulo: 'O que se busca' },
      { x: 0.35, z: 0, rotulo: 'O que vem' },
      { x: 1.15, z: 1.05, rotulo: 'Você nisso' },
      { x: 1.15, z: 0.35, rotulo: 'O ambiente' },
      { x: 1.15, z: -0.35, rotulo: 'Esperanças e medos' },
      { x: 1.15, z: -1.05, rotulo: 'O desfecho' },
    ],
  },
  {
    id: 'amor',
    nome: 'Vida amorosa',
    descricao: 'Cinco cartas para ler um vínculo por inteiro.',
    slots: [
      { x: -0.62, z: 0.4, rotulo: 'Você' },
      { x: 0.62, z: 0.4, rotulo: 'A outra pessoa' },
      { x: 0, z: 0, rotulo: 'O vínculo' },
      { x: -0.35, z: -0.68, rotulo: 'O que atrapalha' },
      { x: 0.35, z: -0.68, rotulo: 'Para onde vai' },
    ],
  },
  {
    id: 'caminhos',
    nome: 'Dois caminhos',
    descricao: 'Sete cartas para comparar duas decisões.',
    slots: [
      { x: 0, z: 0.75, rotulo: 'Onde você está' },
      { x: -0.62, z: 0.15, rotulo: 'Caminho A' },
      { x: -0.62, z: -0.45, rotulo: 'A leva a' },
      { x: -0.62, z: -1.05, rotulo: 'Fim de A' },
      { x: 0.62, z: 0.15, rotulo: 'Caminho B' },
      { x: 0.62, z: -0.45, rotulo: 'B leva a' },
      { x: 0.62, z: -1.05, rotulo: 'Fim de B' },
    ],
  },
  {
    id: 'mes',
    nome: 'Energia do mês',
    descricao: 'Quatro semanas e um conselho no centro.',
    slots: [
      { x: -0.95, z: 0.3, rotulo: 'Semana 1' },
      { x: -0.32, z: 0.3, rotulo: 'Semana 2' },
      { x: 0.32, z: 0.3, rotulo: 'Semana 3' },
      { x: 0.95, z: 0.3, rotulo: 'Semana 4' },
      { x: 0, z: -0.6, rotulo: 'Conselho do mês' },
    ],
  },
]

export const SPREAD_BY_ID = new Map(SPREADS.map((s) => [s.id, s]))
