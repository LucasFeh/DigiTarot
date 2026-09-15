import { useAuth } from '../lib/useAuth'
import HistoricoLista from '../components/HistoricoLista'
import LoginPage from './LoginPage'

export default function HistoricoPage() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }
  if (!usuario) return <LoginPage />

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-14">
      <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Suas consultas</p>
      <h1 className="text-nebula mt-3 text-4xl">Histórico</h1>
      <p className="mt-3 text-[14px] text-mist/60">
        Também disponível no seu <a href="#/perfil" className="text-lilac hover:text-star">perfil</a>.
      </p>
      <div className="mt-8">
        <HistoricoLista />
      </div>
    </main>
  )
}
