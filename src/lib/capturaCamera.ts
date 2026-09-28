/** Detecta a orientação que o navegador está exibindo. */
export function cameraEmPaisagem(): boolean {
  return window.matchMedia('(orientation: landscape)').matches
}

export function restricoesCamera(forcarPaisagem = false): MediaTrackConstraints {
  const paisagem = forcarPaisagem || cameraEmPaisagem()
  return {
    facingMode: { ideal: 'environment' },
    width: { ideal: paisagem ? 1280 : 720 },
    height: { ideal: paisagem ? 720 : 1280 },
    aspectRatio: forcarPaisagem ? { min: 1.2, ideal: 16 / 9 } : { ideal: paisagem ? 16 / 9 : 9 / 16 },
    // Evita cortar a imagem em navegadores que implementam esta restrição.
    resizeMode: { ideal: 'none' },
  } as MediaTrackConstraints
}
