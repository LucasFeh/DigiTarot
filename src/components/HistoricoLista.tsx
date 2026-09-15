import { useEffect, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { SPREAD_BY_ID } from '../data/spreads'
import type { Sessao } from '../lib/backend'

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * As consultas de quem está logado. Extraído da página para servir também ao
 * perfil, que é onde o histórico passou a morar.
 */
export default function HistoricoLista() {
  const { usuario, backend } = useAuth()
  const [sessoes, setSessoes] = useState<Sessao[]>([])

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarMinhasSessoes(usuario.uid, setSessoes)
  }, [backend, usuario])

  if (!usuario) return null

  if (sessoes.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center">
        <span className="block text-4xl text-gold/70" aria-hidden>
          ◈
        </span>
        <p className="mt-4 text-[16px] text-mist">Nenhuma consulta por aqui ainda.</p>
        <a
          href="#/tiragem"
          className="mt-6 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
        >
          Ir para a tiragem digital
        </a>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
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
                  <p className="truncate font-display text-[17px] text-star">{s.titulo}</p>
                  <p className="mt-1 text-[13px] text-mist/70">{quando(s.criadaEm)}</p>
                </div>
                <span
                  className="shrink-0 rounded-full border px-3 py-1 text-[12px] uppercase tracking-[0.12em]"
                  style={{
                    borderColor: s.encerrada ? '#ffffff22' : '#f2d49255',
                    color: s.encerrada ? '#cbbde8' : '#f2d492',
                  }}
                >
                  {s.encerrada ? 'encerrada' : 'aberta'}
                </span>
              </div>
              <p className="mt-3 text-[14px] text-mist/80">
                {spread?.nome} · {reveladas} de {s.cartas.length}{' '}
                {s.cartas.length === 1 ? 'carta revelada' : 'cartas reveladas'}
                {s.tarologoUid === usuario.uid ? ' · você conduziu' : ` · com ${s.tarologoNome}`}
              </p>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
