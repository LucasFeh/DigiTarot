import { useMemo, useState } from 'react'
import { CARDS, NAIPE_LABEL, type Naipe } from '../../data/cards'
import type { Alvo, Conferencia, ItemImportado } from '../../lib/temas/tipos'

const GRUPOS: { naipe: Naipe | 'verso'; rotulo: string; alvos: Alvo[] }[] = [
  ...(['maior', 'paus', 'copas', 'espadas', 'ouros'] as Naipe[]).map((n) => ({
    naipe: n,
    rotulo: NAIPE_LABEL[n],
    alvos: CARDS.filter((c) => c.naipe === n).map((c) => c.id),
  })),
  { naipe: 'verso' as const, rotulo: 'Verso', alvos: ['verso'] },
]

const NOME_ALVO = new Map<Alvo, string>([...CARDS.map((c) => [c.id, c.nome] as const), ['verso', 'Verso do baralho']])

/**
 * A grade das 78 cartas mais o verso, com a bandeja do que sobrou.
 *
 * A atribuição é por CLIQUE — escolhe na bandeja, clica na carta — e não só por
 * arrastar: clicar funciona no toque, no teclado e em tela pequena, que é onde
 * arrastar 78 imagens seria tortura. O arrastar continua existindo por cima,
 * para quem está no mouse e acha mais rápido.
 */
export default function GradeConferencia({
  conf,
  onAtribuir,
  onDesatribuir,
}: {
  conf: Conferencia
  onAtribuir: (itemId: string, alvo: Alvo) => void
  onDesatribuir: (itemId: string) => void
}) {
  const [pego, setPego] = useState<string | null>(null)

  const porId = useMemo(() => new Map(conf.itens.map((i) => [i.id, i])), [conf.itens])
  const bandeja = conf.itens.filter((i) => i.estado !== 'casado')

  const soltarEm = (alvo: Alvo, itemId: string | null) => {
    if (!itemId) return
    onAtribuir(itemId, alvo)
    setPego(null)
  }

  const Miniatura = ({ item, tam }: { item: ItemImportado; tam: string }) =>
    item.miniUrl ? (
      <img src={item.miniUrl} alt="" className={`${tam} object-cover`} />
    ) : (
      <span className="grid h-full w-full place-items-center text-[11px] text-mist/50">
        {item.estado === 'ilegivel' ? '✕' : '…'}
      </span>
    )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
      {/* ------------------------------ a grade ------------------------------ */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {GRUPOS.map((g) => (
          <section key={g.naipe} className="mb-5">
            <h3 className="mb-2 text-[13px] uppercase tracking-[0.16em] text-mist/60">{g.rotulo}</h3>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
              {g.alvos.map((alvo) => {
                const itemId = conf.porAlvo.get(alvo)
                const item = itemId ? porId.get(itemId) : undefined
                return (
                  <button
                    key={alvo}
                    type="button"
                    title={NOME_ALVO.get(alvo)}
                    onClick={() => (item ? onDesatribuir(item.id) : soltarEm(alvo, pego))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      soltarEm(alvo, e.dataTransfer.getData('text/plain') || pego)
                    }}
                    className="group relative aspect-[2/3] overflow-hidden rounded-lg border text-left transition"
                    style={{
                      borderColor: item ? '#f2d49255' : pego ? '#b98cff88' : '#ffffff1a',
                      background: item ? '#ffffff08' : '#ffffff05',
                    }}
                  >
                    {item ? (
                      <Miniatura item={item} tam="h-full w-full" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center px-1 text-center text-[10px] leading-tight text-mist/45">
                        {NOME_ALVO.get(alvo)}
                      </span>
                    )}
                    {item && (
                      <span className="absolute inset-x-0 bottom-0 bg-void/80 px-1 py-0.5 text-center text-[10px] text-mist opacity-0 transition group-hover:opacity-100">
                        tirar
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ----------------------------- a bandeja ----------------------------- */}
      <aside className="glass flex max-h-[38vh] w-full shrink-0 flex-col rounded-2xl p-3 lg:max-h-none lg:w-[280px]">
        <p className="shrink-0 text-[14px] text-star">
          Sobraram {bandeja.length}
          {bandeja.length > 0 && <span className="text-mist/60"> · clique num, depois na carta</span>}
        </p>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {bandeja.length === 0 && (
            <p className="py-6 text-center text-[13px] text-mist/60">Tudo no lugar.</p>
          )}
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
            {bandeja.map((i) => (
              <button
                key={i.id}
                type="button"
                draggable={i.estado !== 'ilegivel'}
                disabled={i.estado === 'ilegivel'}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', i.id)}
                onClick={() => setPego(pego === i.id ? null : i.id)}
                title={i.caminho}
                className="relative aspect-[2/3] overflow-hidden rounded-lg border transition"
                style={{
                  borderColor: pego === i.id ? 'var(--color-gold)' : '#ffffff1a',
                  boxShadow: pego === i.id ? '0 0 18px -6px var(--color-gold)' : 'none',
                  // Ilegível não tem bytes: não pode ocupar carta nenhuma.
                  opacity: i.estado === 'ilegivel' ? 0.4 : 1,
                }}
              >
                <Miniatura item={i} tam="h-full w-full" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-void/85 px-1 py-0.5 text-[10px] text-mist">
                  {i.rotulo}
                </span>
                {i.estado === 'sugerido' && i.palpites[0] && (
                  <span className="absolute inset-x-0 top-0 truncate bg-violet/70 px-1 py-0.5 text-[10px] text-star">
                    ~ {NOME_ALVO.get(i.palpites[0])}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
