/**
 * O catálogo de serviços. É a única fonte de verdade de preço: a tabela da
 * home, o leque de cartas e o agendamento leem todos daqui.
 *
 * Sem emoji, de propósito. O que aparece em `icon` é um ornamento tipográfico
 * monocromático — a mesma família de sinais do resto do site (✦ no cabeçalho,
 * ☾ no perfil). Emoji colorido vinha de uma fonte diferente em cada sistema,
 * desalinhava a linha e dava à tabela um tom de conversa de aplicativo que não
 * combina com uma consulta de R$ 220.
 */
export type Plan = {
  id: string
  /** Ornamento da categoria, repetido na carta do leque. */
  icon: string
  title: string
  /** Uma linha dizendo o que a pessoa leva. É o que sustenta o preço. */
  resumo: string
  /** Duração, quando o plano é vendido por tempo. */
  duration?: string
  price: number
}

export type Category = {
  id: string
  icon: string
  title: string
  tagline: string
  /** Cor de destaque da categoria — usada no brilho da carta e no verso. */
  accent: string
  plans: Plan[]
}

export const categories: Category[] = [
  {
    id: 'avulsas',
    icon: '✦',
    title: 'Perguntas avulsas',
    tagline: 'Uma dúvida pontual, uma resposta direta.',
    accent: '#7b5cff',
    plans: [
      {
        id: 'avulsa-1',
        icon: '✦',
        title: '1 pergunta objetiva',
        resumo: 'Uma pergunta fechada, com a tiragem e a leitura correspondente.',
        price: 35,
      },
      {
        id: 'avulsa-2',
        icon: '✦',
        title: '2 perguntas',
        resumo: 'Duas questões independentes, cada uma com sua tiragem.',
        price: 60,
      },
      {
        id: 'avulsa-3',
        icon: '✦',
        title: '3 perguntas',
        resumo: 'Três questões, com espaço para desdobrar o que aparecer.',
        price: 80,
      },
      {
        id: 'avulsa-5',
        icon: '✦',
        title: '5 perguntas',
        resumo: 'Cinco questões sobre frentes diferentes da sua vida.',
        price: 120,
      },
    ],
  },
  {
    id: 'tematicas',
    icon: '☾',
    title: 'Leituras temáticas',
    tagline: 'Um mergulho completo em uma área da sua vida.',
    accent: '#e0559e',
    plans: [
      {
        id: 'tema-amor',
        icon: '☾',
        title: 'Vida amorosa',
        resumo: 'Panorama do momento afetivo: o que está posto e o que se move.',
        price: 70,
      },
      {
        id: 'tema-complexa',
        icon: '☾',
        title: 'Situação amorosa complexa',
        resumo: 'Idas e vindas, triângulos e relações mal resolvidas, lidas com calma.',
        price: 90,
      },
      {
        id: 'tema-sentimentos',
        icon: '☾',
        title: 'Sentimentos e intenções',
        resumo: 'O que a outra pessoa sente e o que pretende fazer com isso.',
        price: 65,
      },
      {
        id: 'tema-futuro',
        icon: '☾',
        title: 'Futuro da relação',
        resumo: 'Para onde a relação caminha nos próximos meses e o que a decide.',
        price: 75,
      },
      {
        id: 'tema-trabalho',
        icon: '☾',
        title: 'Trabalho e carreira',
        resumo: 'Cargo, mudança de área, proposta na mesa, sociedade.',
        price: 70,
      },
      {
        id: 'tema-financas',
        icon: '☾',
        title: 'Vida financeira',
        resumo: 'O ciclo do dinheiro: entradas, travas e o que muda o quadro.',
        price: 70,
      },
      {
        id: 'tema-espiritual',
        icon: '☾',
        title: 'Espiritualidade e propósito',
        resumo: 'Caminho espiritual, dons e o que pede desenvolvimento.',
        price: 80,
      },
      {
        id: 'tema-auto',
        icon: '☾',
        title: 'Autoconhecimento',
        resumo: 'Leitura longa sobre os padrões seus que se repetem, e por quê.',
        price: 90,
      },
      {
        id: 'tema-caminhos',
        icon: '☾',
        title: 'Dois caminhos / tomada de decisão',
        resumo: 'Duas opções lidas lado a lado, com o desdobramento de cada uma.',
        price: 70,
      },
    ],
  },
  {
    id: 'tempo',
    icon: '❖',
    title: 'Consultas por tempo',
    tagline: 'Você conduz a conversa. Pergunte o quanto quiser.',
    accent: '#5ec8e8',
    plans: [
      {
        id: 'tempo-express',
        icon: '❖',
        title: 'Consulta express',
        resumo: 'Tempo curto para uma ou duas questões urgentes.',
        duration: '20 min',
        price: 60,
      },
      {
        id: 'tempo-completa',
        icon: '❖',
        title: 'Consulta completa',
        resumo: 'Espaço para um tema inteiro, com perguntas de acompanhamento.',
        duration: '40 min',
        price: 110,
      },
      {
        id: 'tempo-profunda',
        icon: '❖',
        title: 'Consulta profunda',
        resumo: 'Uma hora para atravessar várias frentes sem pressa.',
        duration: '1 hora',
        price: 160,
      },
      {
        id: 'tempo-premium',
        icon: '❖',
        title: 'Consulta premium',
        resumo: 'A sessão mais longa, para quem quer revisar o quadro inteiro.',
        duration: '1h30',
        price: 220,
      },
    ],
  },
  {
    id: 'especiais',
    icon: '◈',
    title: 'Tiragens especiais',
    tagline: 'Mapas largos para ciclos inteiros.',
    accent: '#c08bff',
    plans: [
      {
        id: 'esp-cruz',
        icon: '◈',
        title: 'Cruz Celta',
        resumo: 'Dez posições: a tiragem clássica para uma situação complexa.',
        price: 100,
      },
      {
        id: 'esp-mandala',
        icon: '◈',
        title: 'Mandala Astrológica',
        resumo: 'Doze casas, uma carta para cada área da vida.',
        price: 150,
      },
      {
        id: 'esp-ano',
        icon: '◈',
        title: 'Leitura do Ano',
        resumo: 'Mês a mês, com o tema que atravessa os doze.',
        price: 180,
      },
      {
        id: 'esp-mes',
        icon: '◈',
        title: 'Energia do mês',
        resumo: 'O clima das próximas semanas e onde pisar com cuidado.',
        price: 70,
      },
      {
        id: 'esp-3meses',
        icon: '◈',
        title: 'Panorama dos próximos 3 meses',
        resumo: 'Um trimestre lido em blocos, com os pontos de virada.',
        price: 120,
      },
      {
        id: 'esp-6meses',
        icon: '◈',
        title: 'Panorama dos próximos 6 meses',
        resumo: 'Meio ano à frente, mês a mês, com o fio que liga tudo.',
        price: 160,
      },
      {
        id: 'esp-proposito',
        icon: '◈',
        title: 'Leitura de propósito e caminho pessoal',
        resumo: 'Vocação, talentos e a direção que pede ser seguida.',
        price: 150,
      },
    ],
  },
]

/**
 * Todo plano por id, junto da categoria a que pertence. O agendamento recebe só
 * o id pela URL e precisa reconstruir o resto — inclusive a cor, que pinta a
 * tela inteira da reserva.
 */
export const PLAN_BY_ID = new Map(
  categories.flatMap((c) => c.plans.map((p) => [p.id, { plano: p, categoria: c }] as const)),
)

export const formatPrice = (price: number) => `R$ ${price}`

/** Com centavos. É a forma que vale para cobrar — a do Pix e a do comprovante. */
export const formatPriceFull = (price: number) =>
  price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
