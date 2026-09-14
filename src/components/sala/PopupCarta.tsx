import { AnimatePresence, motion } from 'framer-motion'
import { CARD_BY_ID } from '../../data/cards'
import type { CartaNaMesa } from '../../lib/backend'

/**
 * Resumo do significado, ancorado ao ponteiro. Fica em DOM sobre o canvas: o
 * texto sai nítido em qualquer ângulo da câmera, o que não aconteceria com um
 * rótulo desenhado dentro da cena.
 */
export default function PopupCarta({
  carta,
  rotulo,
  x,
  y,
}: {
  carta: CartaNaMesa | null
  /** O que a posição significa no layout. */
  rotulo?: string
  x: number
  y: number
}) {
  const c = carta ? CARD_BY_ID.get(carta.cardId) : null

  return (
    <AnimatePresence>
      {carta && c && (
        <motion.div
          className="pointer-events-none fixed z-[75] w-[min(76vw,310px)]"
          // Perto da borda direita o popup abre para a esquerda.
          style={{
            left: Math.min(x + 18, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 330),
            top: Math.max(12, y - 40),
          }}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div
            className="overflow-hidden rounded-2xl border border-gold/30 p-4"
            style={{
              background: 'linear-gradient(158deg, #1b0d42dd, #0d0526e8)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 22px 60px -18px #000, 0 0 0 1px #ffffff10',
            }}
          >
            {!carta.revelada ? (
              <p className="text-[12px] italic text-mist/80">
                A carta ainda está virada para baixo.
              </p>
            ) : (
              <>
                {rotulo && (
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-lilac/80">{rotulo}</p>
                )}
                <p className="font-display text-[17px] leading-tight text-star">
                  {c.nome}
                  {carta.invertida && (
                    <span className="ml-2 align-middle text-[10px] uppercase tracking-[0.14em] text-rose">
                      invertida
                    </span>
                  )}
                </p>

                <div className="my-2.5 flex items-center gap-2">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" />
                  <span className="text-[9px] text-gold/70">✦</span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" />
                </div>

                <p className="text-[12.5px] leading-relaxed text-mist">
                  {carta.invertida ? c.invertida : c.normal}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {c.chaves.map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-mist/85"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
