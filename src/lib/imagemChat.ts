/**
 * Prepara uma foto para ser enviada no chat da mesa.
 *
 * Não reaproveita `prepararArquivo` de `lib/temas/imagens.ts` porque aquele
 * recorta em "cover" num tamanho fixo — o certo para a arte de uma carta, e
 * errado para uma foto: uma imagem em pé chegaria cortada em cima e embaixo, e
 * uma quadrada ganharia faixas roxas. Aqui a imagem ENCAIXA na caixa máxima e
 * mantém a proporção que tinha.
 *
 * O resultado é uma data URL guardada dentro da própria mensagem. Não há
 * Firebase Storage neste projeto — e o convidado de sessão particular não tem
 * conta, então dar a ele permissão de escrita num bucket seria abrir um
 * depósito público. Em compensação, o documento do Firestore para em 1 MiB, e é
 * daí que vem o teto abaixo: a imagem é reduzida até caber com folga.
 */

/** Maior lado da imagem enviada. Acima disto ninguém percebe num chat. */
const LADO_MAX = 1280

/**
 * Teto da data URL, em caracteres.
 *
 * O documento inteiro do Firestore não pode passar de 1 MiB, e nele ainda cabem
 * nome, autor, texto e os nomes dos campos. 700 mil deixa margem confortável —
 * e uma foto de 1280px em WebP costuma sair em menos de um terço disso.
 */
const LIMITE = 700_000

/** Tentativas em ordem decrescente: cada uma cede um pouco mais de qualidade. */
const TENTATIVAS = [
  { lado: LADO_MAX, qualidade: 0.72 },
  { lado: 1024, qualidade: 0.66 },
  { lado: 800, qualidade: 0.6 },
  { lado: 640, qualidade: 0.55 },
]

export class ErroDeImagem extends Error {}

function tela(l: number, a: number) {
  const c = document.createElement('canvas')
  c.width = l
  c.height = a
  const g = c.getContext('2d')
  if (!g) throw new ErroDeImagem('Este navegador não conseguiu preparar a imagem.')
  return { c, g }
}

/** Libera a memória do canvas — um bitmap grande não some sozinho a tempo. */
function soltar(c: HTMLCanvasElement) {
  c.width = 0
  c.height = 0
}

async function paraDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(new ErroDeImagem('Não foi possível ler a imagem.'))
    leitor.readAsDataURL(blob)
  })
}

async function codificar(c: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', qualidade))
  // Safari antigo ignora o tipo pedido e devolve PNG calado, que para uma foto
  // fica muitas vezes maior. O JPEG é o plano B.
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', qualidade))
  if (jpeg) return jpeg
  if (webp) return webp
  throw new ErroDeImagem('Não foi possível codificar a imagem.')
}

/**
 * Decodifica o arquivo, reduz até caber no limite e devolve a data URL.
 *
 * Reduzir por metades antes do desenho final não é capricho: o `drawImage` de
 * uma foto de 4000px direto para 1280px serrilha, porque o filtro do canvas
 * só olha poucos pixels vizinhos. Cada metade preserva a informação da
 * anterior, e o resultado sai liso.
 */
export async function prepararImagemDoChat(arquivo: Blob): Promise<string> {
  if (!arquivo.type.startsWith('image/')) {
    throw new ErroDeImagem('Esse arquivo não é uma imagem.')
  }

  let bmp: ImageBitmap
  try {
    // `from-image` respeita o EXIF: foto de celular deitada chegaria girada.
    bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErroDeImagem('Não foi possível abrir essa imagem. Tente outro formato.')
  }

  try {
    for (const { lado, qualidade } of TENTATIVAS) {
      const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height))
      const alvoL = Math.max(1, Math.round(bmp.width * escala))
      const alvoA = Math.max(1, Math.round(bmp.height * escala))

      // Reduz pela metade enquanto ainda couber outra metade.
      let fonte: CanvasImageSource = bmp
      let l = bmp.width
      let a = bmp.height
      let passo: HTMLCanvasElement | null = null
      while (l / 2 >= alvoL && a / 2 >= alvoA) {
        const nl = Math.max(1, Math.floor(l / 2))
        const na = Math.max(1, Math.floor(a / 2))
        const { c, g } = tela(nl, na)
        g.imageSmoothingQuality = 'high'
        g.drawImage(fonte, 0, 0, l, a, 0, 0, nl, na)
        if (passo) soltar(passo)
        passo = c
        fonte = c
        l = nl
        a = na
      }

      const { c, g } = tela(alvoL, alvoA)
      g.imageSmoothingQuality = 'high'
      g.drawImage(fonte, 0, 0, l, a, 0, 0, alvoL, alvoA)
      if (passo) soltar(passo)

      const blob = await codificar(c, qualidade)
      soltar(c)

      const url = await paraDataUrl(blob)
      if (url.length <= LIMITE) return url
    }

    throw new ErroDeImagem(
      'Essa imagem é pesada demais mesmo depois de reduzida. Tente recortá-la antes de enviar.',
    )
  } finally {
    // Um JPEG de 4000×7000 é ~112 MB de bitmap vivo: fechar não é opcional.
    bmp.close()
  }
}
