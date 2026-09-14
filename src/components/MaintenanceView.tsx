import { motion } from 'framer-motion'
import { formatPrice, type Plan } from '../data/plans'

/**
 * Área de destino depois que a carta é escolhida. Por enquanto só anuncia que
 * o fluxo de contratação está em manutenção.
 */
export default function MaintenanceView({
  plan,
  accent,
  onBack,
}: {
  plan: Plan
  accent: string
  onBack: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      role="dialog"
      aria-modal="true"
      aria-label="Área em manutenção"
    >
      <div className="absolute inset-0 bg-void/88 backdrop-blur-xl" onClick={onBack} />

      <motion.div
        className="glass relative w-full max-w-lg overflow-hidden rounded-3xl px-8 py-12 text-center"
        initial={{ y: 28, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 160, damping: 20 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-16 h-64 blur-2xl"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${accent}9e, transparent 68%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/2 h-48 w-[80%] -translate-x-1/2 blur-3xl"
          style={{ background: `radial-gradient(ellipse at center, #6d3fd47a, transparent 70%)` }}
        />

        <div className="relative">
          <span className="mb-5 block text-5xl" aria-hidden>
            🛠️
          </span>

          <h2 className="text-nebula text-3xl sm:text-4xl">Em manutenção</h2>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mist">
            Esta área ainda está sendo preparada. Em breve você vai poder concluir a reserva da sua
            consulta por aqui.
          </p>

          <div
            className="mx-auto mt-8 flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left"
            style={{ borderColor: `${accent}55`, background: `${accent}14` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {plan.icon}
              </span>
              <div>
                <p className="font-display text-sm text-star">{plan.title}</p>
                {plan.duration && (
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mist/80">{plan.duration}</p>
                )}
              </div>
            </div>
            <span className="font-display text-xl font-bold text-gold">{formatPrice(plan.price)}</span>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="mt-8 rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm tracking-wide text-star transition hover:border-gold/60 hover:bg-white/10"
          >
            Escolher outra carta
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
