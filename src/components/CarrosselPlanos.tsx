import { useEffect, useRef, useState } from 'react'
import { categories, type Plan } from '../data/plans'
import { CARD_BY_ID } from '../data/cards'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import { useTema } from '../lib/temas/useTema'
import { useArteCarta } from '../lib/temas/useArte'
import type { TemaBaralho } from '../lib/temas/tipos'

/** Passo de arrasto que troca de carta. Curto o bastante para um polegar. */
const ARRASTO = 70

type Modo = 'circulo' | 'leque'

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
 * Quantas cartas em cada fila da pirâmide, de cima para baixo.
 *
 * Parte do maior triângulo que cabe (1+2+3…) e derrama o resto de baixo para
 * cima, para a base nunca ficar mais estreita que o topo — que é o que
 * desmancharia o formato.
 */
function piramide(total: number): number[] {
  let r = 1
  while (((r + 1) * (r + 2)) / 2 <= total) r++
  const filas = Array.from({ length: r }, (_, i) => i + 1)
  let extra = total - (r * (r + 1)) / 2
  let i = r - 1
  while (extra > 0) {
    filas[i]++
    extra--
    i = i === 0 ? r - 1 : i - 1
  }
  return filas
}

/**
 * A arte de uma carta, no baralho que a pessoa escolheu em Temas.
 *
 * Componente próprio porque `useArteCarta` é um hook: uma chamada por carta, e
 * hooks não vão dentro de laço. É também o que faz o catálogo respeitar a
 * escolha de quem olha — trocar de deck em Temas troca o baralho daqui.
 */
function ArteCarta({
  arcano,
  tema,
  className,
  style,
}: {
  arcano: number
  tema: TemaBaralho | null
  className?: string
  style?: React.CSSProperties
}) {
  const id = `maior-${arcano}`
  const arte = useArteCarta(tema, id)
  return (
    <img
      src={arte}
      alt={CARD_BY_ID.get(id)?.nome ?? ''}
      draggable={false}
      className={className}
      style={style}
    />
  )
}

/**
 * O catálogo como um baralho.
 *
 * As cartas são mostradas INTEIRAS — nada de texto por cima da arte. Uma carta
 * com o preço estampado no meio dela deixa de parecer carta e vira cartaz.
 *
 * Duas formas de olhar, e elas servem a momentos diferentes: em **círculo**,
 * uma carta por vez, girando, para quem está escolhendo pela imagem; em
 * **leque**, todas abertas em pirâmide com os valores à mostra, para quem quer
 * comparar preço. A segunda substituiu a tabela que existia aqui embaixo — e
 * faz o mesmo trabalho sem trocar de linguagem no meio da página.
 */
