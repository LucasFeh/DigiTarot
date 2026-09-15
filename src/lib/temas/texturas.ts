import * as THREE from 'three'
import { ouvirTemaApagado } from './canal'
import { repoTemas } from './index'
import { svgFrente, svgPano, svgVerso } from './svgCarta'
import type { ChaveArte } from './tipos'

/**
 * O REGISTRO. Único dono de `THREE.Texture` no projeto.
 *
 * Existe por um motivo bem concreto: textura não é lixo coletável. O GC
 * recolhe o objeto JavaScript, mas o buffer na GPU só sai com `dispose()`
 * explícito. Antes disto, cada `CartaMesa` criava o próprio verso — dez
 * texturas idênticas numa Cruz Celta — e nenhuma era descartada ao trocar de
 * layout ou sair da sala.
 *
 * O empréstimo é por contagem de referência, com carência: soltar não descarta
 * na hora. Sem a carência, trocar de spread (desmonta tudo, remonta tudo no
 * mesmo quadro) jogaria fora e recriaria a mesma textura, e o <StrictMode> do
 * React 19 — que está ligado em main.tsx — faria isso em TODA montagem em dev.
 */

/** Maior que dois passos do desfile da prévia, e cobre o monta-desmonta-monta
 *  do StrictMode. */
const CARENCIA_MS = 8000
/** ~2,4 MiB cada com mipmaps: 16 é ~38 MiB de VRAM. Uma Cruz Celta cheia usa
 *  10 cartas + verso + pano. */
const TETO = 16

export type Emprestimo = { tex: THREE.Texture; soltar: () => void }

type Entrada = {
  tex: THREE.Texture
  contagem: number
  /** Timestamp do último soltar que zerou a contagem. */
  ocioso: number
  promessa: Promise<THREE.Texture> | null
  /**
   * O tema foi apagado enquanto alguém ainda desenhava com esta textura. Ela
   * sai do mapa na hora (ninguém mais a pega), mas só é destruída quando o
   * último empréstimo for devolvido.
   */
  condenada?: boolean
}

const vivas = new Map<string, Entrada>()
/** Fora do catálogo, mas ainda desenhando. Some quando o último soltar chegar. */
const condenadas = new Map<string, Entrada>()

/** Carrega um data URI de SVG. O TextureLoader resolve sozinho. */
function deUri(uri: string, girar: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      uri,
      (t) => resolve(ajustar(t, girar)),
      undefined,
      () => reject(new Error('Falha ao carregar textura.')),
    )
  })
}

/** Carrega os bytes de um tema. */
async function deBlob(blob: Blob, girar: boolean): Promise<THREE.Texture> {
  const bmp = await createImageBitmap(blob, {
    // O flip acontece aqui, no decodificador, e não no upload.
    imageOrientation: 'flipY',
    premultiplyAlpha: 'none',
  })
  const tex = new THREE.CanvasTexture(bmp)
  // Dito explicitamente porque o three PULA o UNPACK_FLIP_Y_WEBGL quando a
  // fonte é ImageBitmap (WebGLTextures, r186). Se um dia ele parar de pular,
  // esta linha mantém a arte no lugar em vez de espelhá-la na vertical.
  tex.flipY = false
  return ajustar(tex, girar)
}

function ajustar(tex: THREE.Texture, girar: boolean): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (girar) {
    // Revelar é virar a carta 180° sobre o eixo X, o que deixaria a arte de
    // cabeça para baixo. Girar a própria textura devolve a leitura certa.
    tex.center.set(0.5, 0.5)
    tex.rotation = Math.PI
  }
  tex.needsUpdate = true
  return tex
}

function adquirirChave(chave: string, carregar: () => Promise<THREE.Texture>) {
  const existente = vivas.get(chave)
  if (existente) {
    existente.contagem++
    existente.ocioso = 0
    return existente
  }
  const entrada: Entrada = { tex: null as unknown as THREE.Texture, contagem: 1, ocioso: 0, promessa: null }
  entrada.promessa = carregar()
    .then((t) => {
      entrada.tex = t
      entrada.promessa = null
      return t
    })
    .catch((e) => {
      // Sem isto a chave fica envenenada: a entrada permanece no mapa com
      // `tex` indefinido e `promessa` nula, e toda tentativa seguinte devolve
      // textura vazia sem nunca tentar carregar de novo.
      vivas.delete(chave)
      throw e
    })
  vivas.set(chave, entrada)
  return entrada
}

