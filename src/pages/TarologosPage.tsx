import type { CSSProperties } from 'react'
import Footer from '../components/Footer'
import CartaVisual from '../components/tarologos/CartaVisual'
import { PLAN_BY_ID } from '../data/plans'
import { useTarologos } from '../lib/tarologos'
import type { TarologoPublico } from '../lib/backend'
import './TarologosPage.css'

function nomeDaModalidade(id: string) {
  return PLAN_BY_ID.get(id)?.plano.title ?? id.replace(/-/g, ' ')
}

function CartaTarologo({ tarologo, indice }: { tarologo: TarologoPublico; indice: number }) {
  const modalidades = Object.keys(tarologo.modalidades ?? {}).filter((id) => Number.isFinite(tarologo.modalidades[id]))
  return (
    <article className="tarologo-profile" style={{ '--card-index': indice } as CSSProperties}>
      <CartaVisual tarologo={tarologo} indice={indice} />
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
  const disponiveis = tarologos.filter((tarologo) => tarologo.ativo && tarologo.cartaoPublicado !== false)

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
