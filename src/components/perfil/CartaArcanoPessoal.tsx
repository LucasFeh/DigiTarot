import { useState } from 'react'
import { arteDoArcano } from '../../data/plans'
import type { ArcanoPessoal } from '../../data/arcanosPessoais'
import './CartaArcanoPessoal.css'

export default function CartaArcanoPessoal({ arcano }: { arcano: ArcanoPessoal }) {
  const [virada, setVirada] = useState(false)

  return (
    <button
      type="button"
      className={`arcano-pessoal-stage${virada ? ' is-turned' : ''}`}
      aria-label={virada ? `Voltar para a carta ${arcano.nome}` : `Ler a personalidade de ${arcano.nome}`}
      aria-pressed={virada}
      onClick={() => setVirada((atual) => !atual)}
    >
      <span className="arcano-pessoal-rotor">
        <span className="arcano-pessoal-face arcano-pessoal-front">
          <img src={arteDoArcano(arcano.numeroCarta)} alt="" draggable={false} />
          <span className="arcano-pessoal-vignette" aria-hidden="true" />
          <span className="arcano-pessoal-kicker">Seu arcano pessoal é:</span>
          <span className="arcano-pessoal-number">{arcano.romano}</span>
          <span className="arcano-pessoal-title">{arcano.nome}</span>
          <span className="arcano-pessoal-hint">Toque para revelar sua leitura</span>
        </span>

        <span className="arcano-pessoal-face arcano-pessoal-back">
          <span className="arcano-pessoal-orbit" aria-hidden="true" />
          <span className="arcano-pessoal-back-kicker">Personalidade simbólica</span>
          <span className="arcano-pessoal-back-title">{arcano.nome}</span>
          <span className="arcano-pessoal-keywords">{arcano.palavras.join(' · ')}</span>
          <span className="arcano-pessoal-reading">{arcano.personalidade}</span>
          <span className="arcano-pessoal-back-hint">Toque para ver a carta</span>
        </span>
      </span>
    </button>
  )
}
