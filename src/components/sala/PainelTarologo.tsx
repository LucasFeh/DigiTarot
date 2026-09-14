import { useMemo, useState } from 'react'
import { CARDS, NAIPE_LABEL, type Naipe } from '../../data/cards'
import { PANOS } from '../../data/panos'
import { SPREADS, SPREAD_BY_ID } from '../../data/spreads'
import type { CartaNaMesa } from '../../lib/backend'

type Aba = 'layout' | 'cartas' | 'pano'

const NAIPES: Naipe[] = ['maior', 'paus', 'copas', 'espadas', 'ouros']

export default function PainelTarologo({
  spreadId,
  panoId,
  cartas,
  slotAtivo,
  onSpread,
  onPano,
  onSlot,
  onPorCarta,
  onTirarCarta,
  onVirar,
  onInverter,
  onLimpar,
  onEncerrar,
}: {
  spreadId: string
  panoId: string
  cartas: CartaNaMesa[]
  slotAtivo: number | null
  onSpread: (id: string) => void
  onPano: (id: string) => void
  onSlot: (slot: number | null) => void
  onPorCarta: (cardId: string) => void
  onTirarCarta: (slot: number) => void
  onVirar: (slot: number) => void
  onInverter: (slot: number) => void
  onLimpar: () => void
  onEncerrar: () => void
}) {
  const [aba, setAba] = useState<Aba>('layout')
  const [naipe, setNaipe] = useState<Naipe>('maior')
  const [busca, setBusca] = useState('')

  const spread = SPREAD_BY_ID.get(spreadId) ?? SPREADS[0]
  const usadas = useMemo(() => new Set(cartas.map((c) => c.cardId)), [cartas])
  const noSlot = useMemo(() => new Map(cartas.map((c) => [c.slot, c])), [cartas])

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return CARDS.filter((c) => (t ? c.nome.toLowerCase().includes(t) : c.naipe === naipe))
  }, [naipe, busca])

  const cartaAtiva = slotAtivo !== null ? noSlot.get(slotAtivo) : undefined

  return (
    <aside className="glass flex h-full w-full flex-col overflow-hidden rounded-2xl">
      {/* ------------------------------- abas ------------------------------- */}
      <div className="flex shrink-0 border-b border-white/10">
        {(
          [
            ['layout', 'Layout'],
            ['cartas', 'Cartas'],
            ['pano', 'Pano'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            aria-current={aba === id}
            className="flex-1 px-3 py-3 text-[12px] tracking-wide transition"
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
                  <p className="font-display text-[14px] text-star">{s.nome}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-mist/80">{s.descricao}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-lilac/70">
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
            <p className="rounded-lg bg-white/5 px-3 py-2 text-[11px] leading-snug text-mist">
              {slotAtivo === null ? (
                <>Escolha o lugar e depois a carta.</>
              ) : (
                <>
                  Pondo em <span className="text-gold">{spread.slots[slotAtivo]?.rotulo}</span>.
                </>
              )}
            </p>

            {/*
              Escolher o lugar pela lista, e não só clicando na mesa: num slot
              de 3D pequeno o clique erra fácil, e no celular quase sempre.
            */}
            <div className="flex flex-wrap gap-1">
              {spread.slots.map((s, i) => {
                const ocupado = noSlot.has(i)
                const on = slotAtivo === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSlot(on ? null : i)}
                    title={ocupado ? `${s.rotulo} — ocupado` : s.rotulo}
                    className="rounded-full border px-2.5 py-1 text-[11px] transition"
                    style={{
                      borderColor: on ? '#f2d49288' : ocupado ? '#c9a7ff44' : '#ffffff1f',
                      background: on ? '#f2d4921f' : ocupado ? '#c9a7ff14' : 'transparent',
                      color: on ? '#f2d492' : '#cbbde8',
                    }}
                  >
                    {i + 1}. {s.rotulo}
                    {ocupado && ' ✦'}
                  </button>
                )
              })}
            </div>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar carta…"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-star outline-none placeholder:text-mist/50 focus:border-gold/50"
            />

            {!busca && (
              <div className="flex flex-wrap gap-1">
                {NAIPES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNaipe(n)}
                    className="rounded-full border px-2.5 py-1 text-[11px] transition"
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

            <div className="grid grid-cols-2 gap-1.5">
              {lista.map((c) => {
                const jaNaMesa = usadas.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={jaNaMesa || slotAtivo === null}
                    onClick={() => onPorCarta(c.id)}
                    title={jaNaMesa ? 'Já está na mesa' : c.nome}
                    className="rounded-lg border border-white/12 bg-white/5 px-2 py-2 text-left text-[11px] leading-tight text-star transition enabled:hover:border-gold/50 enabled:hover:bg-white/10 disabled:opacity-35"
                  >
                    {c.nome}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ------------------------------- pano ------------------------------- */}
        {aba === 'pano' && (
          <div className="grid grid-cols-2 gap-2">
            {PANOS.map((p) => {
              const on = p.id === panoId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPano(p.id)}
                  className="overflow-hidden rounded-xl border transition"
                  style={{ borderColor: on ? '#f2d49288' : '#ffffff18' }}
                >
                  <span
                    aria-hidden
                    className="block h-16 w-full"
                    style={{ background: p.cor, boxShadow: `inset 0 0 22px ${p.traco}44` }}
                  />
                  <span className="block px-2 py-1.5 text-[11px] text-mist">{p.nome}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* --------------------- ações do slot selecionado --------------------- */}
      <div className="shrink-0 border-t border-white/10 p-3">
        {cartaAtiva ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onVirar(cartaAtiva.slot)}
              className="flex-1 rounded-lg border border-gold/40 bg-gold/10 px-2 py-2 text-[11px] text-gold transition hover:bg-gold/20"
            >
              {cartaAtiva.revelada ? 'Cobrir' : 'Revelar'}
            </button>
            <button
              type="button"
              onClick={() => onInverter(cartaAtiva.slot)}
              className="flex-1 rounded-lg border border-white/20 px-2 py-2 text-[11px] text-mist transition hover:text-star"
            >
              {cartaAtiva.invertida ? 'Desinverter' : 'Inverter'}
            </button>
            <button
              type="button"
              onClick={() => onTirarCarta(cartaAtiva.slot)}
              className="flex-1 rounded-lg border border-white/20 px-2 py-2 text-[11px] text-mist transition hover:border-rose/50 hover:text-rose"
            >
              Tirar
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-mist/60">
            {slotAtivo === null ? 'Nenhum lugar selecionado' : 'Escolha uma carta na aba Cartas'}
          </p>
        )}

        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              onLimpar()
              onSlot(null)
            }}
            className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-[11px] text-mist transition hover:text-star"
          >
            Limpar mesa
          </button>
          <button
            type="button"
            onClick={onEncerrar}
            className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-[11px] text-mist transition hover:border-rose/50 hover:text-rose"
          >
            Encerrar
          </button>
        </div>
      </div>
    </aside>
  )
}
