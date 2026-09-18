import { motion } from 'framer-motion'
import type { Plan } from '../data/plans'

/**
 * O que aparece depois que a carta escolhida pousa: a confirmação do serviço e
 * a porta para o agendamento.
 *
 * Antes daqui saía um aviso de "em manutenção" — o leque era bonito e não levava
 * a lugar nenhum. Agora a mesma carta que voou é a que leva ao calendário, e o
 * caminho da home até o Pix não tem beco sem saída.
 */
export default function EscolhaPlano({
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
      aria-label="Confirmar a consulta escolhida"
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
          <span className="mb-5 block text-4xl text-gold" aria-hidden>
            {plan.icon}
          </span>

          <h2 className="text-nebula text-3xl sm:text-4xl">Esta é a sua carta</h2>

          <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-mist">
            Agora é escolher quem vai atender você. Depois, marque o horário e conclua pelo Pix.
          </p>

          <div
            className="mx-auto mt-8 rounded-2xl border px-5 py-4 text-left"
            style={{ borderColor: `${accent}55`, background: `${accent}14` }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-base text-star">{plan.title}</p>
                {plan.duration && (
                  <p className="text-[13px] uppercase tracking-[0.16em] text-mist/80">
                    {plan.duration}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-mist/75">{plan.resumo}</p>
          </div>

          <a
            href={`#/agendar/${plan.id}`}
            className="mt-8 block rounded-full px-7 py-3.5 text-base font-medium tracking-wide text-star transition"
            style={{
              background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
              boxShadow: '0 12px 40px -14px #c2449d',
            }}
          >
            Escolher tarólogo
          </a>

          <button
            type="button"
            onClick={onBack}
            className="mt-3 rounded-full border border-white/20 px-7 py-2.5 text-[15px] tracking-wide text-mist transition hover:border-gold/60 hover:text-star"
          >
            Escolher outra carta
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
