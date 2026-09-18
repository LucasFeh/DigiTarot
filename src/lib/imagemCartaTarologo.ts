type Tipo = 'foto' | 'chibi'

/** Mantém as duas imagens pequenas o bastante para caber no documento do Firestore. */
export async function prepararImagemCarta(arquivo: File, tipo: Tipo): Promise<string> {
  if (arquivo.size > 10 * 1024 * 1024) throw new Error('Escolha uma imagem de até 10 MB.')
  if (tipo === 'chibi' ? arquivo.type !== 'image/png' : !['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
    throw new Error(tipo === 'chibi' ? 'O chibi precisa ser um arquivo PNG.' : 'Use uma foto JPG, PNG ou WebP.')
  }

  const imagem = await createImageBitmap(arquivo)
  try {
    const tamanhos = tipo === 'chibi' ? [620, 520, 430, 350] : [720, 600, 500]
    const limite = tipo === 'chibi' ? 320_000 : 260_000
    for (const largura of tamanhos) {
      const altura = tipo === 'chibi' ? Math.round(largura * 1.1) : Math.round(largura * 1.38)
      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      const contexto = canvas.getContext('2d')
      if (!contexto) throw new Error('O navegador não conseguiu preparar a imagem.')

      if (tipo === 'foto') {
        contexto.fillStyle = '#211631'
        contexto.fillRect(0, 0, largura, altura)
      }
      const escala = tipo === 'chibi'
        ? Math.min(largura / imagem.width, altura / imagem.height)
        : Math.max(largura / imagem.width, altura / imagem.height)
      const w = imagem.width * escala
      const h = imagem.height * escala
      contexto.drawImage(imagem, (largura - w) / 2, (altura - h) / 2, w, h)

      const resultado = canvas.toDataURL(tipo === 'chibi' ? 'image/png' : 'image/jpeg', 0.82)
      if (resultado.length <= limite) return resultado
    }
    throw new Error('A imagem ficou grande demais. Tente um arquivo mais simples.')
  } finally {
    imagem.close()
  }
}
