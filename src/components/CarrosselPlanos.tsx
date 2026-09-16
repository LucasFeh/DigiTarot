import { useEffect, useRef, useState } from 'react'
import { arteDoArcano, categories, formatPriceFull, type Plan } from '../data/plans'
import { CARD_BY_ID } from '../data/cards'

/** Passo de arrasto que troca de carta. Curto o bastante para um polegar. */
const ARRASTO = 70

/**
 * Distância circular entre duas posições: sempre o caminho mais curto, com
 * sinal. É o que faz a última carta ser vizinha da primeira, em vez de estar a
 * oito posições de distância — sem isso o "giro" bate numa parede nas pontas.
 */
function distancia(i: number, ativo: number, total: number) {
  let d = (((i - ativo) % total) + total) % total
  if (d > total / 2) d -= total
  return d
}

/**
 * O catálogo como um baralho girando.
 *
 * As cartas são mostradas INTEIRAS, com a moldura e o título que o Rider-Waite
 * já traz — nada de texto por cima da arte. Uma carta com o preço estampado no
 * meio dela deixa de parecer carta e vira cartaz; o que o serviço custa fica
 * embaixo, fora do baralho, onde o olho vai depois de escolher.
 *
 * O giro é circular de verdade: passar da última leva à primeira. Cada carta é
 * posicionada pelo seu afastamento do centro — quanto mais longe, mais girada,
 * mais para trás e mais apagada —, e girar o carrossel é só mudar qual índice é
 * o centro. Não há posição acumulada nem `scroll` para sair de sincronia.
 */
