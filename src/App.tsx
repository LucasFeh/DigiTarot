import NebulaBackdrop from './components/NebulaBackdrop'
import StarCursor from './components/StarCursor'
import { SmokeFilters } from './components/SmokeCloud'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import { Suspense, lazy } from 'react'
import { useHashRoute } from './lib/useHashRoute'
import { AuthProvider } from './lib/AuthProvider'
import type { Aba } from './lib/temas/tipos'

/**
 * Só a home entra no bundle inicial. As outras rotas vêm sob demanda — e isso
 * importa de verdade aqui: `SalaPage` e `PreviaTemaPage` puxam o registro de
 * texturas, que importa o three inteiro. Estáticas, elas levavam meio megabyte
 * de motor 3D para quem só abriu a página inicial.
 */
const SobrePage = lazy(() => import('./pages/SobrePage'))
const TiragemPage = lazy(() => import('./pages/TiragemPage'))
const SalaPage = lazy(() => import('./pages/SalaPage'))
const HistoricoPage = lazy(() => import('./pages/HistoricoPage'))
const TemasPage = lazy(() => import('./pages/TemasPage'))
const CriarTemaPage = lazy(() => import('./pages/CriarTemaPage'))
const PreviaTemaPage = lazy(() => import('./pages/PreviaTemaPage'))
const PerfilPage = lazy(() => import('./pages/PerfilPage'))

/** `#/temas/pessoais` e `#/temas/favoritos` abrem o acervo já na aba certa. */
const ABAS_TEMAS: Record<string, Aba> = { pessoais: 'pessoais', favoritos: 'favoritos' }

function Rotas() {
  const { caminho, partes } = useHashRoute()

  // `#/tiragem/<id>` abre a sala daquela sessão; `#/tiragem` é o lobby.
  const conteudo =
    partes[0] === 'tiragem' && partes[1] ? (
      <SalaPage sessaoId={partes[1]} />
    ) : partes[0] === 'tiragem' ? (
      <TiragemPage />
    ) : partes[0] === 'temas' && partes[1] === 'novo' ? (
      <CriarTemaPage />
    ) : partes[0] === 'temas' && partes[1] === 'ver' && partes[2] ? (
      <PreviaTemaPage temaId={partes[2]} />
    ) : partes[0] === 'temas' ? (
      <TemasPage abaInicial={ABAS_TEMAS[partes[1] ?? ''] ?? 'comunidade'} />
    ) : partes[0] === 'perfil' ? (
      <PerfilPage />
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
      <Suspense
        fallback={
          <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
            <p className="text-[15px] text-mist/70">Abrindo…</p>
          </main>
        }
      >
        {conteudo}
      </Suspense>
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
      {/* Ponteiro-estrela com rastro — por cima de tudo, sem capturar clique. */}
      <StarCursor />
    </AuthProvider>
  )
}
