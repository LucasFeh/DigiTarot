import type { ImagemGuardada, ProgressoEnvio } from './tipos'

/**
 * O processamento do pixel, uma vez só, no ENVIO. O que o IndexedDB guarda já é
 * a textura final: o 3D só faz upload, nunca redimensiona.
 *
 * Nada aqui usa Worker nem OffscreenCanvas de propósito. O envio já é uma tela
 * dedicada com barra de progresso e botão de cancelar, e o OffscreenCanvas só
 * existe no Safari a partir da 16.4 — que é justamente onde o teto de memória
 * por aba é mais baixo. Se o congelamento aparecer de verdade, este pipeline
 * cabe dentro de um worker sem mudar assinatura nenhuma.
 */

/** Tamanhos finais. 512/870 = 0,5885 contra os 0,4/0,68 = 0,5882 da carta 3D. */
export const ALVO = {
  carta: { l: 512, a: 870 },
  pano: { l: 1024, a: 1024 },
  mini: { l: 128, a: 218 },
} as const

export type Medida = { l: number; a: number }

/**
 * Fundo das bordas quando a imagem não preenche o alvo. Opaco de propósito: o
 * material da carta não é `transparent`, e alfa 0 vira PRETO na GPU.
 */
const FUNDO = '#1b0d42'

/** Um arquivo que o navegador não conseguiu decodificar (HEIC de iPhone, etc.). */
export class ErroDeImagem extends Error {}

function tela(l: number, a: number) {
  const c = document.createElement('canvas')
  c.width = l
  c.height = a
  const g = c.getContext('2d')
  if (!g) throw new ErroDeImagem('Sem contexto 2D neste navegador.')
  return { c, g }
}

/** Libera o bitmap da tela intermediária. Sem isto a memória só sai no GC. */
function soltar(c: HTMLCanvasElement) {
  c.width = 0
  c.height = 0
}

/**
 * Reamostra por METADES até chegar perto do alvo.
 *
 * Um `drawImage` único de 4000×7000 para 512×870 faz o navegador amostrar 1 em
 * cada 8 pixels, e o resultado serrilha. Reduzir pela metade de cada vez faz
 * cada passo ler todos os pixels do anterior, o que é a média correta e sai
 * mais bonito — e, de quebra, mantém cada tela intermediária pequena.
 */
function reduzirPorMetades(fonte: CanvasImageSource, lo: number, ao: number, lAlvo: number, aAlvo: number) {
  let l = lo
  let a = ao
  let atual: HTMLCanvasElement | null = null

  while (l / 2 >= lAlvo && a / 2 >= aAlvo) {
    const nl = Math.max(1, Math.floor(l / 2))
    const na = Math.max(1, Math.floor(a / 2))
    const { c, g } = tela(nl, na)
    g.drawImage(atual ?? fonte, 0, 0, l, a, 0, 0, nl, na)
    if (atual) soltar(atual)
    atual = c
    l = nl
    a = na
  }
  return { fonte: (atual ?? fonte) as CanvasImageSource, l, a, intermediaria: atual }
}

async function codificar(c: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', qualidade))
  // O Safari antigo ignora o tipo pedido e devolve PNG calado, que para uma
  // foto fica muitas vezes maior. O fundo já é opaco, então perder o alfa no
  // JPEG não custa nada.
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.86))
  if (jpeg) return jpeg
  if (webp) return webp
  throw new ErroDeImagem('Não foi possível codificar a imagem.')
}

/**
 * Decodifica, reamostra e recorta um arquivo no tamanho final.
 *
 * O recorte é "cover" centralizado: a imagem cobre o alvo inteiro e o que
 * sobra é cortado igualmente dos dois lados. Encaixar com barras deixaria uma
 * moldura roxa em volta da arte de quem mandou uma foto quadrada, e esticar
 * deformaria o rosto das cartas — cortar é o menos ruim dos três.
 */
export async function prepararArquivo(
  arquivo: Blob,
  alvo: Medida,
  qualidade = 0.86,
): Promise<Omit<ImagemGuardada, 'id'>> {
  let bmp: ImageBitmap
  try {
    // `from-image` respeita o EXIF: foto de celular deitada chegaria girada.
    bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch (e) {
    throw new ErroDeImagem(e instanceof Error ? e.message : 'Arquivo de imagem ilegível.')
  }

  let intermediaria: HTMLCanvasElement | null = null
  try {
    const reduzido = reduzirPorMetades(bmp, bmp.width, bmp.height, alvo.l, alvo.a)
    intermediaria = reduzido.intermediaria

    const { c, g } = tela(alvo.l, alvo.a)
    g.fillStyle = FUNDO
    g.fillRect(0, 0, alvo.l, alvo.a)

    // cover: a maior escala que ainda cobre os dois lados.
    const escala = Math.max(alvo.l / reduzido.l, alvo.a / reduzido.a)
    const dl = reduzido.l * escala
    const da = reduzido.a * escala
    g.imageSmoothingQuality = 'high'
    g.drawImage(reduzido.fonte, (alvo.l - dl) / 2, (alvo.a - da) / 2, dl, da)

    const blob = await codificar(c, qualidade)
    soltar(c)
    return { blob, largura: alvo.l, altura: alvo.a, bytes: blob.size }
  } finally {
    // Um JPEG de 4000×7000 é ~112 MB de bitmap vivo: fechar não é opcional.
    bmp.close()
    if (intermediaria) soltar(intermediaria)
  }
}

/** Cor média de uma imagem, por redução a 1×1. Pinta o card antes da textura subir. */
export async function corMedia(blob: Blob): Promise<string> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(blob)
  } catch {
    return FUNDO
  }
  try {
    const { c, g } = tela(1, 1)
    g.drawImage(bmp, 0, 0, 1, 1)
    const [r, v, b] = g.getImageData(0, 0, 1, 1).data
    soltar(c)
    return `#${[r, v, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return FUNDO
  } finally {
    bmp.close()
  }
}

export type Preparada = { cheia: Omit<ImagemGuardada, 'id'>; mini: Omit<ImagemGuardada, 'id'> }

/**
 * Prepara um lote inteiro, UM ARQUIVO POR VEZ.
 *
 * Serial não é preguiça: `Promise.all` sobre 78 arquivos de celular pediria
 * vários gigabytes de bitmap simultâneo e derrubaria a aba. Em série, o pico é
 * o de uma imagem só.
 */
export async function prepararLote(
  arquivos: { chave: string; rotulo: string; file: Blob }[],
  alvo: Medida,
  onProgresso?: (p: ProgressoEnvio) => void,
  sinal?: AbortSignal,
): Promise<Map<string, Preparada | { erro: string }>> {
  const out = new Map<string, Preparada | { erro: string }>()
  const total = arquivos.length
  const mini: Medida = { l: ALVO.mini.l, a: Math.round((ALVO.mini.l * alvo.a) / alvo.l) }

  for (let i = 0; i < total; i++) {
    if (sinal?.aborted) break
    const a = arquivos[i]
    onProgresso?.({ feitas: i, total, atual: a.rotulo })
    try {
      const cheia = await prepararArquivo(a.file, alvo)
      // A miniatura sai da CHEIA, não do original: o arquivo grande já foi
      // decodificado e descartado, e reabri-lo dobraria o custo do lote.
      const m = await prepararArquivo(cheia.blob, mini, 0.72)
      out.set(a.chave, { cheia, mini: m })
    } catch (e) {
      out.set(a.chave, { erro: e instanceof Error ? e.message : 'Falhou ao ler a imagem.' })
    }
  }
  onProgresso?.({ feitas: total, total, atual: '' })
  return out
}
