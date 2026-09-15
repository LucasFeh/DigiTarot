import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CARD_BY_ID } from '../../data/cards'
import { SPREAD_BY_ID } from '../../data/spreads'
import type { CartaNaMesa } from '../../lib/backend'

/**
 * Este navegador consegue abrir a mesa 3D? A three r186 só usa WebGL2, sem
 * caminho para WebGL1 — então é só isso que precisa ser testado. O resultado é
 * guardado: criar contexto é caro e a resposta não muda durante a visita.
 */
let suporte: boolean | null = null
export function temWebGL(): boolean {
  if (suporte !== null) return suporte
  try {
    const c = document.createElement('canvas')
    suporte = Boolean(c.getContext('webgl2'))
  } catch {
    suporte = false
  }
  return suporte
}

/** A leitura em texto, para quando a mesa 3D não puder ser desenhada. */
export function MesaEmTexto({
  spreadId,
  cartas,
  motivo,
}: {
  spreadId: string
  cartas: CartaNaMesa[]
  motivo: string
}) {
  const spread = SPREAD_BY_ID.get(spreadId)
  const porSlot = new Map(cartas.map((c) => [c.slot, c]))

  return (
    <div className="h-full overflow-y-auto bg-abyss p-5">
      <p className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-[14px] leading-relaxed text-mist">
        {motivo} A leitura continua aqui, em texto — nada se perde.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {spread?.slots.map((s, i) => {
          const c = porSlot.get(i)
          const carta = c ? CARD_BY_ID.get(c.cardId) : null
          return (
            <li key={i} className="glass rounded-xl px-4 py-3">
              <p className="text-[12px] uppercase tracking-[0.16em] text-lilac/80">{s.rotulo}</p>
              {!c ? (
                <p className="mt-1 text-[15px] text-mist/60">vazia</p>
              ) : !c.revelada ? (
                <p className="mt-1 text-[15px] italic text-mist/70">ainda virada para baixo</p>
              ) : (
                <>
                  <p className="mt-1 font-display text-[17px] text-star">
                    {carta?.nome}
                    {c.invertida && (
                      <span className="ml-2 text-[12px] uppercase tracking-[0.12em] text-rose">
                        invertida
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-mist">
                    {c.invertida ? carta?.invertida : carta?.normal}
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Isola a cena 3D do resto da página. Sem isto, um erro de renderização dentro
 * do canvas é relançado pelo react-three-fiber e derruba a aplicação inteira —
 * o cabeçalho junto, deixando a tela branca.
 */
export class SalaBoundary extends Component<
  { children: ReactNode; aoFalhar: ReactNode },
  { caiu: boolean }
> {
  state = { caiu: false }

  static getDerivedStateFromError() {
    return { caiu: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('A mesa 3D falhou:', erro, info.componentStack)
  }

  render() {
    return this.state.caiu ? this.props.aoFalhar : this.props.children
  }
}