export default function CarrosselPlanos({ destino }: { destino: (planoId: string) => string }) {
  const { usuario } = useAuth()
  const { perfil } = usePerfil(usuario)
  const { tema } = useTema<TemaBaralho>(perfil.padrao.baralhoId, 'baralho')

  const [categoriaId, setCategoriaId] = useState(categories[0].id)
  const [modo, setModo] = useState<Modo>('circulo')
  const [ativo, setAtivo] = useState(0)
  const arraste = useRef<{ x: number; base: number } | null>(null)
  const palco = useRef<HTMLDivElement>(null)

  const categoria = categories.find((c) => c.id === categoriaId) ?? categories[0]
  const planos = categoria.plans
  const total = planos.length
  const indice = ((ativo % total) + total) % total
  const plano: Plan = planos[indice]
  const arcano = CARD_BY_ID.get(`maior-${plano.arcano}`)

  // Trocar de categoria recomeça do primeiro: manter o índice deixaria a nova
  // aba abrindo no meio, numa carta que a pessoa não escolheu.
  useEffect(() => setAtivo(0), [categoriaId])

  const girar = (passo: number) => setAtivo((a) => a + passo)

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

  const pegar = (e: React.PointerEvent) => {
    arraste.current = { x: e.clientX, base: ativo }
    palco.current?.setPointerCapture(e.pointerId)
  }
  const mover = (e: React.PointerEvent) => {
    const a = arraste.current
    if (!a) return
    setAtivo(a.base + Math.round((a.x - e.clientX) / ARRASTO))
  }
  const soltar = (e: React.PointerEvent) => {
    arraste.current = null
    palco.current?.releasePointerCapture(e.pointerId)
  }

  /** As filas da pirâmide, já com os planos dentro. */
  const filas: Plan[][] = []
  {
    let k = 0
    for (const n of piramide(total)) {
      filas.push(planos.slice(k, k + n))
      k += n
    }
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="mr-auto text-[15px] leading-relaxed text-mist/80">{categoria.tagline}</p>

        <div className="flex items-center gap-1 rounded-full border border-white/12 bg-white/5 p-1">
          {(
            [
              ['circulo', 'Círculo', '◎'],
              ['leque', 'Leque', '▦'],
            ] as const
          ).map(([id, rotulo, icone]) => {
            const on = modo === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setModo(id)}
                aria-pressed={on}
                title={
                  id === 'circulo' ? 'Uma carta por vez, girando' : 'Todas as cartas abertas'
                }
                className="rounded-full px-3.5 py-1.5 text-[14px] transition"
                style={{ color: on ? '#fff' : '#cbbde8', background: on ? '#ffffff1a' : 'transparent' }}
              >
                <span aria-hidden className="mr-1.5">
                  {icone}
                </span>
                {rotulo}
              </button>
            )
          })}
        </div>
      </div>

      {modo === 'circulo' ? (
        <>
          {/* ------------------------------- o giro ------------------------------- */}
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
                const d = distancia(i, indice, total)
                const longe = Math.abs(d)
                const centro = d === 0
                return (
                  <button
                    key={p.id}
                    id={`carta-${p.id}`}
                    type="button"
                    role="option"
                    aria-selected={centro}
                    aria-label={p.title}
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
                      <ArteCarta
                        arcano={p.arcano}
                        tema={tema}
                        className="block h-full w-full object-cover"
                        style={{
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

            <a
              href={destino(plano.id)}
              className="mt-3 inline-block rounded-full px-10 py-3 text-[16px] font-medium tracking-wide text-star transition"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 14px 40px -14px #c2449d',
              }}
            >
              Escolher tarólogo
            </a>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {planos.map((p, i) => {
                const on = distancia(i, indice, total) === 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAtivo(ativo + distancia(i, indice, total))}
                    aria-label={p.title}
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: on ? 22 : 8, background: on ? categoria.accent : '#ffffff2e' }}
                  />
                )
              })}
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-mist/55">
              Arraste o baralho, use as setas ou clique numa carta ao lado.
            </p>
          </div>
        </>
      ) : (
        /* ------------------------------- o leque ------------------------------- */
        <div className="mt-4 flex flex-col items-center gap-5 pb-2">
          {filas.map((fila, f) => (
            <div key={f} className="flex flex-wrap items-start justify-center gap-4">
              {fila.map((p) => (
                <a
                  key={p.id}
                  href={destino(p.id)}
                  className="group w-[min(40vw,150px)] text-center outline-none"
                >
                  <span
                    className="block overflow-hidden rounded-[12px] transition-transform duration-300 group-hover:-translate-y-2 group-focus-visible:-translate-y-2"
                    style={{
                      aspectRatio: '400 / 680',
                      border: '1px solid rgba(246,242,255,.22)',
                      boxShadow: `0 18px 44px -20px #000, 0 0 26px -14px ${categoria.accent}`,
                    }}
                  >
                    <ArteCarta
                      arcano={p.arcano}
                      tema={tema}
                      className="block h-full w-full object-cover"
                    />
                  </span>

                  <span className="mt-2 block truncate text-[14px] leading-snug text-star">
                    {p.title}
                  </span>
                  {p.duration && (
                    <span className="block text-[11px] uppercase tracking-[0.14em] text-mist/60">
                      {p.duration}
                    </span>
                  )}
                </a>
              ))}
            </div>
          ))}

          <p className="mt-1 text-center text-[13px] leading-relaxed text-mist/55">
            Escolha uma carta para ver os tarólogos disponíveis e os valores de cada um.
          </p>
        </div>
      )}
    </div>
  )
}
