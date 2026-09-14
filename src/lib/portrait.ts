import type { CSSProperties } from 'react'

/**
 * Duas rampas de transparência cruzadas: a de baixo dissolve a mesa e as
 * laterais cortam as bordas retas do recorte, para a ilustração se fundir com a
 * nebulosa em vez de parecer um adesivo colado.
 */
const MASK = [
  'linear-gradient(to bottom, #000 66%, rgba(0,0,0,.55) 86%, transparent 99%)',
  'linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)',
].join(', ')

export const portraitMask: CSSProperties = {
  maskImage: MASK,
  WebkitMaskImage: MASK,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
}
