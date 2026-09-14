/**
 * Caminho de um arquivo de `public/`. Precisa passar por `BASE_URL` porque o
 * site é publicado em /<repositorio>/ no GitHub Pages: um caminho absoluto como
 * `/rodrigo.png` iria buscar na raiz do domínio e dar 404. Em desenvolvimento a
 * base é `/`, então o resultado é o mesmo de antes.
 */
const asset = (arquivo: string) => `${import.meta.env.BASE_URL}${arquivo}`

/** Textos e links do site — edite tudo por aqui. */
export const site = {
  brand: 'Tarot',
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
  facePage: { href: '#/sobre', label: 'Sobre mim' },
  contact: {
    whatsapp: '#',
    email: '#',
  },
  footerNote: 'O tarot é uma ferramenta de autoconhecimento e não substitui acompanhamento médico, psicológico ou jurídico.',
}

export type SocialId = 'instagram' | 'tiktok' | 'twitter'

/** Redes do topo e do rodapé. `href: '#'` = link ainda sem destino. */
export const socials: { id: SocialId; label: string; href: string }[] = [
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'tiktok', label: 'TikTok', href: '#' },
  { id: 'twitter', label: 'X', href: '#' },
]
