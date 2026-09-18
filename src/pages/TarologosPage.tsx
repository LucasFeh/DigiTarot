import { useState, type CSSProperties, type PointerEvent } from 'react'
import Footer from '../components/Footer'
import { PLAN_BY_ID } from '../data/plans'
import { useTarologos } from '../lib/tarologos'
import type { TarologoPublico } from '../lib/backend'
import './TarologosPage.css'

const FOTO_PROVISORIA = `${import.meta.env.BASE_URL}foto-tarologo-provisoria.jpg`
const PERSONAGEM_RODRIGO = `${import.meta.env.BASE_URL}rodrigo.webp`

function nomeDaModalidade(id: string) {
  return PLAN_BY_ID.get(id)?.plano.title ?? id.replace(/-/g, ' ')
}

function notaDoTarologo(tarologo: TarologoPublico) {
  const total = tarologo.avaliacao?.total ?? 0
  const media = tarologo.avaliacao?.media ?? 5
  return {
    media: total > 0 ? Math.max(0, Math.min(5, media)) : 5,
    total,
  }
}

function Estrelas({ tarologo }: { tarologo: TarologoPublico }) {
  const { media, total } = notaDoTarologo(tarologo)
  const preenchidas = Math.round(media)

  return (
    <span className="tarologo-rating" aria-label={total ? `${media.toFixed(1)} de 5 estrelas em ${total} avaliações` : '5 estrelas ilustrativas; avaliações em breve'}>
      <span aria-hidden="true" className="tarologo-rating-stars">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < preenchidas ? 'is-filled' : ''}>★</span>
        ))}
      </span>
      <span className="tarologo-rating-caption">
        {total ? `${media.toFixed(1).replace('.', ',')} · ${total} ${total === 1 ? 'avaliação' : 'avaliações'}` : 'Avaliações em breve'}
      </span>
    </span>
  )
}

function CartaTarologo({ tarologo, indice }: { tarologo: TarologoPublico; indice: number }) {
  const [revelado, setRevelado] = useState(false)
  const modalidades = Object.keys(tarologo.modalidades ?? {}).filter((id) => Number.isFinite(tarologo.modalidades[id]))
  const ehRodrigo = tarologo.nome.trim().toLocaleLowerCase('pt-BR').includes('rodrigo')
  const personagem = tarologo.personagem || (ehRodrigo ? PERSONAGEM_RODRIGO : tarologo.foto || FOTO_PROVISORIA)
  const fotoEhIlustracao = ehRodrigo && /\/rodrigo\.(png|webp)(?:\?|$)/i.test(tarologo.foto)
  const fotoProvisoria = !tarologo.foto || fotoEhIlustracao
  const foto = fotoProvisoria ? FOTO_PROVISORIA : tarologo.foto
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
    carta.style.removeProperty('--tilt-y')
    carta.style.removeProperty('--tilt-x')
    carta.style.removeProperty('--move-x')
    carta.style.removeProperty('--move-y')
  }

  return (
    <article className="tarologo-profile" style={estilo}>
      <button
        type="button"
        className={`tarologo-stage${revelado ? ' is-revealed' : ''}`}
        aria-label={`${revelado ? 'Ver foto' : 'Revelar personagem'} de ${tarologo.nome}`}
        aria-pressed={revelado}
        onClick={() => setRevelado((atual) => !atual)}
        onPointerMove={acompanharPonteiro}
        onPointerLeave={recentrar}
      >
        <span className="tarologo-rotor">
          <span className="tarologo-face tarologo-front">
            <span className="tarologo-photo-wrap">
              <img src={foto} alt="" className="tarologo-photo" loading="lazy" />
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

          <span className="tarologo-face tarologo-back" aria-hidden="true">
            <span className="tarologo-back-aura" />
            <span className="tarologo-back-orbit tarologo-back-orbit-one" />
            <span className="tarologo-back-orbit tarologo-back-orbit-two" />
            <span className="tarologo-back-label">O universo por trás das cartas</span>
            <img src={personagem} alt="" className={`tarologo-character${!tarologo.personagem && !ehRodrigo ? ' is-photo' : ''}`} loading="lazy" />
            <span className="tarologo-back-name">{tarologo.nome}</span>
            <span className="tarologo-back-mark" aria-hidden="true">✧</span>
          </span>
        </span>
      </button>

      <div className="tarologo-profile-copy">
        <div className="tarologo-profile-heading">
          <div>
            <span className="tarologo-profile-overline">Leitura com</span>
            <h2>{tarologo.nome}</h2>
          </div>
          <span className="tarologo-profile-ornament" aria-hidden="true">✦</span>
        </div>
        <p className="tarologo-profile-bio">{tarologo.bio || 'Uma leitura feita com escuta, sensibilidade e espaço para a sua pergunta.'}</p>
        {modalidades.length > 0 && (
          <nav className="tarologo-modalidades" aria-label={`Leituras atendidas por ${tarologo.nome}`}>
            {modalidades.slice(0, 3).map((id) => (
              <a key={id} href={`#/agendar/${encodeURIComponent(id)}`}>{nomeDaModalidade(id)}</a>
            ))}
            {modalidades.length > 3 && <a href="#/tiragem">+ {modalidades.length - 3} opções</a>}
          </nav>
        )}
        {modalidades[0] ? (
          <a className="tarologo-link" href={`#/agendar/${encodeURIComponent(modalidades[0])}`}>
            Escolher uma leitura <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="tarologo-link is-unavailable">Agenda em preparação</span>
        )}
      </div>
    </article>
  )
}

export default function TarologosPage() {
  const { tarologos, carregando } = useTarologos()
  const disponiveis = tarologos.filter((tarologo) => tarologo.ativo)

  return (
    <>
      <main className="tarologos-page">
        <section className="tarologos-intro" aria-labelledby="tarologos-titulo">
          <div className="tarologos-intro-copy">
            <a href="#/" className="tarologos-back-link">← Voltar ao início</a>
            <p className="tarologos-eyebrow"><span aria-hidden="true">✦</span> QUEM LÊ AS CARTAS</p>
            <h1 id="tarologos-titulo">Encontre quem vai <em>ouvir</em> a sua pergunta.</h1>
            <p className="tarologos-lead">Cada tarólogo traz um jeito próprio de ler os caminhos. Conheça seus rostos, descubra suas leituras e escolha com quem sua história faz sentido.</p>
          </div>
          <div className="tarologos-intro-side" aria-hidden="true">
            <span className="tarologos-intro-sigil">✧</span>
            <span className="tarologos-intro-rule" />
            <span className="tarologos-intro-side-text">A pessoa certa muda a conversa.</span>
          </div>
        </section>

        <section className="tarologos-gallery" aria-label="Perfis dos tarólogos">
          <div className="tarologos-gallery-heading">
            <span>OS TARÓLOGOS</span>
            <span>{carregando ? 'CARREGANDO' : `${String(disponiveis.length).padStart(2, '0')} ${disponiveis.length === 1 ? 'PERFIL' : 'PERFIS'}`}</span>
          </div>

          {carregando ? (
            <div className="tarologos-status" role="status">As cartas estão chegando…</div>
          ) : disponiveis.length ? (
            <div className="tarologos-grid">
              {disponiveis.map((tarologo, indice) => <CartaTarologo key={tarologo.uid} tarologo={tarologo} indice={indice} />)}
            </div>
          ) : (
            <div className="tarologos-status">
              <p>Novos tarólogos estão chegando.</p>
              <a href="#/tiragem">Explore as leituras disponíveis ↗</a>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
