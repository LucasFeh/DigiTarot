import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TarologoPublico } from '../../lib/backend'
import { PLAN_BY_ID } from '../../data/plans'
import { Estrelas, fotoDaCarta } from './CartaVisual'

export default function ModalTarologo({ tarologo, onClose }: { tarologo: TarologoPublico; onClose: () => void }) {
  const modal = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const modalidades = Object.keys(tarologo.modalidades ?? {}).filter((id) => Number.isFinite(tarologo.modalidades[id]))
  const especializacoes = Array.isArray(tarologo.especializacoes) ? tarologo.especializacoes.filter((item): item is string => typeof item === 'string') : []

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    close.current?.focus()
    function teclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { onClose(); return }
      if (evento.key !== 'Tab' || !modal.current) return
      const focaveis = Array.from(modal.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      const primeiro = focaveis[0]
      const ultimo = focaveis.at(-1)
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo?.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro?.focus() }
    }
    document.addEventListener('keydown', teclado)
    return () => {
      document.body.style.overflow = overflowAnterior
      document.removeEventListener('keydown', teclado)
      anterior?.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="tarologo-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={modal} className="tarologo-dialog" role="dialog" aria-modal="true" aria-labelledby="tarologo-dialog-nome" aria-describedby="tarologo-dialog-resumo">
        <button ref={close} type="button" className="tarologo-dialog-close" onClick={onClose} aria-label="Fechar perfil">×</button>
        <div className="tarologo-dialog-layout">
          <div className="tarologo-dialog-portrait">
            <img src={fotoDaCarta(tarologo)} alt={`Foto de ${tarologo.nome}`} />
            <span>CONHEÇA O TARÓLOGO</span>
          </div>
          <div className="tarologo-dialog-content">
            <p className="tarologo-dialog-kicker">DIGITAROT / PERFIL PROFISSIONAL</p>
            <h2 id="tarologo-dialog-nome">{tarologo.nome}</h2>
            <div className="tarologo-dialog-rating"><Estrelas tarologo={tarologo} /></div>
            {tarologo.anosExperiencia != null && <p className="tarologo-dialog-experience"><strong>{tarologo.anosExperiencia}</strong> {tarologo.anosExperiencia === 1 ? 'ano' : 'anos'} de trabalho com tarot</p>}
            <div className="tarologo-dialog-section" id="tarologo-dialog-resumo">
              <h3>Sobre o trabalho</h3>
              <p>{tarologo.bio?.trim() || 'Apresentação profissional em breve.'}</p>
            </div>
            {especializacoes.length > 0 && <div className="tarologo-dialog-section">
              <h3>Especializações</h3>
              <div className="tarologo-dialog-tags">{especializacoes.map((item) => <span key={item}>{item}</span>)}</div>
            </div>}
            {tarologo.abordagem?.trim() && <div className="tarologo-dialog-section">
              <h3>Como conduz a leitura</h3>
              <p>{tarologo.abordagem}</p>
            </div>}
            <div className="tarologo-dialog-section">
              <h3>Leituras disponíveis</h3>
              {modalidades.length ? <>
                <div className="tarologo-dialog-services">{modalidades.slice(0, mostrarTodas ? undefined : 6).map((id) => <a key={id} href={`#/agendar/${encodeURIComponent(id)}`}>{PLAN_BY_ID.get(id)?.plano.title ?? id.replace(/-/g, ' ')} <span aria-hidden="true">↗</span></a>)}</div>
                {modalidades.length > 6 && <button className="tarologo-dialog-more" type="button" onClick={() => setMostrarTodas((valor) => !valor)}>{mostrarTodas ? 'Mostrar menos' : `Ver todas as ${modalidades.length} leituras`}</button>}
              </> : <p>Agenda em preparação.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
