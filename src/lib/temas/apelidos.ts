import type { Naipe } from '../../data/cards'

/**
 * As listas de palavra do casamento por nome, num arquivo só — é aqui que se
 * mexe quando um lote real de imagens falha, sem tocar no algoritmo.
 *
 * Todas as chaves já vêm normalizadas: minúsculas, sem acento, separadas por
 * espaço. Quem compara é `casar.ts`, que normaliza a entrada do mesmo jeito.
 */

/** Palavras que aparecem em nome de arquivo e não dizem nada sobre a carta. */
export const RUIDO: ReadonlySet<string> = new Set([
  'img',
  'image',
  'imagem',
  'foto',
  'photo',
  'carta',
  'card',
  'tarot',
  'taro',
  'copy',
  'copia',
  'final',
  'v1',
  'v2',
  'scan',
  'arte',
  'jpg',
  'jpeg',
  'png',
  'webp',
])

export const ARTIGOS: ReadonlySet<string> = new Set([
  // pt-BR
  'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das',
  // en
  'of', 'the',
  // fr — baralhos de Marselha nomeiam tudo com artigo: `Le_Mat`, `L_Imperatrice`
  'le', 'la', 'les', 'l', 'un', 'une', 'du', 'des',
])

/** O verso do baralho, em todas as formas que a pessoa pode ter nomeado. */
export const MARCA_VERSO: ReadonlySet<string> = new Set([
  'verso',
  'costas',
  'dorso',
  'reverso',
  'back',
  'backside',
  'cover',
  'capa',
])

/**
 * Valor de cada figura e número dos arcanos menores. `as` sem acento aparece
 * aqui porque a normalização tira o acento de "Ás" — e também porque o artigo
 * plural "as" é removido antes, na limpeza.
 */
export const RANKS: ReadonlyMap<string, number> = new Map<string, number>([
  ['as', 1],
  ['ace', 1],
  ['um', 1],
  ['dois', 2],
  ['tres', 3],
  ['quatro', 4],
  ['cinco', 5],
  ['seis', 6],
  ['sete', 7],
  ['oito', 8],
  ['nove', 9],
  ['dez', 10],
  ['valete', 11],
  ['pajem', 11],
  ['page', 11],
  ['jack', 11],
  ['cavaleiro', 12],
  ['cavalo', 12],
  ['knight', 12],
  ['rainha', 13],
  ['queen', 13],
  ['rei', 14],
  ['king', 14],
])

export const NAIPES: ReadonlyMap<string, Naipe> = new Map<string, Naipe>([
  ['paus', 'paus'],
  ['bastoes', 'paus'],
  ['wands', 'paus'],
  ['clubs', 'paus'],
  ['copas', 'copas'],
  ['cups', 'copas'],
  ['tacas', 'copas'],
  ['hearts', 'copas'],
  ['espadas', 'espadas'],
  ['swords', 'espadas'],
  ['spades', 'espadas'],
  ['ouros', 'ouros'],
  ['pentaculos', 'ouros'],
  ['pentacles', 'ouros'],
  ['pents', 'ouros'],
  ['moedas', 'ouros'],
  ['coins', 'ouros'],
  ['discos', 'ouros'],
  ['diamonds', 'ouros'],
])

export const ROMANOS: ReadonlyMap<string, number> = new Map(
  [
    'o',
    'i',
    'ii',
    'iii',
    'iv',
    'v',
    'vi',
    'vii',
    'viii',
    'ix',
    'x',
    'xi',
    'xii',
    'xiii',
    'xiv',
    'xv',
    'xvi',
    'xvii',
    'xviii',
    'xix',
    'xx',
    'xxi',
  ].map((r, i) => [r, i] as const),
)

/**
 * Outros nomes pelos quais cada arcano maior é conhecido em português. O nome
 * canônico (e o nome sem artigo) é montado a partir de `CARDS` em `casar.ts`,
 * então aqui só entram as variantes que NÃO saem do nome oficial.
 */
export const APELIDOS_MAIOR: Readonly<Record<number, readonly string[]>> = {
  0: ['louco', 'bobo', 'fool', 'o bobo da corte', 'le mat', 'mat'],
  1: ['mago', 'magician', 'o magico', 'magico', 'le bateleur', 'bateleur'],
  2: ['papisa', 'sacerdotisa', 'high priestess', 'priestess', 'la papesse', 'papesse'],
  3: ['imperatriz', 'empress', 'imperatrice'],
  4: ['imperador', 'emperor', 'empereur'],
  5: ['papa', 'hierofante', 'sumo sacerdote', 'hierophant', 'le pape', 'pape'],
  6: ['amantes', 'os enamorados', 'enamorados', 'lovers', 'amoureux', 'les amoureux'],
  7: ['carro', 'o carro triunfal', 'chariot'],
  8: ['forca', 'strength', 'force', 'la force'],
  9: ['eremita', 'o ermitao', 'ermitao', 'hermit', 'ermite'],
  10: ['roda da fortuna', 'roda', 'wheel of fortune', 'wheel', 'roue de fortune', 'la roue', 'roue'],
  11: ['justica', 'justice'],
  12: ['enforcado', 'o pendurado', 'pendurado', 'hanged man', 'le pendu', 'pendu'],
  13: ['morte', 'death', 'la mort', 'mort'],
  14: ['temperanca', 'temperance'],
  15: ['diabo', 'devil', 'le diable', 'diable'],
  16: ['torre', 'a casa de deus', 'tower', 'la maison dieu', 'maison dieu', 'maison de dieu'],
  17: ['estrela', 'star', 'etoile'],
  18: ['lua', 'moon', 'lune'],
  19: ['sol', 'sun', 'soleil'],
  20: ['julgamento', 'o juizo', 'juizo', 'judgement', 'judgment', 'jugement'],
  21: ['mundo', 'world', 'monde'],
}
