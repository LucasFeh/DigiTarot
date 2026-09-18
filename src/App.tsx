import NebulaBackdrop from './components/NebulaBackdrop'
import StarCursor from './components/StarCursor'
import { SmokeFilters } from './components/SmokeCloud'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import { Suspense, lazy } from 'react'
import { useHashRoute } from './lib/useHashRoute'
import { AuthProvider } from './lib/AuthProvider'
import { useAuth } from './lib/useAuth'
import { haLinkDeEmailNaUrl } from './lib/cadastroPorLink'
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
const TemasPage = lazy(() => import('./pages/TemasPage'))
const CriarTemaPage = lazy(() => import('./pages/CriarTemaPage'))
const PreviaTemaPage = lazy(() => import('./pages/PreviaTemaPage'))
const PerfilPage = lazy(() => import('./pages/PerfilPage'))
const AgendarPage = lazy(() => import('./pages/AgendarPage'))
const PagamentoPage = lazy(() => import('./pages/PagamentoPage'))
const ConvitePage = lazy(() => import('./pages/ConvitePage'))
const TarologosPage = lazy(() => import('./pages/TarologosPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const VerificarEmailPage = lazy(() => import('./pages/VerificarEmailPage'))
const ConcluirCadastroPage = lazy(() => import('./pages/ConcluirCadastroPage'))
const ArmazenamentoPage = lazy(() => import('./pages/ArmazenamentoPage'))

/** `#/temas/pessoais` e `#/temas/favoritos` abrem o acervo já na aba certa. */
const ABAS_TEMAS: Record<string, Aba> = { pessoais: 'pessoais', favoritos: 'favoritos' }

function Rotas() {
  const { caminho, partes } = useHashRoute()
  const { usuario, backend } = useAuth()
  const linkEmail = haLinkDeEmailNaUrl() || partes[0] === 'confirmar-cadastro'
  const paginaPublica = linkEmail || !partes[0] || ['sobre', 'tarologos', 'convite', 'armazenamento'].includes(partes[0])
  const aguardaEmail = backend?.modo === 'firebase' && Boolean(usuario?.email) && usuario?.emailVerificado === false && !paginaPublica

  /**
   * A sala 3D cobre a tela inteira e é opaca. Enquanto ela está aberta, o
   * nebuloso e o ponteiro-estrela continuavam desenhando ATRÁS dela: dois
   * `requestAnimationFrame` em canvas de tela cheia, mais quatro camadas de
   * blur de 90 a 120px animadas em CSS, disputando cada quadro com o three e
   * sem que nada disso aparecesse. Desmontá-los aqui não custa um pixel de
   * imagem e é a economia mais barata que a sala tem.
   */
  const naSala = partes[0] === 'tiragem' && Boolean(partes[1])

  // `#/tiragem/<id>` abre a sala daquela sessão; `#/tiragem` é o lobby.
  const conteudo =
    linkEmail ? (
      <ConcluirCadastroPage />
    ) : partes[0] === 'tiragem' && partes[1] ? (
      <SalaPage sessaoId={partes[1]} />
    ) : partes[0] === 'tiragem' ? (
      <TiragemPage />
    ) : partes[0] === 'agendar' && partes[1] ? (
      <AgendarPage planoId={partes[1]} />
    ) : partes[0] === 'convite' && partes[1] ? (
      <ConvitePage token={partes[1]} />
    ) : partes[0] === 'pagamento' && partes[1] ? (
      <PagamentoPage agendamentoId={partes[1]} />
    ) : partes[0] === 'temas' && partes[1] === 'novo' ? (
      <CriarTemaPage />
    ) : partes[0] === 'temas' && partes[1] === 'ver' && partes[2] ? (
      <PreviaTemaPage temaId={partes[2]} />
    ) : partes[0] === 'temas' ? (
      <TemasPage abaInicial={ABAS_TEMAS[partes[1] ?? ''] ?? 'comunidade'} />
    ) : partes[0] === 'perfil' ? (
      <PerfilPage />
    ) : partes[0] === 'tarologos' ? (
      <TarologosPage />
    ) : partes[0] === 'admin' ? (
      <AdminPage />
    ) : partes[0] === 'historico' ? (
      // O histórico virou a aba "Conferir agendamento" da tiragem. A rota
      // antiga continua existindo porque ela foi divulgada em links e no menu
      // por semanas — mas agora só encaminha para onde o conteúdo mora.
      <TiragemPage />
    ) : partes[0] === 'sobre' ? (
      <SobrePage />
    ) : partes[0] === 'armazenamento' ? (
      <ArmazenamentoPage />
    ) : (
      <HomePage />
    )

  return (
    <>
      {!naSala && <NebulaBackdrop />}
      <Header caminho={caminho} />
      <Suspense
        fallback={
          <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
            <p className="text-[15px] text-mist/70">Abrindo…</p>
          </main>
        }
      >
        {aguardaEmail ? <VerificarEmailPage /> : conteudo}
      </Suspense>
      {/* Ponteiro-estrela com rastro — por cima de tudo, sem capturar clique. */}
      {!naSala && <StarCursor />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      {/* Definições dos filtros de fumaça — montadas uma vez para a página toda. */}
      <SmokeFilters />
      <Rotas />
    </AuthProvider>
  )
}
