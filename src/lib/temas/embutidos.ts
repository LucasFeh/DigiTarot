import { CARDS } from '../../data/cards'
import { PANOS, panoDataUri } from '../../data/panos'
import type { ChaveArte, Tema, TemaPano } from './tipos'

/**
 * Temas que vêm com o site.
 *
 * Eles atravessam o sistema como qualquer outro `Tema` — a diferença está só
 * em de onde saem os bytes, que é o que `blobEmbutido` resolve. Por isso
 * nenhuma tela precisa saber que eles existem: a grade, o seletor, a prévia em
 * 3D e a mesa tratam todos igual.
 *
 * `import.meta.env.BASE_URL` e não um caminho absoluto: no GitHub Pages o site
 * mora em /DigiTarot/, e uma barra no começo apontaria para a raiz do
 * domínio (ver a `base` em vite.config.ts).
 */
const RAIZ = `${import.meta.env.BASE_URL}baralhos`

export const RIDER_WAITE: Tema = {
  id: 'embutido-rider-waite',
  tipo: 'baralho',
  nome: 'Rider-Waite',
  autorUid: 'sistema',
  autorNome: 'Pamela Colman Smith, 1909',
  criadoEm: '1909-12-01T00:00:00.000Z',
  bytes: 5_700_000,
  cartas: CARDS.map((c) => c.id),
  // O verso não faz parte da digitalização — cai no desenhado do site.
  temVerso: false,
  base: `${RAIZ}/rider-waite`,
}

/** O baralho com que a mesa nasce quando ninguém escolheu nada. */
export const BARALHO_PADRAO = RIDER_WAITE.id

const PREFIXO_PANO = 'embutido-pano-'

/**
 * Os panos desenhados do site, promovidos a tema.
 *
 * Antes eles viviam numa fileira de pastilhas à parte, o que obrigava cada
 * tela a tratar "pano embutido" e "pano do acervo" como duas coisas. Virando
 * tema, eles entram na mesma grade, podem ser definidos como padrão e podem
 * ser favoritados — sem nenhum caso especial nas telas.
 */
export const PANOS_EMBUTIDOS: readonly TemaPano[] = PANOS.map((p) => ({
  id: `${PREFIXO_PANO}${p.id}`,
  tipo: 'pano',
  nome: p.nome,
  autorUid: 'sistema',
  autorNome: 'Arte do site',
  criadoEm: '2000-01-01T00:00:00.000Z',
  bytes: 0,
  cor: p.cor,
}))

export const EMBUTIDOS: readonly Tema[] = [RIDER_WAITE, ...PANOS_EMBUTIDOS]

export const EMBUTIDO_POR_ID = new Map(EMBUTIDOS.map((t) => [t.id, t]))

export function ehEmbutido(id: string): boolean {
  return EMBUTIDO_POR_ID.has(id)
}

/**
 * `embutido-pano-lua` -> `lua`, o id cru em `data/panos`. Null para tudo o
 * mais.
 *
 * Existe porque os panos embutidos são SVG, e SVG precisa seguir pelo caminho
 * do `TextureLoader` (data URI), não pelo de `createImageBitmap`: passar um
 * blob de SVG para `createImageBitmap` só funciona quando o documento tem
 * dimensões intrínsecas, e historicamente falha no Firefox.
 */
export function panoEmbutidoIdDe(temaId: string): string | null {
  return temaId.startsWith(PREFIXO_PANO) ? temaId.slice(PREFIXO_PANO.length) : null
}

/** `embutido-pano-lua` -> o `Pano` de `data/panos`. */
function panoDe(temaId: string) {
  const id = temaId.slice(PREFIXO_PANO.length)
  return PANOS.find((p) => p.id === id) ?? PANOS[0]
}

/**
 * Os bytes de uma arte embutida.
 *
 * Duas origens: o baralho vem de arquivos em `public/` (buscados por `fetch`,
 * e o navegador cuida do cache), e os panos são SVG gerado em código — nesses
 * o "arquivo" é montado na hora, sem rede nenhuma.
 */
export async function blobEmbutido(tema: Tema, chave: ChaveArte): Promise<Blob | null> {
  if (tema.id.startsWith(PREFIXO_PANO)) {
    const uri = panoDataUri(panoDe(tema.id))
    // `data:image/svg+xml,<texto>` — o corpo está percent-encoded, não base64.
    const corpo = decodeURIComponent(uri.slice(uri.indexOf(',') + 1))
    return new Blob([corpo], { type: 'image/svg+xml' })
  }
  if (!tema.base) return null
  try {
    const r = await fetch(`${tema.base}/${chave}.webp`)
    return r.ok ? await r.blob() : null
  } catch {
    return null
  }
}
