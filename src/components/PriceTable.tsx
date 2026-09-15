import { motion } from 'framer-motion'
import { categories, formatPrice } from '../data/plans'

/**
 * A tabela completa, legível e escaneável. Complementa o leque: lá a escolha é
 * lúdica, aqui é comparativa.
 */
export default function PriceTable() {
  return (
    <section id="tabela" className="relative px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="mb-3 text-[13px] uppercase tracking-[0.42em] text-lilac/80">Tudo em um lugar</p>
          <h2 className="text-nebula text-4xl sm:text-5xl">Valores</h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-mist/90">
            Todas as modalidades e seus valores. Qualquer uma delas pode ser feita por escrito,
            áudio ou chamada.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {categories.map((c, ci) => (
            <motion.article
              key={c.id}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: (ci % 2) * 0.1 }}
              className="glass relative self-start overflow-hidden rounded-2xl p-6 sm:p-7"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle, ${c.accent}55, transparent 70%)` }}
              />

              <header className="relative mb-5 border-b border-white/10 pb-4">
                <h3 className="flex items-center gap-2.5 font-display text-xl text-star">
                  <span aria-hidden>{c.icon}</span>
                  {c.title}
                </h3>
                <p className="mt-1.5 text-[15px] text-mist/80">{c.tagline}</p>
              </header>

              <ul className="relative flex flex-col divide-y divide-white/[0.07]">
                {c.plans.map((p) => (
                  <li
                    key={p.id}
                    className="group flex items-start justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-white/5"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="text-[16px] text-star/90">{p.title}</span>
                        {p.duration && (
                          <span className="shrink-0 rounded-full border border-white/15 px-2 py-[1px] text-[12px] uppercase tracking-[0.12em] text-mist/80">
                            {p.duration}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-mist/60">
                        {p.resumo}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-[17px] font-semibold text-gold">
                      {formatPrice(p.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
