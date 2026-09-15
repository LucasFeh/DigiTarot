import CardBackArt from './CardBackArt'
import { formatPrice, type Plan } from '../data/plans'

export const CARD_W = 168
export const CARD_H = 268

/**
 * O visual da carta: verso ornamentado e frente com o plano, num flip 3D.
 * Usado tanto no leque quanto na carta que voa para o centro da tela.
 */
export default function CardVisual({
  plan,
  accent,
  revealed,
}: {
  plan: Plan
  accent: string
  revealed: boolean
}) {
  return (
    <div
      className="preserve-3d relative h-full w-full transition-transform duration-500"
      style={{
        transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {/* ---------------------------- VERSO ---------------------------- */}
      <div
        className="backface-hidden absolute inset-0 overflow-hidden rounded-[14px] border border-gold/30"
        style={{
          background: 'linear-gradient(158deg, #2a1668 0%, #170b42 42%, #0d0526 100%)',
          boxShadow: 'inset 0 0 40px #00000080, 0 18px 40px -16px #000',
        }}
      >
        <div className="absolute inset-[6px] rounded-[9px] border border-gold/25" />
        <CardBackArt className="absolute inset-0 m-auto h-[78%] w-[78%] text-gold" />
        {/* Névoa colorida da categoria no verso */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{ background: `radial-gradient(circle at 50% 30%, ${accent}66, transparent 62%)` }}
        />
      </div>

      {/* ---------------------------- FRENTE ---------------------------- */}
      <div
        className="backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-[14px] border p-4"
        style={{
          transform: 'rotateY(180deg)',
          borderColor: `${accent}8c`,
          background: `linear-gradient(168deg, ${accent}66 0%, #23124f 42%, #100733 100%)`,
          boxShadow: `inset 0 0 50px ${accent}40, 0 18px 40px -16px #000`,
        }}
      >
        <div className="absolute inset-[6px] rounded-[9px] border border-white/10" />

        {/* Halo atrás do título — evita que o miolo da carta fique vazio */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 70% 40% at 50% 52%, ${accent}3d, transparent 70%)` }}
        />

        {/* Brilho que varre a frente quando a carta está levantada */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `linear-gradient(105deg, transparent 38%, ${accent}55 50%, transparent 62%)`,
            backgroundSize: '220% 100%',
            animation: revealed ? 'shimmer 2.6s ease-in-out infinite' : 'none',
          }}
        />

        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <span className="mt-1 text-[28px] leading-none drop-shadow-[0_0_10px_rgba(255,255,255,.35)]">
            {plan.icon}
          </span>

          <p className="font-display px-1 text-[15px] font-semibold leading-snug text-star/95">
            {plan.title}
          </p>

          <div className="flex w-full flex-col items-center gap-1.5">
            {/* Filete ornamental separando o valor */}
            <span aria-hidden className="mb-1 flex w-full items-center gap-2 px-2">
              <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
              <span className="text-[11px] text-gold/70">✦</span>
              <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
            </span>

            {plan.duration && (
              <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-[3px] text-[12px] uppercase tracking-[0.14em] text-mist">
                {plan.duration}
              </span>
            )}
            <span className="font-display text-[24px] font-bold text-gold drop-shadow-[0_0_14px_rgba(242,212,146,.45)]">
              {formatPrice(plan.price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
