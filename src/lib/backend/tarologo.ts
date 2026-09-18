import { categories } from '../../data/plans'
import type { TarologoPublico } from './types'

/**
 * Bootstrap do administrador Rodrigo. Os demais tarólogos são cadastrados no
 * Firestore por e-mail; não há lista de profissionais no código. As regras são
 * publicadas no Firebase separadamente do fluxo do GitHub Pages.
 */
export const EMAIL_TAROLOGO = 'rodriv.l680@gmail.com'
export const FOTO_RODRIGO = `${import.meta.env.BASE_URL}rodrigo-foto.jpg`

/** Comparação de e-mail é sempre sem caixa: o Google devolve o que a pessoa digitou. */
export const ehEmailDeTarologo = (email: string | null | undefined): boolean =>
  (email ?? '').trim().toLowerCase() === EMAIL_TAROLOGO

/** Vitrine inicial e documento semeado para Rodrigo quando ele entra. */
export const TAROLOGO_RODRIGO: TarologoPublico = {
  uid: EMAIL_TAROLOGO,
  email: EMAIL_TAROLOGO,
  nome: 'Rodrigo',
  foto: FOTO_RODRIGO,
  personagem: `${import.meta.env.BASE_URL}rodrigo.webp`,
  cartaoPublicado: true,
  bio: 'Tarólogo e anfitrião da DigiTarot.',
  avaliacao: { media: 5, total: 0 },
  modalidades: Object.fromEntries(categories.flatMap((categoria) => categoria.plans.map((plano) => [plano.id, plano.price]))),
  ativo: true,
}
