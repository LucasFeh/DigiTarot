import { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Footer from '../components/Footer'
import { useMobileLayout } from '../lib/useMobileLayout'

const DesktopDeckSection = lazy(() => import('../components/DeckSection'))
const MobileDeckSection = lazy(() => import('../components/MobileDeckSection'))

/**
 * A vitrine. A tabela comparativa de valores saiu daqui para dentro da Tiragem
 * digital: a home convence, e a comparação item a item é coisa de quem já
 * decidiu entrar. O leque continua — é por ele que a pessoa escolhe brincando,
 * e cada carta leva direto ao agendamento.
 */
export default function HomePage() {
  const mobile = useMobileLayout()
  return (
    <>
      <main className="relative">
        <Hero />
        <section className="mx-auto max-w-6xl px-5 pt-5 text-center">
          <a href="#/tarologos" className="inline-flex items-center gap-2 rounded-full border border-gold/45 bg-gold/10 px-6 py-3 text-[15px] text-star transition hover:-translate-y-0.5 hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-gold">
            Conheça os tarólogos <span aria-hidden>↗</span>
          </a>
        </section>
        <Suspense fallback={<section id="planos" className="min-h-[32rem]" />}>
          {mobile ? <MobileDeckSection /> : <DesktopDeckSection />}
        </Suspense>
        <HowItWorks />
      </main>
      <Footer />
    </>
  )
}
