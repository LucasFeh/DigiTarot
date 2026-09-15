import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'
import { SPREADS } from '../data/spreads'
import type { Sessao } from '../lib/backend'
import LoginPage from './LoginPage'

function quando(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TiragemPage() {
  const { usuario, carregando, backend } = useAuth()
  const [abertas, setAbertas] = useState<Sessao[]>([])
  const [criando, setCriando] = useState(false)

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

  const abrirMesa = async () => {
    if (!backend || criando) return
    setCriando(true)
    try {
      const id = await backend.criarSessao({
        tarologoUid: usuario.uid,
        tarologoNome: usuario.nome,
        spreadId: SPREADS[0].id,
        // `panoId` não é mais escrito: sessão nova já nasce no modelo de
        // escolha por pessoa, e quem resolve o pano é `escolhasDaSessao`.
        visualTarologo: { baralhoId: null, panoId: null },
        cartas: [],
        encerrada: false,
        titulo: `Leitura de ${new Date().toLocaleDateString('pt-BR')}`,
      })
      irPara(`/tiragem/${id}`)
    } finally {
      setCriando(false)
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-5 py-14">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[13px] uppercase tracking-[0.42em] text-lilac/80">Tiragem digital</p>
        <h1 className="text-nebula mt-3 text-4xl">
          {ehTarologo ? 'Sua mesa' : `Olá, ${usuario.nome.split(' ')[0]}`}
        </h1>
        <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-mist">
          {ehTarologo
            ? 'Abra uma mesa, escolha o layout e vá posicionando as cartas. Quem entrar na sala acompanha ao vivo.'
            : 'Entre numa sala aberta para acompanhar a leitura ao vivo. As cartas aparecem conforme o tarólogo as põe na mesa.'}
        </p>

        {ehTarologo && (
          <button
            type="button"
            onClick={abrirMesa}
            disabled={criando}
            className="mt-7 rounded-full px-7 py-3.5 text-[16px] font-medium tracking-wide text-star transition disabled:opacity-60"
            style={{
              background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
              boxShadow: '0 12px 40px -14px #c2449d',
            }}
          >
            {criando ? 'Abrindo…' : 'Abrir uma mesa'}
          </button>
        )}
      </motion.div>

      {/* ----------------------------- salas abertas ----------------------------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl text-star">Salas abertas</h2>

        {abertas.length === 0 ? (
          <p className="glass mt-4 rounded-2xl px-5 py-8 text-center text-[15px] text-mist/70">
            Nenhuma sala aberta no momento.
            {!ehTarologo && ' Quando o tarólogo abrir uma mesa, ela aparece aqui.'}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {abertas.map((s) => (
              <li key={s.id}>
                <a
                  href={`#/tiragem/${s.id}`}
                  className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition hover:border-gold/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[17px] text-star">{s.titulo}</span>
                    <span className="mt-0.5 block text-[13px] text-mist/70">
                      com {s.tarologoNome} · {quando(s.criadaEm)} · {s.cartas.length}{' '}
                      {s.cartas.length === 1 ? 'carta' : 'cartas'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-[13px] text-gold">
                    Entrar
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a
        href="#/historico"
        className="mt-10 inline-block text-[15px] text-mist/80 transition hover:text-star"
      >
        Ver histórico de consultas →
      </a>
    </main>
  )
}
