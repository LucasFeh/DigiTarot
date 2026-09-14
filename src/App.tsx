import NebulaBackdrop from './components/NebulaBackdrop'
import { SmokeFilters } from './components/SmokeCloud'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import SobrePage from './pages/SobrePage'
import TiragemPage from './pages/TiragemPage'
import SalaPage from './pages/SalaPage'
import HistoricoPage from './pages/HistoricoPage'
import { useHashRoute } from './lib/useHashRoute'
import { AuthProvider } from './lib/AuthProvider'

function Rotas() {
  const { caminho, partes } = useHashRoute()

  // `#/tiragem/<id>` abre a sala daquela sessão; `#/tiragem` é o lobby.
  const conteudo =
    partes[0] === 'tiragem' && partes[1] ? (
      <SalaPage sessaoId={partes[1]} />
    ) : partes[0] === 'tiragem' ? (
      <TiragemPage />
    ) : partes[0] === 'historico' ? (
      <HistoricoPage />
    ) : partes[0] === 'sobre' ? (
      <SobrePage />
    ) : (
      <HomePage />
    )

  return (
    <>
      <Header caminho={caminho} />
      {conteudo}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NebulaBackdrop />
      {/* Definições dos filtros de fumaça — montadas uma vez para a página toda. */}
      <SmokeFilters />
      <Rotas />
    </AuthProvider>
  )
}
