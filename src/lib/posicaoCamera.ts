export type DirecaoAjuste = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type QuadroCamera = { x: number; y: number; largura: number }

const limitar = (valor: number, minimo: number, maximo: number) => Math.max(minimo, Math.min(maximo, valor))

/** Mantém a imagem inteira no quadro, inclusive quando a câmera está na vertical. */
export function limitarQuadro(quadro: QuadroCamera, area: { largura: number; altura: number }, proporcao: number): QuadroCamera {
  if (!area.largura || !area.altura || !proporcao) return quadro
  const maximo = Math.max(12, Math.min(85, (area.altura - 16) * proporcao / area.largura * 100))
  const largura = limitar(quadro.largura, Math.min(18, maximo), maximo)
  const altura = area.largura * largura / proporcao / area.altura
  return {
    x: limitar(quadro.x, 0, 100 - largura),
    y: limitar(quadro.y, 0, 100 - altura),
    largura,
  }
}

/** Oito alças, mas uma única proporção: redimensionar nunca corta a câmera. */
export function redimensionarQuadro(
  inicial: QuadroCamera,
  direcao: DirecaoAjuste,
  dx: number,
  dy: number,
  area: { largura: number; altura: number },
  proporcao: number,
): QuadroCamera {
  const atual = limitarQuadro(inicial, area, proporcao)
  const larguraPx = atual.largura / 100 * area.largura
  const alturaPx = larguraPx / proporcao
  const porHorizontal = larguraPx + (direcao.includes('e') ? dx : direcao.includes('w') ? -dx : 0)
  const porVertical = (alturaPx + (direcao.includes('s') ? dy : direcao.includes('n') ? -dy : 0)) * proporcao
  const larguraDesejada = direcao.length === 2
    ? (Math.abs(porHorizontal - larguraPx) >= Math.abs(porVertical - larguraPx) ? porHorizontal : porVertical)
    : (direcao === 'e' || direcao === 'w' ? porHorizontal : porVertical)
  const ajustado = limitarQuadro({ ...atual, largura: larguraDesejada / area.largura * 100 }, area, proporcao)
  const anteriorAltura = alturaPx / area.altura * 100
  const novaAltura = area.largura * ajustado.largura / proporcao / area.altura
  const x = direcao.includes('w') ? atual.x + atual.largura - ajustado.largura
    : direcao.includes('e') ? atual.x
      : atual.x + (atual.largura - ajustado.largura) / 2
  const y = direcao.includes('n') ? atual.y + anteriorAltura - novaAltura
    : direcao.includes('s') ? atual.y
      : atual.y + (anteriorAltura - novaAltura) / 2
  return limitarQuadro({ x, y, largura: ajustado.largura }, area, proporcao)
}
