import Hero from '../components/Hero'
import DeckSection from '../components/DeckSection'
import HowItWorks from '../components/HowItWorks'
import PriceTable from '../components/PriceTable'
import Footer from '../components/Footer'

export default function HomePage() {
  return (
    <>
      <main className="relative">
        <Hero />
        <DeckSection />
        <HowItWorks />
        <PriceTable />
      </main>
      <Footer />
    </>
  )
}