function emprestar(chave: string, tex: THREE.Texture): Emprestimo {
  let solto = false
  return {
    tex,
    soltar: () => {
      // Sem esta guarda, um `soltar` chamado duas vezes (efeito que roda de
      // novo, StrictMode) derrubaria a contagem de quem ainda está usando.
      if (solto) return
      solto = true
      const e = condenadas.get(chave) ?? vivas.get(chave)
      if (!e) return
      e.contagem--
      if (e.contagem > 0) return
      e.contagem = 0
      if (e.condenada) {
        // Último a soltar apaga a luz: agora sim dá para chamar dispose(),
        // porque nenhum material aponta mais para esta textura.
        condenadas.delete(chave)
        liberar(e)
        return
      }
      e.ocioso = performance.now()
    },
  }
}

/** Descarta o que está ocioso há mais que a carência, e o excedente do teto. */
function podar() {
  const agora = performance.now()
  const ociosas = [...vivas.entries()].filter(([, e]) => e.contagem === 0 && e.ocioso > 0)

  for (const [chave, e] of ociosas) {
    if (agora - e.ocioso > CARENCIA_MS) descartar(chave, e)
  }
  // Acima do teto, as mais antigas saem mesmo dentro da carência: melhor
  // recarregar uma textura do que estourar a VRAM de uma placa integrada.
  if (vivas.size > TETO) {
    const sobra = [...vivas.entries()]
      .filter(([, e]) => e.contagem === 0)
      .sort((a, b) => a[1].ocioso - b[1].ocioso)
      .slice(0, vivas.size - TETO)
    for (const [chave, e] of sobra) descartar(chave, e)
  }
}

function descartar(chave: string, e: Entrada) {
  vivas.delete(chave)
  liberar(e)
}

/** Devolve de verdade a memória. Só chame quando a contagem for zero. */
function liberar(e: Entrada) {
  const img = e.tex?.image as ImageBitmap | undefined
  e.tex?.dispose()
  // O ImageBitmap tem memória própria, fora da textura. `close` é o que a solta.
  img?.close?.()
}

/** Arte desenhada: verso, frente de uma carta, ou um pano embutido. */
export async function adquirirSvg(
  chave: 'verso' | `carta:${string}` | `pano:${string}`,
): Promise<Emprestimo> {
  const entrada = adquirirChave(chave, () => {
    if (chave === 'verso') return deUri(svgVerso(), false)
    if (chave.startsWith('carta:')) return deUri(svgFrente(chave.slice(6)), true)
    return deUri(svgPano(chave.slice(5)), false)
  })
  const tex = entrada.tex ?? (await entrada.promessa!)
  podar()
  return emprestar(chave, tex)
}

/**
 * Arte de um tema. Devolve `null` quando este navegador não tem a imagem — é
 * o caso de um tema criado em outro dispositivo, e quem chama cai no SVG.
 */
export async function adquirirArte(temaId: string, chave: ChaveArte): Promise<Emprestimo | null> {
  const k = `arte:${temaId}|${chave}`
  const existente = vivas.get(k)
  if (existente) {
    existente.contagem++
    existente.ocioso = 0
    const tex = existente.tex ?? (await existente.promessa!)
    return emprestar(k, tex)
  }

  const blob = await repoTemas().imagem(temaId, chave)
  if (!blob) return null

  const girar = chave !== 'fundo' && chave !== 'mini'
  const entrada = adquirirChave(k, () => deBlob(blob, girar))
  const tex = entrada.tex ?? (await entrada.promessa!)
  podar()
  return emprestar(k, tex)
}

/**
 * Tema apagado: derruba as texturas dele agora, sem esperar a carência.
 *
 * Assinado no canal já na carga do módulo — assim vale também quando o tema é
 * apagado em OUTRA aba, e nenhuma tela precisa lembrar de chamar isto.
 */
export function descartarTema(temaId: string) {
  for (const [chave, e] of [...vivas.entries()]) {
    if (!chave.startsWith(`arte:${temaId}|`)) continue
    vivas.delete(chave)
    if (e.contagem > 0) {
      // Em uso AGORA. Destruir aqui faria `dispose()` e `ImageBitmap.close()`
      // debaixo de um material que ainda aponta para ela — a carta ficaria
      // preta ou o WebGL cuspiria erro de textura inválida. Fica condenada.
      e.condenada = true
      condenadas.set(chave, e)
      continue
    }
    liberar(e)
  }
}

/** Diagnóstico: quantas texturas estão vivas e quanto ocupam, aproximadamente. */
export function estatisticas() {
  let mib = 0
  for (const e of vivas.values()) {
    const img = e.tex?.image as { width?: number; height?: number } | undefined
    // 4 bytes por texel, mais um terço de mipmaps.
    if (img?.width && img?.height) mib += (img.width * img.height * 4 * 1.33) / 1048576
  }
  return { vivas: vivas.size, mib: Math.round(mib * 10) / 10 }
}

ouvirTemaApagado(descartarTema)
