import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import CatalogoPlanos from '../components/CatalogoPlanos'
import MinhasConsultas from '../components/agenda/MinhasConsultas'
import AgendaTarologo from '../components/agenda/AgendaTarologo'
import AvisoModoLocal from '../components/AvisoModoLocal'
import LoginPage from './LoginPage'
import type { Agendamento, Sessao } from '../lib/backend'

export default function TiragemPage() {
  const { usuario, carregando, backend } = useAuth()
  const { nomeExibido } = usePerfil(usuario)
  const [minhas, setMinhas] = useState<Agendamento[]>([])
  const [abertas, setAbertas] = useState<Sessao[]>([])

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarMeusAgendamentos(usuario.uid, setMinhas)
  }, [backend, usuario])

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarSessoesAbertas(setAbertas)
  }, [backend, usuario])

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }

  if (!usuario) return <LoginPage />

  const ehTarologo = usuario.papel === 'tarologo'

  // ═══════════════════════════ visão do tarólogo ═══════════════════════════
  if (ehTarologo) {
    return (
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-5 py-14">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Tiragem digital</p>
          <h1 className="text-nebula mt-3 text-4xl">Sua agenda</h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-mist">
            Cada consulta paga abre a própria mesa, e só quando você clicar. O botão acende perto do
            horário marcado do cliente.
          </p>
        </motion.div>

        {abertas.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl text-star">Mesas em andamento</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {abertas.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#/tiragem/${s.id}`}
                    className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition hover:border-gold/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[17px] text-star">
                        {s.titulo}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-mist/70">
                        {s.cartas.length} {s.cartas.length === 1 ? 'carta na mesa' : 'cartas na mesa'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-[13px] text-gold">
                      Voltar à mesa
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl text-star">Consultas marcadas</h2>
          <AgendaTarologo />
        </section>
      </main>
    )
  }

  // ═══════════════════════════ visão do cliente ═══════════════════════════
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-5 py-14">
      <AvisoModoLocal />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Tiragem digital</p>
        <h1 className="text-nebula mt-3 text-4xl">Olá, {nomeExibido.split(' ')[0]}</h1>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-mist">
          Escolha a consulta, marque o dia e o horário e pague pelo Pix. No horário marcado, a mesa
          abre aqui — e ela é só sua.
        </p>
      </motion.div>

      {minhas.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl text-star">Suas consultas</h2>
          <MinhasConsultas />
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-xl text-star">Catálogo</h2>
        <p className="mt-1.5 text-[15px] text-mist/75">
          Todas as modalidades e seus valores.
        </p>
        <div className="mt-6">
          <CatalogoPlanos destino={(id) => `#/agendar/${id}`} />
        </div>
      </section>
    </main>
  )
}
