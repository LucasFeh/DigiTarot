import NebulaBackdrop from './components/NebulaBackdrop'
import StarCursor from './components/StarCursor'
import SmokeFilters from './components/SmokeFilters'
import Header from './components/Header'
import { Suspense, lazy, useEffect } from 'react'
import { useHashRoute } from './lib/useHashRoute'
import { AuthProvider } from './lib/AuthProvider'
import { useAuth } from './lib/useAuth'
import { haLinkDeEmailNaUrl } from './lib/cadastroPorLink'
import { useMobileLayout } from './lib/useMobileLayout'
import { isFirefox } from './lib/browser'

/** Each route loads its own interface; public inner pages need neither the
 * home animations nor the 3D table before someone navigates to them. */
const HomePage = lazy(() => import('./pages/HomePage'))
const SobrePage = lazy(() => import('./pages/SobrePage'))
const SalaPage = lazy(() => import('./pages/SalaPage'))
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
const MesaDigitalDemoPage = lazy(() => import('./pages/MesaDigitalDemoPage'))
const CameraCelularPage = lazy(() => import('./pages/CameraCelularPage'))
const AppCameraPage = lazy(() => import('./pages/AppCameraPage'))

function RedirecionarParaPerfil({ destino }: { destino: string }) {
  useEffect(() => {
    window.location.replace(destino)
  }, [destino])
  return null
}

function Rotas() {
  const { caminho, partes } = useHashRoute()
  const mobile = useMobileLayout()
  const { usuario, backend } = useAuth()
  const linkEmail = haLinkDeEmailNaUrl() || partes[0] === 'confirmar-cadastro'
  const paginaPublica = linkEmail || !partes[0] || ['sobre', 'tarologos', 'convite', 'armazenamento', 'mesa-digital', 'camera', 'app-camera'].includes(partes[0])
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
  const naCamera = partes[0] === 'camera' && Boolean(partes[1]) && Boolean(partes[2])
  const noAppCamera = partes[0] === 'app-camera'
  const abaAntigaTemas = partes[1] === 'favoritos' || partes[1] === 'pessoais' ? `/${partes[1]}` : ''

  // `#/tiragem/<id>` continua sendo a sala. O antigo lobby mora no perfil.
  const conteudo =
    linkEmail ? (
      <ConcluirCadastroPage />
    ) : noAppCamera ? (
      <AppCameraPage />
    ) : partes[0] === 'camera' && partes[1] && partes[2] ? (
      <CameraCelularPage sessaoId={partes[1]} token={partes[2]} />
    ) : partes[0] === 'tiragem' && partes[1] ? (
      <SalaPage sessaoId={partes[1]} />
    ) : partes[0] === 'tiragem' ? (
      <RedirecionarParaPerfil destino="#/perfil/tiragem" />
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
      <RedirecionarParaPerfil destino={`#/perfil/tiragem/temas${abaAntigaTemas}`} />
    ) : partes[0] === 'perfil' && (partes[1] === 'carta' || partes[1] === 'servicos') ? (
      <RedirecionarParaPerfil destino={`#/perfil/geral/${partes[1]}`} />
    ) : partes[0] === 'perfil' ? (
      <PerfilPage />
    ) : partes[0] === 'tarologos' ? (
      <TarologosPage />
    ) : partes[0] === 'mesa-digital' ? (
      <MesaDigitalDemoPage />
    ) : partes[0] === 'admin' ? (
      <AdminPage />
    ) : partes[0] === 'historico' ? (
      <RedirecionarParaPerfil destino="#/perfil/tiragem/conferir" />
    ) : partes[0] === 'sobre' ? (
      <SobrePage />
    ) : partes[0] === 'armazenamento' ? (
      <ArmazenamentoPage />
    ) : (
      <HomePage />
    )

  return (
    <>
      {!mobile && !isFirefox && (!partes[0] || partes[0] === 'sobre') && <SmokeFilters />}
      {!naSala && !naCamera && !noAppCamera && <NebulaBackdrop />}
      {!naCamera && !noAppCamera && <Header caminho={caminho} />}
      <Suspense
        fallback={
          <main className="grid min-h-screen place-items-center">
            <p className="text-[15px] text-mist/70">Abrindo…</p>
          </main>
        }
      >
        {aguardaEmail ? <VerificarEmailPage /> : conteudo}
      </Suspense>
      {/* Ponteiro-estrela com rastro — por cima de tudo, sem capturar clique. */}
      {!mobile && !naSala && !naCamera && !noAppCamera && <StarCursor />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  )
}