export default function CarrosselPlanos({ destino }: { destino: (planoId: string) => string }) {
  const [categoriaId, setCategoriaId] = useState(categories[0].id)
  const [ativo, setAtivo] = useState(0)
  const arraste = useRef<{ x: number; base: number } | null>(null)
  const palco = useRef<HTMLDivElement>(null)

  const categoria = categories.find((c) => c.id === categoriaId) ?? categories[0]
  const planos = categoria.plans
  const total = planos.length
  const plano: Plan = planos[((ativo % total) + total) % total]
  const arcano = CARD_BY_ID.get(`maior-${plano.arcano}`)

  // Trocar de categoria recomeça do primeiro: manter o índice deixaria a nova
  // aba abrindo no meio, numa carta que a pessoa não escolheu.
  useEffect(() => setAtivo(0), [categoriaId])

  const girar = (passo: number) => setAtivo((a) => a + passo)

  // Setas do teclado quando o palco tem o foco — um carrossel que só responde a
  // clique exclui quem navega por teclado.
  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      girar(1)
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      girar(-1)
    }
  }

  // Arrasto: o gesto natural num baralho. Segue o dedo em passos, e não só no
  // soltar, para a carta responder enquanto a mão ainda está na tela.
  const pegar = (e: React.PointerEvent) => {
    arraste.current = { x: e.clientX, base: ativo }
    palco.current?.setPointerCapture(e.pointerId)
  }
  const mover = (e: React.PointerEvent) => {
    const a = arraste.current
    if (!a) return
    const passos = Math.round((a.x - e.clientX) / ARRASTO)
    setAtivo(a.base + passos)
  }
  const soltar = (e: React.PointerEvent) => {
    arraste.current = null
    palco.current?.releasePointerCapture(e.pointerId)
  }

  return (
    <div>
      {/* ---------------------------- categorias ---------------------------- */}
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {categories.map((c) => {
          const on = c.id === categoriaId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaId(c.id)}
              aria-current={on ? 'true' : undefined}
              className="relative px-4 py-3 text-[15px] tracking-wide transition"
              style={{ color: on ? '#fff' : '#cbbde8' }}
            >
              {c.title}
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-opacity"
                style={{ background: c.accent, opacity: on ? 1 : 0 }}
              />
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-center text-[15px] leading-relaxed text-mist/80">
        {categoria.tagline}
      </p>

      {/* ------------------------------- o baralho -------------------------------
          A altura é apertada de propósito. O baralho pede tamanho para parecer
          baralho, mas o "Agendar" logo abaixo é a ação da tela — e uma ação que
          exige rolar para ser vista custa conversões. 210px de carta é o maior
          tamanho em que os dois cabem juntos numa tela comum. */}
      <div className="relative mt-3 flex items-center justify-center">
        <button
          type="button"
          onClick={() => girar(-1)}
          aria-label="Carta anterior"
          className="glass absolute left-0 z-[60] grid h-11 w-11 place-items-center rounded-full text-[17px] text-mist transition hover:text-star"
        >
          ‹
        </button>

        <div
          ref={palco}
          role="listbox"
          aria-label={`Consultas de ${categoria.title}`}
          aria-activedescendant={`carta-${plano.id}`}
          tabIndex={0}
          onKeyDown={teclado}
          onPointerDown={pegar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          className="relative h-[350px] w-full cursor-grab touch-pan-y select-none active:cursor-grabbing sm:h-[380px]"
          style={{ perspective: '1200px' }}
        >
          {planos.map((p, i) => {
            const d = distancia(i, ((ativo % total) + total) % total, total)
            const longe = Math.abs(d)
            const centro = d === 0
            const arte = CARD_BY_ID.get(`maior-${p.arcano}`)

            return (
              <button
                key={p.id}
                id={`carta-${p.id}`}
                type="button"
                role="option"
                aria-selected={centro}
                aria-label={`${p.title} — ${formatPriceFull(p.price)}`}
                onClick={() => !centro && setAtivo(ativo + d)}
                tabIndex={-1}
                className="group absolute left-1/2 top-1/2 w-[min(46vw,210px)] outline-none"
                style={{
                  // `translate(-50%,-50%)` primeiro: sem ele a carta gira em
                  // torno do canto e some para fora do palco.
                  transform: `translate(-50%, -50%) translateX(${d * 62}%) translateZ(${-longe * 110}px) rotateY(${d * -30}deg) scale(${1 - longe * 0.04})`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform .45s cubic-bezier(.22,.9,.3,1), opacity .45s ease',
                  opacity: longe > 3 ? 0 : 1,
                  pointerEvents: longe > 3 ? 'none' : 'auto',
                  zIndex: 50 - longe,
                  cursor: centro ? 'default' : 'pointer',
                }}
              >
                <span
                  className="block overflow-hidden rounded-[14px] transition-transform duration-300 group-hover:-translate-y-2 group-focus-visible:-translate-y-2"
                  style={{
                    aspectRatio: '400 / 680',
                    // A moldura clara é o que faz isto ler como CARTA e não
                    // como imagem recortada: um baralho de verdade tem borda.
                    border: '1px solid rgba(246,242,255,.22)',
                    boxShadow: centro
                      ? `0 26px 60px -18px #000, 0 0 40px -10px ${categoria.accent}`
                      : '0 18px 40px -20px #000',
                  }}
                >
                  <img
                    src={arteDoArcano(p.arcano)}
                    alt={arte?.nome ?? ''}
                    loading={longe <= 2 ? 'eager' : 'lazy'}
                    draggable={false}
                    className="block h-full w-full object-cover"
                    style={{
                      // As laterais escurecem para o centro se destacar, sem
                      // véu nenhum sobre a carta escolhida.
                      filter: centro ? 'none' : `brightness(${0.55 - longe * 0.06}) saturate(.9)`,
                      transition: 'filter .45s ease',
                    }}
                  />
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => girar(1)}
          aria-label="Próxima carta"
          className="glass absolute right-0 z-[60] grid h-11 w-11 place-items-center rounded-full text-[17px] text-mist transition hover:text-star"
        >
          ›
        </button>
      </div>

      {/* --------------------------- a carta escolhida --------------------------- */}
      <div className="mx-auto mt-1 max-w-md text-center" aria-live="polite">
        <p className="text-[12px] uppercase tracking-[0.24em] text-gold/80">
          {arcano?.nome ?? categoria.title}
        </p>

        <h3 className="text-nebula mt-1 font-display text-2xl leading-tight">{plano.title}</h3>

        {plano.duration && (
          <span className="mt-2 inline-block rounded-full border border-white/25 px-3 py-[2px] text-[12px] uppercase tracking-[0.14em] text-mist">
            {plano.duration}
          </span>
        )}

        <p className="mt-2.5 text-[15px] leading-relaxed text-mist/85">{plano.resumo}</p>

        <p className="mt-3 font-display text-[30px] font-semibold text-gold">
          {formatPriceFull(plano.price)}
        </p>

        <a
          href={destino(plano.id)}
          className="mt-3 inline-block rounded-full px-10 py-3 text-[16px] font-medium tracking-wide text-star transition"
          style={{
            background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
            boxShadow: '0 14px 40px -14px #c2449d',
          }}
        >
          Agendar
        </a>

        {/* Marcadores: dizem quantas cartas há e onde se está, que a rotação
            sozinha esconde. */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {planos.map((p, i) => {
            const on = distancia(i, ((ativo % total) + total) % total, total) === 0
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setAtivo(ativo + distancia(i, ((ativo % total) + total) % total, total))}
                aria-label={p.title}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: on ? 22 : 8,
                  background: on ? categoria.accent : '#ffffff2e',
                }}
              />
            )
          })}
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-mist/55">
          Arraste o baralho, use as setas ou clique numa carta ao lado.
        </p>
      </div>
    </div>
  )
}
