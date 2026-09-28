/** A câmera acompanha a orientação atual sem travar a tela do aplicativo. */
export function cameraEmPaisagem(): boolean {
  return window.matchMedia('(orientation: landscape)').matches
}

export function restricoesCamera(): MediaTrackConstraints {
  const paisagem = cameraEmPaisagem()
  return {
    facingMode: { ideal: 'environment' },
    width: { ideal: paisagem ? 1280 : 720 },
    height: { ideal: paisagem ? 720 : 1280 },
    aspectRatio: { ideal: paisagem ? 16 / 9 : 9 / 16 },
    // Evita cortar a imagem em navegadores que implementam esta restrição.
    resizeMode: { ideal: 'none' },
  } as MediaTrackConstraints
}
