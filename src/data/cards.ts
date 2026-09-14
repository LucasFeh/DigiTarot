export type Naipe = 'maior' | 'paus' | 'copas' | 'espadas' | 'ouros'

export type TarotCard = {
  /** Identificador estável — é o que é gravado na tiragem. */
  id: string
  nome: string
  naipe: Naipe
  /** Número do arcano maior (0–21) ou valor do menor (1–14). */
  numero: number
  /** Três a quatro palavras que resumem a carta. */
  chaves: string[]
  /** O resumo que aparece no popup, de pé. */
  normal: string
  /** O mesmo, quando a carta está invertida. */
  invertida: string
}

const MAIORES: Omit<TarotCard, 'naipe' | 'id'>[] = [
  {
    numero: 0,
    nome: 'O Louco',
    chaves: ['começo', 'salto', 'inocência'],
    normal: 'Um começo sem mapa. Pede coragem para dar o primeiro passo mesmo sem ver o chão inteiro.',
    invertida: 'Impulso sem cuidado, ou medo de sair do lugar. Falta olhar onde se pisa.',
  },
  {
    numero: 1,
    nome: 'O Mago',
    chaves: ['vontade', 'recurso', 'ação'],
    normal: 'Você tem em mãos tudo o que precisa. É hora de usar, não de guardar.',
    invertida: 'Talento desperdiçado, ou manipulação. A força está sendo usada para o lado errado.',
  },
  {
    numero: 2,
    nome: 'A Sacerdotisa',
    chaves: ['intuição', 'silêncio', 'mistério'],
    normal: 'A resposta já está em você, mas vem pelo silêncio. Escute antes de agir.',
    invertida: 'Intuição abafada pelo barulho de fora, ou segredo que pesa demais.',
  },
  {
    numero: 3,
    nome: 'A Imperatriz',
    chaves: ['abundância', 'cuidado', 'criação'],
    normal: 'Algo está florescendo e pede ser nutrido. Fartura, corpo, prazer, criação.',
    invertida: 'Cuidado que virou controle, ou criatividade travada. Falta se nutrir também.',
  },
  {
    numero: 4,
    nome: 'O Imperador',
    chaves: ['estrutura', 'limite', 'autoridade'],
    normal: 'É hora de colocar ordem e estabelecer limites claros. Estrutura sustenta.',
    invertida: 'Rigidez, autoritarismo, ou o oposto: falta de rumo e de regra.',
  },
  {
    numero: 5,
    nome: 'O Hierofante',
    chaves: ['tradição', 'ensino', 'pertencer'],
    normal: 'Buscar orientação em quem já percorreu o caminho. Aprendizado com raiz.',
    invertida: 'Regra que não serve mais, ou a necessidade de seguir o próprio caminho.',
  },
  {
    numero: 6,
    nome: 'Os Amantes',
    chaves: ['escolha', 'união', 'valores'],
    normal: 'Uma escolha do coração que define um rumo. Diz respeito a valores, não só a amor.',
    invertida: 'Decisão adiada, desalinhamento, ou uma união que pede honestidade.',
  },
  {
    numero: 7,
    nome: 'O Carro',
    chaves: ['avanço', 'domínio', 'direção'],
    normal: 'Vitória por foco e disciplina. Segure as rédeas e siga em frente.',
    invertida: 'Forças puxando para lados opostos. Avançar sem direção cansa.',
  },
  {
    numero: 8,
    nome: 'A Força',
    chaves: ['coragem', 'doçura', 'paciência'],
    normal: 'Firmeza sem violência. O que é bravo se acalma com gentileza, não com força bruta.',
    invertida: 'Autocrítica dura, impaciência, ou medo disfarçado de dureza.',
  },
  {
    numero: 9,
    nome: 'O Eremita',
    chaves: ['recolhimento', 'busca', 'luz'],
    normal: 'Tempo de se recolher e olhar para dentro. A resposta vem da solidão escolhida.',
    invertida: 'Isolamento que virou fuga, ou recusa de ajuda quando ela é necessária.',
  },
  {
    numero: 10,
    nome: 'A Roda da Fortuna',
    chaves: ['ciclo', 'virada', 'destino'],
    normal: 'A roda girou. O que estava parado se move — e nem tudo está sob seu controle.',
    invertida: 'Resistência à mudança, ou um ciclo que insiste em se repetir.',
  },
  {
    numero: 11,
    nome: 'A Justiça',
    chaves: ['verdade', 'equilíbrio', 'causa'],
    normal: 'Cada ação tem consequência. Pede honestidade e decisão com clareza.',
    invertida: 'Desequilíbrio, julgamento parcial, ou fugir da própria responsabilidade.',
  },
  {
    numero: 12,
    nome: 'O Enforcado',
    chaves: ['pausa', 'entrega', 'outro ângulo'],
    normal: 'Uma pausa necessária. Ver de cabeça para baixo revela o que de pé não aparecia.',
    invertida: 'Estagnação que já não ensina nada, ou sacrifício sem sentido.',
  },
  {
    numero: 13,
    nome: 'A Morte',
    chaves: ['fim', 'transformação', 'passagem'],
    normal: 'Um ciclo termina para que outro possa nascer. Não é perda: é passagem.',
    invertida: 'Agarrar-se ao que já acabou. O fim chega igual, só dói mais.',
  },
  {
    numero: 14,
    nome: 'A Temperança',
    chaves: ['medida', 'cura', 'mistura'],
    normal: 'Encontrar a dose certa. Paciência que cura e junta o que estava separado.',
    invertida: 'Excesso, pressa, ou dificuldade de conciliar partes de si.',
  },
  {
    numero: 15,
    nome: 'O Diabo',
    chaves: ['apego', 'sombra', 'desejo'],
    normal: 'Aquilo que prende: vício, apego, medo. As correntes costumam ser mais frouxas do que parecem.',
    invertida: 'Consciência da prisão e o começo da libertação. A corrente afrouxa.',
  },
  {
    numero: 16,
    nome: 'A Torre',
    chaves: ['ruptura', 'verdade', 'queda'],
    normal: 'O que foi construído em base falsa vem abaixo. Choque que liberta.',
    invertida: 'Um colapso adiado, ou a queda já atravessada — e o alívio depois dela.',
  },
  {
    numero: 17,
    nome: 'A Estrela',
    chaves: ['esperança', 'fé', 'renovo'],
    normal: 'Depois da tempestade, a calma e a confiança voltam. Cura e inspiração.',
    invertida: 'Desânimo, fé abalada, dificuldade de enxergar saída.',
  },
  {
    numero: 18,
    nome: 'A Lua',
    chaves: ['ilusão', 'sonho', 'medo'],
    normal: 'Nem tudo é o que parece. Território do inconsciente, dos medos e dos sonhos.',
    invertida: 'A névoa se dissipa — ou a confusão se aprofunda. Confie nos fatos.',
  },
  {
    numero: 19,
    nome: 'O Sol',
    chaves: ['clareza', 'alegria', 'sucesso'],
    normal: 'Luz plena. Alegria, clareza e sucesso — a carta mais generosa do baralho.',
    invertida: 'Otimismo forçado, ou uma alegria que ainda demora um pouco.',
  },
  {
    numero: 20,
    nome: 'O Julgamento',
    chaves: ['chamado', 'balanço', 'renascer'],
    normal: 'Um chamado que não dá para ignorar. Hora de fazer as contas e recomeçar.',
    invertida: 'Autocrítica pesada, ou um chamado que está sendo evitado.',
  },
  {
    numero: 21,
    nome: 'O Mundo',
    chaves: ['conclusão', 'inteireza', 'viagem'],
    normal: 'Um ciclo se fecha inteiro. Realização, integração, o mundo se abrindo.',
    invertida: 'Algo quase concluído. Falta um passo para fechar de verdade.',
  },
]

