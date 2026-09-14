export type Plan = {
  id: string
  icon: string
  title: string
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
      { id: 'avulsa-1', icon: '🔮', title: '1 pergunta objetiva', price: 35 },
      { id: 'avulsa-2', icon: '🔮', title: '2 perguntas', price: 60 },
      { id: 'avulsa-3', icon: '🔮', title: '3 perguntas', price: 80 },
      { id: 'avulsa-5', icon: '🔮', title: '5 perguntas', price: 120 },
    ],
  },
  {
    id: 'tematicas',
    icon: '❤️',
    title: 'Leituras temáticas',
    tagline: 'Um mergulho completo em uma área da sua vida.',
    accent: '#e0559e',
    plans: [
      { id: 'tema-amor', icon: '❤️', title: 'Vida amorosa', price: 70 },
      { id: 'tema-complexa', icon: '💔', title: 'Situação amorosa complexa', price: 90 },
      { id: 'tema-sentimentos', icon: '👁️', title: 'Sentimentos e intenções', price: 65 },
      { id: 'tema-futuro', icon: '🔥', title: 'Futuro da relação', price: 75 },
      { id: 'tema-trabalho', icon: '💼', title: 'Trabalho e carreira', price: 70 },
      { id: 'tema-financas', icon: '💰', title: 'Vida financeira', price: 70 },
      { id: 'tema-espiritual', icon: '🌙', title: 'Espiritualidade e propósito', price: 80 },
      // 🪞 (Emoji 13) não existe na fonte do Windows 10 e vira quadrado — 🧘 cobre o mesmo sentido.
      { id: 'tema-auto', icon: '🧘', title: 'Autoconhecimento', price: 90 },
      { id: 'tema-caminhos', icon: '⚖️', title: 'Dois caminhos / tomada de decisão', price: 70 },
    ],
  },
  {
    id: 'tempo',
    icon: '✨',
    title: 'Consultas por tempo',
    tagline: 'Você conduz a conversa. Pergunte o quanto quiser.',
    accent: '#5ec8e8',
    plans: [
      { id: 'tempo-express', icon: '✨', title: 'Consulta express', duration: '20 min', price: 60 },
      { id: 'tempo-completa', icon: '🔮', title: 'Consulta completa', duration: '40 min', price: 110 },
      { id: 'tempo-profunda', icon: '🌟', title: 'Consulta profunda', duration: '1 hora', price: 160 },
      { id: 'tempo-premium', icon: '👑', title: 'Consulta premium', duration: '1h30', price: 220 },
    ],
  },
  {
    id: 'especiais',
    icon: '🌌',
    title: 'Tiragens especiais',
    tagline: 'Mapas largos para ciclos inteiros.',
    accent: '#c08bff',
    plans: [
      { id: 'esp-cruz', icon: '🃏', title: 'Cruz Celta', price: 100 },
      { id: 'esp-mandala', icon: '🌙', title: 'Mandala Astrológica', price: 150 },
      { id: 'esp-ano', icon: '🔥', title: 'Leitura do Ano', price: 180 },
      { id: 'esp-mes', icon: '🌑', title: 'Energia do mês', price: 70 },
      { id: 'esp-3meses', icon: '☀️', title: 'Panorama dos próximos 3 meses', price: 120 },
      { id: 'esp-6meses', icon: '🪐', title: 'Panorama dos próximos 6 meses', price: 160 },
      { id: 'esp-proposito', icon: '👁️‍🗨️', title: 'Leitura de propósito e caminho pessoal', price: 150 },
    ],
  },
]

export const formatPrice = (price: number) => `R$ ${price}`
