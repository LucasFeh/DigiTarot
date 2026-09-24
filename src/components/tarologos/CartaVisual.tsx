import { useState, type CSSProperties, type PointerEvent } from 'react'
import type { TarologoPublico } from '../../lib/backend'
import { FOTO_RODRIGO } from '../../lib/backend/tarologo'
import '../../pages/TarologosPage.css'

const FOTO_PROVISORIA = `${import.meta.env.BASE_URL}foto-tarologo-provisoria.jpg`

export function fotoDaCarta(tarologo: TarologoPublico): string {
  const ehRodrigo = tarologo.nome.trim().toLocaleLowerCase('pt-BR').includes('rodrigo')
  const fotoAntiga = !tarologo.foto || /(?:foto-tarologo-provisoria\.jpg|rodrigo\.(?:png|webp))(?:\?|$)/i.test(tarologo.foto)
  return ehRodrigo && fotoAntiga ? FOTO_RODRIGO : tarologo.foto || FOTO_PROVISORIA
}

export function Estrelas({ tarologo }: { tarologo: TarologoPublico }) {
  const total = tarologo.avaliacao?.total ?? 0
  const media = total ? Math.max(0, Math.min(5, tarologo.avaliacao.media)) : 5
  return (
    <span className="tarologo-rating" aria-label={total ? `${media.toFixed(1)} de 5 estrelas em ${total} avaliações` : '5 estrelas ilustrativas; avaliações em breve'}>
      <span aria-hidden="true" className="tarologo-rating-stars">
        {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < Math.round(media) ? 'is-filled' : ''}>★</span>)}
      </span>
      <span className="tarologo-rating-caption">
        {total ? `${media.toFixed(1).replace('.', ',')} · ${total} ${total === 1 ? 'avaliação' : 'avaliações'}` : 'Avaliações em breve'}
      </span>
    </span>
  )
}

/** Mesma carta usada na vitrine e na prévia do perfil. */
export default function CartaVisual({ tarologo, indice = 0, onOpen }: { tarologo: TarologoPublico; indice?: number; onOpen?: () => void }) {
  const [revelado, setRevelado] = useState(false)
  const foto = fotoDaCarta(tarologo)
  const temChibi = Boolean(tarologo.personagem)
  const fotoProvisoria = foto === FOTO_PROVISORIA
  const estilo = { '--card-index': indice } as CSSProperties

  function acompanharPonteiro(evento: PointerEvent<HTMLButtonElement>) {
    if (evento.pointerType !== 'mouse') return
    const carta = evento.currentTarget
    const limite = carta.getBoundingClientRect()
    const x = (evento.clientX - limite.left) / limite.width - 0.5
    const y = (evento.clientY - limite.top) / limite.height - 0.5
    carta.style.setProperty('--tilt-y', `${(x * 8).toFixed(2)}deg`)
    carta.style.setProperty('--tilt-x', `${(-y * 8).toFixed(2)}deg`)
    carta.style.setProperty('--move-x', `${(x * 12).toFixed(2)}px`)
    carta.style.setProperty('--move-y', `${(y * 12).toFixed(2)}px`)
  }

  function recentrar(evento: PointerEvent<HTMLButtonElement>) {
    const carta = evento.currentTarget
    for (const nome of ['--tilt-y', '--tilt-x', '--move-x', '--move-y']) carta.style.removeProperty(nome)
  }

  return (
    <button
      type="button"
      className={`tarologo-stage${revelado ? ' is-revealed' : ''}`}
      style={estilo}
      aria-label={onOpen ? `Conhecer o perfil de ${tarologo.nome}` : `${revelado ? 'Ver foto' : 'Revelar verso'} de ${tarologo.nome}`}
      aria-pressed={onOpen ? undefined : revelado}
      onClick={() => onOpen ? onOpen() : setRevelado((atual) => !atual)}
      onPointerMove={acompanharPonteiro}
      onPointerLeave={recentrar}
    >
      <span className="tarologo-rotor">
        <span className="tarologo-face tarologo-front">
          <span className="tarologo-photo-wrap">
            <img src={foto} alt="" className="tarologo-photo" loading={indice === 0 ? 'eager' : 'lazy'} fetchPriority={indice === 0 ? 'high' : 'auto'} decoding="async" />
            <span className="tarologo-photo-shade" aria-hidden="true" />
          </span>
          <span className="tarologo-card-topline">
            <span className="tarologo-card-kicker">DIGITAROT · TARÓLOGO</span>
            <span className="tarologo-card-symbol" aria-hidden="true">✦</span>
          </span>
          <span className="tarologo-card-bottomline">
            <span className="tarologo-card-name">{tarologo.nome}</span>
            <Estrelas tarologo={tarologo} />
            {fotoProvisoria && <span className="tarologo-photo-disclaimer">Foto ilustrativa</span>}
          </span>
          <span className="tarologo-card-corner" aria-hidden="true">PERFIL / {String(indice + 1).padStart(2, '0')}</span>
        </span>

        <span className={`tarologo-face tarologo-back${temChibi ? '' : ' is-empty'}`} aria-hidden="true">
          {temChibi ? (
            <>
              <span className="tarologo-back-aura" />
              <span className="tarologo-back-orbit tarologo-back-orbit-one" />
              <span className="tarologo-back-orbit tarologo-back-orbit-two" />
              <span className="tarologo-back-label">O universo por trás das cartas</span>
              <img src={tarologo.personagem} alt="" className="tarologo-character" loading="lazy" />
              <span className="tarologo-back-mark">✧</span>
            </>
          ) : null}
          <span className="tarologo-back-name">{tarologo.nome}</span>
        </span>
      </span>
    </button>
  )
}
