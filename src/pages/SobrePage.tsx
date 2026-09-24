import { motion } from 'framer-motion'
import { site } from '../data/site'
import SocialLinks from '../components/SocialLinks'
import Footer from '../components/Footer'
import SmokeCloud from '../components/SmokeCloud'
import { portraitMask } from '../lib/portrait'
import { useMobileLayout } from '../lib/useMobileLayout'

/**
 * Destino do clique no rosto da ilustração. A casca da página já está pronta —
 * só o conteúdo está em manutenção.
 */
export default function SobrePage() {
  const mobile = useMobileLayout()
  return (
    <>
      <main className="relative min-h-[92vh]">
        <div className="flex w-full items-center justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
          <a
            href="#/"
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] tracking-wide text-mist transition hover:border-gold/50 hover:text-star"
          >
            <span aria-hidden>←</span> Voltar
          </a>
          <SocialLinks />
        </div>

        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-24 pt-10 text-center sm:pt-16">
          {site.avatar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative mb-8 w-[min(70vw,360px)]"
            >
              {mobile ? <div className="absolute inset-0 z-0 rounded-full bg-[radial-gradient(ellipse_at_center,#7b4fd666,transparent_68%)]" /> : <div className="absolute inset-0 z-0"><SmokeCloud /></div>}
              <picture>
                <source srcSet={site.avatarWebp} type="image/webp" />
                <img
                  src={site.avatar}
                  alt={site.avatarAlt}
                  className="relative z-10 block w-full select-none"
                  style={{ ...portraitMask, filter: 'drop-shadow(0 22px 40px rgba(0,0,0,.55))' }}
                />
              </picture>
              {!mobile && <div className="absolute inset-0 z-20"><SmokeCloud front /></div>}
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-[13px] uppercase tracking-[0.46em] text-lilac/85"
          >
            {site.brand}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="text-nebula mt-5 text-4xl sm:text-5xl"
          >
            {site.facePage.label}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.38 }}
            className="glass relative mt-10 w-full max-w-lg overflow-hidden rounded-3xl px-8 py-12"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-16 h-56 blur-2xl"
              style={{ background: 'radial-gradient(ellipse at 50% 40%, #7b5cff8c, transparent 68%)' }}
            />
            <div className="relative">
              <span className="mb-5 block text-5xl" aria-hidden>
                🛠️
              </span>
              <h2 className="font-display text-2xl text-star">Em manutenção</h2>
              <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-mist">
                Esta página ainda está sendo escrita. Em breve ela conta quem lê as cartas, como a
                leitura funciona e o que esperar de uma consulta.
              </p>
              <a
                href="#/"
                className="mt-8 inline-block rounded-full border border-white/25 bg-white/5 px-7 py-3 text-base tracking-wide text-star transition hover:border-gold/60 hover:bg-white/10"
              >
                Voltar para as consultas
              </a>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}
