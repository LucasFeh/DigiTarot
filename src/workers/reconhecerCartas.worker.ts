import cvModule from '@techstark/opencv-js'

type Referencia = { id: string; url?: string; blob?: Blob }
type Modelo = { id: string; pontos: InstanceType<typeof cvModule.KeyPointVector>; descritores: InstanceType<typeof cvModule.Mat> }
type Deteccao = { cardId: string; x: number; y: number; invertida: boolean; pontos: number }

let cv!: Awaited<typeof cvModule>
let orb!: InstanceType<typeof cvModule.ORB>
let comparador!: InstanceType<typeof cvModule.BFMatcher>
const pronto = Promise.resolve(cvModule).then((modulo) => {
  cv = modulo
  orb = new cv.ORB(650)
  comparador = new cv.BFMatcher(cv.NORM_HAMMING)
})
const modelos: Modelo[] = []

function limpar() {
  for (const modelo of modelos) {
    modelo.pontos.delete()
    modelo.descritores.delete()
  }
  modelos.length = 0
}

function pontosDaImagem(dados: ImageData) {
  const cor = cv.matFromImageData(dados)
  const cinza = new cv.Mat()
  const pontos = new cv.KeyPointVector()
  const descritores = new cv.Mat()
  const mascara = new cv.Mat()
  try {
    cv.cvtColor(cor, cinza, cv.COLOR_RGBA2GRAY)
    orb.detectAndCompute(cinza, mascara, pontos, descritores)
    return { pontos, descritores }
  } finally {
    cor.delete()
    cinza.delete()
    mascara.delete()
  }
}

async function preparar(referencias: Referencia[]) {
  limpar()
  const canvas = new OffscreenCanvas(256, 384)
  const contexto = canvas.getContext('2d', { willReadFrequently: true })
  if (!contexto) throw new Error('Este navegador não oferece processamento de imagem fora da tela.')
  let carregadas = 0
  let examinadas = 0
  for (const referencia of referencias) {
    try {
      const blob = referencia.blob ?? await fetch(referencia.url!).then((resposta) => {
        if (!resposta.ok) throw new Error('Imagem indisponível')
        return resposta.blob()
      })
      if (!blob) continue
      const bitmap = await createImageBitmap(blob)
      contexto.clearRect(0, 0, 256, 384)
      contexto.drawImage(bitmap, 0, 0, 256, 384)
      bitmap.close()
      const modelo = pontosDaImagem(contexto.getImageData(0, 0, 256, 384))
      if (modelo.descritores.rows >= 10) {
        modelos.push({ id: referencia.id, ...modelo })
        carregadas++
      } else {
        modelo.pontos.delete()
        modelo.descritores.delete()
      }
    } catch {
      // Uma arte ausente não impede reconhecer as outras cartas do baralho.
    }
    examinadas++
    if (examinadas % 12 === 0) self.postMessage({ tipo: 'progresso', carregadas, total: referencias.length })
  }
  self.postMessage({ tipo: 'pronto', carregadas, total: referencias.length })
}

function area(pontos: { x: number; y: number }[]) {
  let soma = 0
  for (let i = 0; i < pontos.length; i++) {
    const seguinte = pontos[(i + 1) % pontos.length]
    soma += pontos[i].x * seguinte.y - seguinte.x * pontos[i].y
  }
  return Math.abs(soma) / 2
}

function analisar(dados: ImageData): Deteccao[] {
  const quadro = pontosDaImagem(dados)
  const resultados: Deteccao[] = []
  try {
    if (quadro.descritores.rows < 12) return []
    for (const modelo of modelos) {
      const pares = new cv.DMatchVectorVector()
      const origem: number[] = []
      const destino: number[] = []
      try {
        comparador.knnMatch(modelo.descritores, quadro.descritores, pares, 2)
        for (let i = 0; i < pares.size(); i++) {
          const dois = pares.get(i)
          try {
            if (dois.size() < 2) continue
            const primeiro = dois.get(0)
            const segundo = dois.get(1)
            if (primeiro.distance >= segundo.distance * 0.76) continue
            const p = modelo.pontos.get(primeiro.queryIdx).pt
            const q = quadro.pontos.get(primeiro.trainIdx).pt
            origem.push(p.x, p.y)
            destino.push(q.x, q.y)
          } finally {
            dois.delete()
          }
        }
      } finally {
        pares.delete()
      }
      if (origem.length < 20) continue
      const pOrigem = cv.matFromArray(origem.length / 2, 1, cv.CV_32FC2, origem)
      const pDestino = cv.matFromArray(destino.length / 2, 1, cv.CV_32FC2, destino)
      const mascara = new cv.Mat()
      const cantos = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 256, 0, 256, 384, 0, 384])
      const projetados = new cv.Mat()
      let homografia: InstanceType<typeof cv.Mat> | null = null
      try {
        homografia = cv.findHomography(pOrigem, pDestino, cv.RANSAC, 4, mascara)
        if (homografia.empty()) continue
        const confirmados = Array.from(mascara.data).filter(Boolean).length
        if (confirmados < 9 || confirmados / (origem.length / 2) < 0.48) continue
        cv.perspectiveTransform(cantos, projetados, homografia)
        const xy = Array.from(projetados.data32F)
        const p = Array.from({ length: 4 }, (_, i) => ({ x: xy[i * 2], y: xy[i * 2 + 1] }))
        if (p.some((c) => !Number.isFinite(c.x) || !Number.isFinite(c.y))) continue
        const tamanho = area(p) / (dados.width * dados.height)
        if (tamanho < 0.004 || tamanho > 0.65) continue
        const x = p.reduce((s, c) => s + c.x, 0) / 4 / dados.width
        const y = p.reduce((s, c) => s + c.y, 0) / 4 / dados.height
        if (x < 0 || x > 1 || y < 0 || y > 1) continue
        const topo = (p[0].y + p[1].y) / 2
        const base = (p[2].y + p[3].y) / 2
        if (Math.abs(base - topo) < Math.sqrt(area(p)) * 0.3) continue
        resultados.push({ cardId: modelo.id, x, y, invertida: base < topo, pontos: confirmados })
      } finally {
        pOrigem.delete()
        pDestino.delete()
        mascara.delete()
        cantos.delete()
        projetados.delete()
        homografia?.delete()
      }
    }
  } finally {
    quadro.pontos.delete()
    quadro.descritores.delete()
  }
  resultados.sort((a, b) => b.pontos - a.pontos)
  const distintos: Deteccao[] = []
  for (const candidato of resultados) {
    if (distintos.some((d) => Math.hypot(d.x - candidato.x, d.y - candidato.y) < 0.12)) continue
    distintos.push(candidato)
    if (distintos.length === 10) break
  }
  return distintos
}

self.onmessage = (evento: MessageEvent<{ tipo: 'iniciar'; referencias: Referencia[] } | { tipo: 'quadro'; largura: number; altura: number; pixels: ArrayBuffer }>) => {
  const mensagem = evento.data
  if (mensagem.tipo === 'iniciar') {
    void pronto.then(() => preparar(mensagem.referencias))
      .catch((erro) => self.postMessage({ tipo: 'erro', mensagem: String(erro) }))
    return
  }
  void pronto.then(() => {
    const dados = new ImageData(new Uint8ClampedArray(mensagem.pixels), mensagem.largura, mensagem.altura)
    self.postMessage({ tipo: 'resultado', deteccoes: analisar(dados) })
  }).catch((erro) => self.postMessage({ tipo: 'erro', mensagem: String(erro) }))
}
