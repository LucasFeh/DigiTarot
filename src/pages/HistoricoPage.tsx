import { useEffect, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { SPREAD_BY_ID } from '../data/spreads'
import type { Sessao } from '../lib/backend'
import LoginPage from './LoginPage'

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoricoPage() {
  const { usuario, carregando, backend } = useAuth()
  const [sessoes, setSessoes] = useState<Sessao[]>([])

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarMinhasSessoes(usuario.uid, setSessoes)
  }, [backend, usuario])

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[13px] text-mist/70">Carregando…</p>
      </main>
    )
  }

  if (!usuario) return <LoginPage />

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-5 py-14">
      <p className="text-[11px] uppercase tracking-[0.42em] text-lilac/80">Suas consultas</p>
      <h1 className="text-nebula mt-3 text-4xl">Histórico</h1>

      {sessoes.length === 0 ? (
        <div className="glass mt-8 rounded-2xl px-6 py-12 text-center">
          <span className="block text-4xl" aria-hidden>
            🔮
          </span>
          <p className="mt-4 text-[14px] text-mist">Nenhuma consulta por aqui ainda.</p>
          <a
            href="#/tiragem"
            className="mt-6 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[13px] text-star transition hover:border-gold/60"
          >
            Ir para a tiragem digital
          </a>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {sessoes.map((s) => {
            const spread = SPREAD_BY_ID.get(s.spreadId)
            const reveladas = s.cartas.filter((c) => c.revelada).length
            return (
              <li key={s.id}>
                <a
                  href={`#/tiragem/${s.id}`}
                  className="glass block rounded-2xl px-5 py-4 transition hover:border-gold/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-[15px] text-star">{s.titulo}</p>
                      <p className="mt-1 text-[11px] text-mist/70">{quando(s.criadaEm)}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
                      style={{
                        borderColor: s.encerrada ? '#ffffff22' : '#f2d49255',
                        color: s.encerrada ? '#cbbde8' : '#f2d492',
                      }}
                    >
                      {s.encerrada ? 'encerrada' : 'aberta'}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-mist/80">
                    {spread?.nome} · {reveladas} de {s.cartas.length}{' '}
                    {s.cartas.length === 1 ? 'carta revelada' : 'cartas reveladas'}
                    {s.tarologoUid === usuario.uid ? ' · você conduziu' : ` · com ${s.tarologoNome}`}
                  </p>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
