import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'
import { SPREAD_BY_ID } from '../data/spreads'
import type { CartaNaMesa, Sessao } from '../lib/backend'
import PainelTarologo from '../components/sala/PainelTarologo'
import PopupCarta from '../components/sala/PopupCarta'
import LoginPage from './LoginPage'

// O Three.js só entra no bundle de quem abre a sala.
const Sala3D = lazy(() => import('../components/sala/Sala3D'))

export default function SalaPage({ sessaoId }: { sessaoId: string }) {
  const { usuario, carregando, backend } = useAuth()
  // `undefined` = ainda carregando; `null` = não existe. Assim o estado de
  // carregamento é derivado, sem um setState extra dentro do efeito.
  const [sessao, setSessao] = useState<Sessao | null | undefined>(undefined)
  const [slotAtivo, setSlotAtivo] = useState<number | null>(null)
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)
  /** Posição do popup. Em state, e não em ref, porque é lida na renderização. */
  const [ponteiro, setPonteiro] = useState({ x: 0, y: 0 })

  const ehTarologo = Boolean(usuario && sessao && usuario.uid === sessao.tarologoUid)

  // ------------------------------ tempo real ------------------------------
  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarSessao(sessaoId, setSessao)
  }, [backend, usuario, sessaoId])

  // Cliente que entra é registrado na sessão, para ela aparecer no histórico dele.
  useEffect(() => {
    if (!backend || !usuario || !sessao) return
    if (usuario.uid === sessao.tarologoUid || sessao.clienteUid === usuario.uid) return
    void backend.atualizarSessao(sessao.id, { clienteUid: usuario.uid, clienteNome: usuario.nome })
  }, [backend, usuario, sessao])

  const patch = useCallback(
    (p: Partial<Sessao>) => {
      if (!backend || !sessao) return
      void backend.atualizarSessao(sessao.id, p)
    },
    [backend, sessao],
  )

  const cartas = sessao?.cartas ?? []
  const spread = SPREAD_BY_ID.get(sessao?.spreadId ?? 'tres')

  // --------------------------- ações do tarólogo ---------------------------
  const porCarta = (cardId: string) => {
    if (slotAtivo === null) return
    const nova: CartaNaMesa = { slot: slotAtivo, cardId, invertida: false, revelada: false }
    patch({ cartas: [...cartas.filter((c) => c.slot !== slotAtivo), nova] })
  }
  const mexer = (slot: number, f: (c: CartaNaMesa) => CartaNaMesa) =>
    patch({ cartas: cartas.map((c) => (c.slot === slot ? f(c) : c)) })

  const carta = hoverSlot === null ? null : (cartas.find((c) => c.slot === hoverSlot) ?? null)

  if (carregando || sessao === undefined) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[13px] text-mist/70">Preparando a mesa…</p>
      </main>
    )
  }

  if (!usuario) return <LoginPage />

  if (!sessao) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
        <div className="glass rounded-2xl px-8 py-10 text-center">
          <p className="font-display text-xl text-star">Sala não encontrada</p>
          <p className="mt-2 text-[13px] text-mist">Ela pode ter sido encerrada.</p>
          <a
            href="#/tiragem"
            className="mt-6 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[13px] text-star transition hover:border-gold/60"
          >
            Voltar
          </a>
        </div>
      </main>
    )
  }

  return (
    <main
      className="relative"
      onPointerMove={(e) => {
        // Só acompanha o ponteiro enquanto há popup aberto: fora disso, cada
        // movimento do mouse custaria uma renderização à toa.
        if (hoverSlot !== null) setPonteiro({ x: e.clientX, y: e.clientY })
      }}
    >
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-3 py-4 lg:h-[calc(100vh-4rem)] lg:flex-row">
        {/* ------------------------------ a sala ------------------------------ */}
        <div
          data-sala
          className="relative min-h-[54vh] flex-1 overflow-hidden rounded-2xl border border-white/10 lg:min-h-0"
        >
          <Suspense
            fallback={
              <div className="grid h-full place-items-center bg-abyss">
                <p className="text-[13px] text-mist/70">Acendendo as velas…</p>
              </div>
            }
          >
            <Sala3D
              spreadId={sessao.spreadId}
              panoId={sessao.panoId}
              cartas={cartas}
              editavel={ehTarologo}
              slotAtivo={slotAtivo}
              onSlot={setSlotAtivo}
              onCarta={(slot) => {
                if (ehTarologo) setSlotAtivo(slot)
                else mexer(slot, (c) => c)
              }}
              onHoverCarta={setHoverSlot}
              onPonteiro={setPonteiro}
            />
          </Suspense>

          {/* Faixa de status sobre o canvas */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
            <span className="glass rounded-full px-3 py-1.5 text-[11px] text-mist">
              {sessao.titulo}
            </span>
            <span className="glass rounded-full px-3 py-1.5 text-[11px] text-mist">
              {ehTarologo ? 'Você conduz' : `com ${sessao.tarologoNome}`}
              {sessao.encerrada && ' · encerrada'}
            </span>
          </div>

          {!ehTarologo && (
            <p className="glass pointer-events-none absolute inset-x-3 bottom-3 rounded-full px-4 py-2 text-center text-[11px] text-mist/85">
              Passe o mouse sobre uma carta revelada para ver o significado. Arraste para girar a mesa.
            </p>
          )}
        </div>

        {/* ---------------------------- painel lateral ---------------------------- */}
        {ehTarologo ? (
          <div className="h-[46vh] w-full shrink-0 lg:h-auto lg:w-[310px]">
            <PainelTarologo
              spreadId={sessao.spreadId}
              panoId={sessao.panoId}
              cartas={cartas}
              slotAtivo={slotAtivo}
              onSpread={(id) => {
                // Trocar de layout descarta as cartas que não cabem no novo.
                const n = SPREAD_BY_ID.get(id)?.slots.length ?? 0
                patch({ spreadId: id, cartas: cartas.filter((c) => c.slot < n) })
                setSlotAtivo(null)
              }}
              onPano={(id) => patch({ panoId: id })}
              onSlot={setSlotAtivo}
              onPorCarta={porCarta}
              onTirarCarta={(slot) => {
                patch({ cartas: cartas.filter((c) => c.slot !== slot) })
                setSlotAtivo(null)
              }}
              onVirar={(slot) => mexer(slot, (c) => ({ ...c, revelada: !c.revelada }))}
              onInverter={(slot) => mexer(slot, (c) => ({ ...c, invertida: !c.invertida }))}
              onLimpar={() => patch({ cartas: [] })}
              onEncerrar={() => {
                patch({ encerrada: true })
                irPara('/tiragem')
              }}
            />
          </div>
        ) : (
          <div className="glass h-auto w-full shrink-0 overflow-y-auto rounded-2xl p-4 lg:w-[280px]">
            <p className="font-display text-[15px] text-star">{spread?.nome}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mist/80">{spread?.descricao}</p>

            <ul className="mt-4 flex flex-col gap-1.5">
              {spread?.slots.map((s, i) => {
                const c = cartas.find((x) => x.slot === i)
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-[12px]"
                    style={{ background: hoverSlot === i ? '#ffffff12' : 'transparent' }}
                  >
                    <span className="text-mist/80">{s.rotulo}</span>
                    <span className="text-star">{c ? (c.revelada ? '✦' : '•') : '—'}</span>
                  </li>
                )
              })}
            </ul>

            <p className="mt-4 text-[11px] leading-relaxed text-mist/60">
              ✦ revelada · • ainda coberta · — vazia
            </p>
          </div>
        )}
      </div>

      <PopupCarta
        carta={carta}
        rotulo={hoverSlot !== null ? spread?.slots[hoverSlot]?.rotulo : undefined}
        x={ponteiro.x}
        y={ponteiro.y}
      />
    </main>
  )
}
