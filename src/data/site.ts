/**
 * Caminho de um arquivo de `public/`. Precisa passar por `BASE_URL` porque o
 * site é publicado em /<repositorio>/ no GitHub Pages: um caminho absoluto como
 * `/rodrigo.png` iria buscar na raiz do domínio e dar 404. Em desenvolvimento a
 * base é `/`, então o resultado é o mesmo de antes.
 */
const asset = (arquivo: string) => `${import.meta.env.BASE_URL}${arquivo}`

/** Textos e links do site — edite tudo por aqui. */
export const site = {
  brand: 'DigiTarot',
  /** Aparece acima do título, em maiúsculas espaçadas. */
  eyebrow: 'Leitura de cartas online',
  headline: 'As cartas já sabem.\nFalta você perguntar.',
  subline:
    'Consultas de tarot feitas com calma e sem enrolação — respostas claras para o que está travado, seja no amor, no trabalho ou dentro de você.',
  /**
   * Ilustração recortada do hero, servida de public/. O .webp é bem mais leve
   * (106 KB contra 892 KB) e o .png entra como fallback. Vazio = sem ilustração.
   * Ambos são gerados a partir de Rodrigo_mago.jpg — veja o README.
   */
  avatar: asset('rodrigo.png'),
  avatarWebp: asset('rodrigo.webp'),
  avatarAlt: 'Ilustração do tarólogo segurando um leque de cartas',
  /** Destino do clique no rosto da ilustração. */
  facePage: { href: '#/tarologos', label: 'Conheça os tarólogos' },
  contact: {
    whatsapp: '#',
    email: '#',
  },
  /**
   * WhatsApp do tarólogo, só dígitos com DDI: `5511999999999`. É por onde o
   * cliente manda o comprovante do Pix — sem isso a tela de pagamento apenas
   * pede que ele avise pelo contato de sempre.
   */
  whatsapp: (import.meta.env.VITE_WHATSAPP ?? '').replace(/\D/g, ''),
  footerNote: 'O tarot é uma ferramenta de autoconhecimento e não substitui acompanhamento médico, psicológico ou jurídico.',
}

export type SocialId = 'instagram' | 'tiktok' | 'twitter'

/** Redes do topo e do rodapé. `href: '#'` = link ainda sem destino. */
export const socials: { id: SocialId; label: string; href: string }[] = [
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'tiktok', label: 'TikTok', href: '#' },
  { id: 'twitter', label: 'X', href: '#' },
]
