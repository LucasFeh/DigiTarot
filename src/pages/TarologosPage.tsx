import { useCallback, useState, type CSSProperties } from 'react'
import Footer from '../components/Footer'
import CartaVisual from '../components/tarologos/CartaVisual'
import ModalTarologo from '../components/tarologos/ModalTarologo'
import { useTarologos } from '../lib/tarologos'
import type { TarologoPublico } from '../lib/backend'
import './TarologosPage.css'

function CartaTarologo({ tarologo, indice, onOpen }: { tarologo: TarologoPublico; indice: number; onOpen: () => void }) {
  return (
    <article className="tarologo-profile" style={{ '--card-index': indice } as CSSProperties}>
      <CartaVisual tarologo={tarologo} indice={indice} onOpen={onOpen} />
    </article>
  )
}
export default function TarologosPage() {
  const { tarologos, carregando } = useTarologos()
  const [selecionado, setSelecionado] = useState<TarologoPublico | null>(null)
  const fecharModal = useCallback(() => setSelecionado(null), [])
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
              {disponiveis.map((tarologo, indice) => <CartaTarologo key={tarologo.uid} tarologo={tarologo} indice={indice} onOpen={() => setSelecionado(tarologo)} />)}
            </div>
          ) : (
            <div className="tarologos-status">
              <p>Novos tarólogos estão chegando.</p>
              <a href="#/tiragem">Explore as leituras disponíveis ↗</a>
            </div>
          )}
        </section>
      </main>
      {selecionado && <ModalTarologo tarologo={tarologos.find((item) => item.uid === selecionado.uid) ?? selecionado} onClose={fecharModal} />}
      <Footer />
    </>
  )
}
