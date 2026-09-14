import NebulaBackdrop from './components/NebulaBackdrop'
import { SmokeFilters } from './components/SmokeCloud'
import HomePage from './pages/HomePage'
import SobrePage from './pages/SobrePage'
import { useHashRoute } from './lib/useHashRoute'

export default function App() {
  const route = useHashRoute()

  return (
    <>
      <NebulaBackdrop />
      {/* Definições dos filtros de fumaça — montadas uma vez para a página toda. */}
      <SmokeFilters />
      {route === '/sobre' ? <SobrePage /> : <HomePage />}
    </>
  )
}
