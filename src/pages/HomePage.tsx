import Hero from '../components/Hero'
import DeckSection from '../components/DeckSection'
import HowItWorks from '../components/HowItWorks'
import Footer from '../components/Footer'

/**
 * A vitrine. A tabela comparativa de valores saiu daqui para dentro da Tiragem
 * digital: a home convence, e a comparação item a item é coisa de quem já
 * decidiu entrar. O leque continua — é por ele que a pessoa escolhe brincando,
 * e cada carta leva direto ao agendamento.
 */
export default function HomePage() {
  return (
    <>
      <main className="relative">
        <Hero />
        <DeckSection />
        <HowItWorks />
      </main>
      <Footer />
    </>
  )
}