/** Sentido geral de cada naipe menor, usado para compor os significados. */
const NAIPES: Record<Exclude<Naipe, 'maior'>, { nome: string; tema: string }> = {
  paus: { nome: 'Paus', tema: 'ação, desejo e trabalho criativo' },
  copas: { nome: 'Copas', tema: 'emoção, vínculo e vida afetiva' },
  espadas: { nome: 'Espadas', tema: 'pensamento, verdade e conflito' },
  ouros: { nome: 'Ouros', tema: 'corpo, dinheiro e o que é concreto' },
}

/** Significado por número, que se colore com o tema do naipe. */
const NUMEROS: Record<number, { nome: string; normal: string; invertida: string }> = {
  1: { nome: 'Ás', normal: 'A semente do naipe: um começo puro e cheio de potencial.', invertida: 'Um começo travado, ou energia que ainda não achou onde ir.' },
  2: { nome: 'Dois', normal: 'Escolha, parceria ou equilíbrio entre duas forças.', invertida: 'Indecisão, ou um desequilíbrio entre os dois lados.' },
  3: { nome: 'Três', normal: 'Primeiro fruto: crescimento e colaboração.', invertida: 'Atraso no crescimento, ou esforço que não rende.' },
  4: { nome: 'Quatro', normal: 'Estabilidade, descanso, o que já está firme.', invertida: 'Apego ao seguro, ou uma base menos sólida do que parece.' },
  5: { nome: 'Cinco', normal: 'Conflito, perda ou a prova que faz crescer.', invertida: 'A crise passando, ou a recusa de encará-la.' },
  6: { nome: 'Seis', normal: 'Harmonia recuperada, troca e generosidade.', invertida: 'Troca desigual, ou dificuldade de seguir em frente.' },
  7: { nome: 'Sete', normal: 'Avaliação: persistir, escolher, ou defender o que é seu.', invertida: 'Ilusão, cansaço, ou escolha adiada.' },
  8: { nome: 'Oito', normal: 'Movimento e domínio pelo esforço repetido.', invertida: 'Pressa, ou um movimento que empacou.' },
  9: { nome: 'Nove', normal: 'Quase lá: a colheita a um passo, com o preço já pago.', invertida: 'Medo perto do fim, ou colheita que não satisfaz.' },
  10: { nome: 'Dez', normal: 'Ciclo completo do naipe, com tudo o que ele carrega.', invertida: 'Peso excessivo, ou um ciclo que custa a fechar.' },
  11: { nome: 'Valete', normal: 'Mensagem, aprendizado, o começo curioso.', invertida: 'Imaturidade, ou notícia que não chega.' },
  12: { nome: 'Cavaleiro', normal: 'Movimento decidido, às vezes rápido demais.', invertida: 'Pressa, ou avanço que perdeu o rumo.' },
  13: { nome: 'Rainha', normal: 'Domínio pelo cuidado e pela profundidade.', invertida: 'Cuidado que virou controle, ou emoção sem borda.' },
  14: { nome: 'Rei', normal: 'Domínio pela experiência e pela autoridade serena.', invertida: 'Autoridade rígida, ou poder usado sem escuta.' },
}

function menores(): TarotCard[] {
  const out: TarotCard[] = []
  for (const naipe of ['paus', 'copas', 'espadas', 'ouros'] as const) {
    const s = NAIPES[naipe]
    for (let n = 1; n <= 14; n++) {
      const num = NUMEROS[n]
      const de = n <= 10 ? `de ${s.nome}` : `de ${s.nome}`
      out.push({
        id: `${naipe}-${n}`,
        nome: `${num.nome} ${de}`,
        naipe,
        numero: n,
        chaves: [s.tema.split(',')[0], num.nome.toLowerCase()],
        normal: `${num.normal} Aqui, no campo de ${s.tema}.`,
        invertida: `${num.invertida} No campo de ${s.tema}.`,
      })
    }
  }
  return out
}

/** As 78 cartas: 22 arcanos maiores e 56 menores. */
export const CARDS: TarotCard[] = [
  ...MAIORES.map((m) => ({ ...m, naipe: 'maior' as const, id: `maior-${m.numero}` })),
  ...menores(),
]

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]))

export const NAIPE_LABEL: Record<Naipe, string> = {
  maior: 'Arcanos maiores',
  paus: 'Paus',
  copas: 'Copas',
  espadas: 'Espadas',
  ouros: 'Ouros',
}
