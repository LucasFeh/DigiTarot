import { useMemo, useState } from 'react'
import { CARDS, NAIPE_LABEL, type Naipe } from '../../data/cards'
import ListaCartas from './ListaCartas'
import SeletorVisual from '../temas/SeletorVisual'
import { SPREADS, SPREAD_BY_ID } from '../../data/spreads'
import type { CartaNaMesa } from '../../lib/backend'
import type { Visual } from '../../lib/temas/useVisual'
import type { TemaBaralho } from '../../lib/temas/tipos'

type Aba = 'layout' | 'cartas' | 'visual'

const NAIPES: Naipe[] = ['maior', 'paus', 'copas', 'espadas', 'ouros']

export default function PainelTarologo({
  spreadId,
  visual,
  temaBaralho,
  cartas,
  slotAtivo,
  onSpread,
  onPegarCarta,
}: {
  spreadId: string
  visual: Visual
  /** Baralho em uso, para as miniaturas da lista. */
  temaBaralho: TemaBaralho | null
  cartas: CartaNaMesa[]
  /** Só para dizer, na dica, onde a próxima carta vai cair. */
  slotAtivo: number | null
  onSpread: (id: string) => void
  onPegarCarta: (cardId: string, e: React.PointerEvent) => void
}) {
  const [aba, setAba] = useState<Aba>('layout')
  const [naipe, setNaipe] = useState<Naipe>('maior')
  const [busca, setBusca] = useState('')

  const spread = SPREAD_BY_ID.get(spreadId) ?? SPREADS[0]
  const usadas = useMemo(() => new Set(cartas.map((c) => c.cardId)), [cartas])

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return CARDS.filter((c) => (t ? c.nome.toLowerCase().includes(t) : c.naipe === naipe))
  }, [naipe, busca])

  return (
    <aside className="glass flex h-full w-full flex-col overflow-hidden rounded-2xl">
      {/* ------------------------------- abas ------------------------------- */}
      <div className="flex shrink-0 border-b border-white/10">
        {(
          [
            ['layout', 'Layout'],
            ['cartas', 'Cartas'],
            ['visual', 'Visual'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            aria-current={aba === id}
            className="flex-1 px-3 py-3 text-[14px] tracking-wide transition"
            style={{
              color: aba === id ? '#fff' : '#cbbde8',
              background: aba === id ? '#ffffff12' : 'transparent',
              boxShadow: aba === id ? 'inset 0 -2px 0 var(--color-gold)' : 'none',
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {/* ------------------------------ layout ------------------------------ */}
        {aba === 'layout' && (
          <div className="flex flex-col gap-2">
            {SPREADS.map((s) => {
              const on = s.id === spreadId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSpread(s.id)}
                  className="rounded-xl border px-3 py-2.5 text-left transition"
                  style={{
                    borderColor: on ? '#f2d49277' : '#ffffff18',
                    background: on ? '#f2d4921a' : '#ffffff08',
                  }}
                >
                  <p className="font-display text-[16px] text-star">{s.nome}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-mist/80">{s.descricao}</p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.14em] text-lilac/70">
                    {s.slots.length} {s.slots.length === 1 ? 'carta' : 'cartas'}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* ------------------------------ cartas ------------------------------ */}
        {aba === 'cartas' && (
          <div className="flex flex-col gap-3">
            {/* O lugar é escolhido na mesa — clicando nele ou largando a carta
                em cima. A lista de lugares que existia aqui virava um segundo
                jeito de fazer a mesma coisa, e ocupava meio painel. */}
            <p className="text-[13px] leading-snug text-mist/70">
              {slotAtivo === null ? (
                <>Arraste uma carta até um lugar da mesa.</>
              ) : (
                <>
                  Clique numa carta para pôr em{' '}
                  <span className="text-gold">{spread.slots[slotAtivo]?.rotulo}</span>, ou arraste até
                  outro lugar.
                </>
              )}
            </p>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar carta…"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[15px] text-star outline-none placeholder:text-mist/50 focus:border-gold/50"
            />

            {!busca && (
              <div className="flex flex-wrap gap-1">
                {NAIPES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNaipe(n)}
                    className="rounded-full border px-2.5 py-1 text-[13px] transition"
                    style={{
                      borderColor: naipe === n ? '#c9a7ff88' : '#ffffff18',
                      background: naipe === n ? '#c9a7ff1f' : 'transparent',
                      color: naipe === n ? '#fff' : '#cbbde8',
                    }}
                  >
                    {NAIPE_LABEL[n]}
                  </button>
                ))}
              </div>
            )}

            <ListaCartas cartas={lista} tema={temaBaralho} usadas={usadas} onPegar={onPegarCarta} />
          </div>
        )}

        {/* ------------------------------ visual ------------------------------ */}
        {aba === 'visual' && <SeletorVisual visual={visual} />}
      </div>

    </aside>
  )
}
