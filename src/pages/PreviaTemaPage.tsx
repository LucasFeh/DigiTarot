import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { CARD_BY_ID } from '../data/cards'
import { irPara } from '../lib/useHashRoute'
import { useTema } from '../lib/temas/useTema'
import { useMiniatura } from '../lib/temas/useAcervo'
import { cartaEm, PASSO, tempoDaCarta, totalDoDesfile } from '../lib/temas/coreografia'
import type { Tema, TemaBaralho, TemaPano } from '../lib/temas/tipos'

const DesfileCartas = lazy(() => import('../components/temas/DesfileCartas'))

/** WebGL indisponível (placa velha, contexto esgotado, política do navegador). */
function temWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

function Cabecalho({ tema }: { tema: Tema }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto">
        <a href="#/temas" className="glass rounded-full px-3 py-1.5 text-[13px] text-mist transition hover:text-star">
          ← Acervo
        </a>
      </div>
      <div className="glass pointer-events-auto rounded-full px-4 py-1.5 text-right">
        <p className="font-display text-[15px] text-star">{tema.nome}</p>
        <p className="text-[12px] text-mist/70">por {tema.autorNome}</p>
      </div>
    </div>
  )
}

/** Prévia de um tema de pano: não há desfile, o pano é uma imagem só. */
function PreviaPano({ tema }: { tema: TemaPano }) {
  const mini = useMiniatura(tema)
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <Cabecalho tema={tema} />
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-16">
        <div
          className="aspect-square w-[min(80vw,520px)] overflow-hidden rounded-3xl"
          style={{ background: tema.cor, boxShadow: '0 40px 100px -30px #000, 0 0 60px -20px var(--color-violet)' }}
        >
          {mini && <img src={mini} alt={tema.nome} className="h-full w-full object-cover" />}
        </div>
      </div>
    </div>
  )
}

export default function PreviaTemaPage({ temaId }: { temaId: string }) {
  const { estado, tema } = useTema(temaId, 'baralho')
  const pano = useTema<TemaPano>(`tema:${temaId}`, 'pano')
  const relogio = useRef({ t: 0 })
  const [rodando, setRodando] = useState(true)
  const [indice, setIndice] = useState(0)
  const [webgl] = useState(temWebGL)

  const baralho = tema as TemaBaralho | null
  const cartas = useMemo(() => baralho?.cartas ?? [], [baralho])
  const total = totalDoDesfile(cartas.length)

  const irParaCarta = (i: number) => {
    const n = Math.max(0, Math.min(cartas.length - 1, i))
    relogio.current.t = tempoDaCarta(n)
    setIndice(n)
  }

  /** No fim o relógio está preso no teto: dar play sem rebobinar não anda um
   *  quadro sequer, e o botão parecia quebrado. */
  const tocar = () => {
    if (!rodando && relogio.current.t >= total) irParaCarta(0)
    setRodando((v) => !v)
  }

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') irPara('/temas')
      else if (e.key === 'ArrowRight') irParaCarta(cartaEm(relogio.current.t) + 1)
      else if (e.key === 'ArrowLeft') irParaCarta(cartaEm(relogio.current.t) - 1)
      else if (e.key === ' ') {
        e.preventDefault()
        tocar()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartas.length])

  if (estado === 'carregando' || pano.estado === 'carregando') {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Abrindo o tema…</p>
      </main>
    )
  }

  if (pano.tema) return <PreviaPano tema={pano.tema} />

  if (!baralho) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
        <div className="glass rounded-2xl px-8 py-10 text-center">
          <p className="font-display text-xl text-star">Tema não encontrado</p>
          <p className="mt-2 max-w-sm text-[15px] text-mist">
            Ele pode ter sido apagado, ou foi criado em outro dispositivo — o acervo ainda é local.
          </p>
          <a
            href="#/temas"
            className="mt-6 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
          >
            Voltar ao acervo
          </a>
        </div>
      </main>
    )
  }

  const atual = cartas[indice] ? CARD_BY_ID.get(cartas[indice]) : undefined

  // Sem WebGL o desfile não roda: a grade mostra o mesmo conteúdo, sem 3D.
  if (!webgl) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="font-display text-2xl text-nebula">{baralho.nome}</h1>
        <p className="mt-1 text-[14px] text-mist/70">
          Seu navegador não tem 3D disponível — aqui estão as cartas do tema.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {cartas.map((c) => (
            <div key={c} className="rounded-lg border border-white/10 p-2 text-center text-[12px] text-mist/80">
              {CARD_BY_ID.get(c)?.nome ?? c}
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] bg-void">
      <Cabecalho tema={baralho} />

      <Suspense
        fallback={
          <div className="grid h-full place-items-center">
            <p className="text-[15px] text-mist/70">Preparando o baralho…</p>
          </div>
        }
      >
        <DesfileCartas
          cartas={cartas}
          tema={baralho}
          relogio={relogio.current}
          rodando={rodando}
          indice={indice}
          onCarta={(i) => setIndice(Math.min(i, Math.max(0, cartas.length - 1)))}
          onFim={() => setRodando(false)}
        />
      </Suspense>

      {/* --------------------------- controles --------------------------- */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="glass mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="mr-auto truncate font-display text-[16px] text-star">
              {atual?.nome ?? '—'}
              <span className="ml-2 text-[13px] font-normal text-mist/60">
                {indice + 1}/{cartas.length}
              </span>
            </p>
            <button
              type="button"
              onClick={() => irParaCarta(indice - 1)}
              className="grid h-8 w-8 place-items-center rounded-full text-mist transition hover:text-star"
              title="Carta anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={tocar}
              className="grid h-9 w-9 place-items-center rounded-full text-star transition"
              style={{ background: 'linear-gradient(100deg, #6d3fd4, #c2449d)' }}
              title={rodando ? 'Pausar' : 'Continuar'}
            >
              {rodando ? '❚❚' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => irParaCarta(indice + 1)}
              className="grid h-8 w-8 place-items-center rounded-full text-mist transition hover:text-star"
              title="Próxima carta"
            >
              ›
            </button>
          </div>

          {/* Barra clicável: cada passo é uma carta. */}
          <div
            className="h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/10"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const frac = (e.clientX - r.left) / r.width
              irParaCarta(Math.round((frac * total) / PASSO))
            }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{
                width: `${((indice + 1) / Math.max(1, cartas.length)) * 100}%`,
                background: 'linear-gradient(90deg, var(--color-violet), var(--color-rose))',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
