import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { usePerfil } from '../../lib/perfil'
import { calcularArcanoPessoal, calcularIdade } from '../../data/arcanosPessoais'
import AvatarEditavel from '../temas/AvatarEditavel'
import CartaArcanoPessoal from '../perfil/CartaArcanoPessoal'
import type { Agendamento, Sessao } from '../../lib/backend'

const EditorCartaTarologo = lazy(() => import('../perfil/EditorCartaTarologo'))

export type SecaoCamera = 'camera' | 'geral' | 'tiragem' | 'carta'

const campo = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-star outline-none focus:border-gold'

export function GeralCamera() {
  const { usuario } = useAuth()
  const { perfil, salvar, nomeExibido } = usePerfil(usuario)
  if (!usuario) return null
  const arcano = calcularArcanoPessoal(perfil.dataNascimento)
  const idade = calcularIdade(perfil.dataNascimento)

  return <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
      <h2 className="font-display text-xl">Seus dados</h2>
      <p className="mt-1 text-sm text-mist/70">É o que aparece para quem estiver do outro lado da mesa. As alterações são salvas automaticamente.</p>
      <div className="mt-5 flex flex-wrap items-start gap-5">
        <AvatarEditavel foto={perfil.foto || usuario.foto || ''} inicial={nomeExibido.slice(0, 1).toUpperCase()} onFoto={(foto) => salvar({ foto })} />
        <div className="grid min-w-[220px] flex-1 gap-4">
          <label className="grid gap-1 text-sm text-mist">Nome<input className={campo} value={perfil.nome} placeholder={usuario.nome} onChange={(e) => salvar({ nome: e.target.value })} /></label>
          <label className="grid gap-1 text-sm text-mist">WhatsApp ou telefone<input className={campo} inputMode="tel" autoComplete="tel" value={perfil.contato} placeholder="(00) 00000-0000" onChange={(e) => salvar({ contato: e.target.value })} /></label>
          <label className="grid gap-1 text-sm text-mist">Instagram<input className={campo} value={perfil.instagram} placeholder="seu.perfil" onChange={(e) => salvar({ instagram: e.target.value.replace(/^@+/, '') })} /></label>
        </div>
      </div>
    </section>
    <aside className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
        <label className="grid gap-2 text-sm text-gold">Sua data de nascimento
          <input className={campo} type="date" min="1900-01-01" max={new Date().toLocaleDateString('en-CA')} value={perfil.dataNascimento} onChange={(e) => salvar({ dataNascimento: e.target.value })} />
        </label>
        <p className="mt-2 text-xs text-mist/65">A data completa fica privada no seu perfil.</p>
        {idade !== null && <p className="mt-3 text-sm text-mist">Sua idade: {idade} anos</p>}
      </div>
      {arcano ? <div className="mx-auto max-w-[315px]"><p className="mb-4 text-center font-display text-lg text-gold">Seu arcano pessoal é:</p><CartaArcanoPessoal arcano={arcano} /></div> : <p className="rounded-2xl border border-dashed border-gold/30 p-5 text-center text-sm text-mist">Preencha sua data para revelar seu arcano pessoal.</p>}
    </aside>
  </div>
}

const STATUS: Record<Agendamento['status'], string> = {
  aguardando: 'Aguardando pagamento', pago: 'Pagamento em conferência', confirmado: 'Confirmado', cancelado: 'Cancelado',
}

export function TiragensCamera() {
  const { usuario, backend } = useAuth()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])

  useEffect(() => {
    if (!backend || !usuario) return
    const pararAgenda = backend.observarTodosAgendamentos(setAgendamentos)
    const pararSessoes = backend.observarMinhasSessoes(usuario.uid, setSessoes)
    return () => { pararAgenda(); pararSessoes() }
  }, [backend, usuario])

  const minhasSessoes = sessoes.filter((s) => s.tarologoUid === usuario?.uid)
  const meusAgendamentos = agendamentos.filter((a) => a.tarologoUid === usuario?.email?.trim().toLowerCase())
  const consultas = [...meusAgendamentos].sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))

  return <div className="mx-auto max-w-4xl space-y-6">
    <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">As consultas e sessões aparecem aqui. A mesa 3D ainda precisa ser aberta pelo site no computador.</p>
    <section>
      <h2 className="font-display text-xl">Agendamentos</h2>
      {consultas.length === 0 ? <p className="mt-3 rounded-xl border border-white/10 p-5 text-sm text-mist">Nenhum agendamento por enquanto.</p> : <ul className="mt-3 grid gap-3 sm:grid-cols-2">{consultas.map((a) => <li key={a.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><strong>{a.clienteNome}</strong><span className="text-xs text-gold">{STATUS[a.status]}</span></div>
        <p className="mt-2 text-sm text-mist">{a.planoTitulo}</p>
        <p className="mt-1 text-sm text-mist">{a.data.split('-').reverse().join('/')} · {a.hora}</p>
        <button type="button" disabled title="A mesa 3D está disponível apenas no site por enquanto." className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/60 opacity-60">Abrir mesa · em breve</button>
      </li>)}</ul>}
    </section>
    <section>
      <h2 className="font-display text-xl">Sessões</h2>
      {minhasSessoes.length === 0 ? <p className="mt-3 rounded-xl border border-white/10 p-5 text-sm text-mist">Nenhuma sessão ainda.</p> : <ul className="mt-3 grid gap-3 sm:grid-cols-2">{minhasSessoes.map((s) => <li key={s.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><strong>{s.titulo || 'Tiragem'}</strong><span className="text-xs text-gold">{s.encerrada ? 'Encerrada' : 'Aberta'}</span></div>
        <p className="mt-2 text-sm text-mist">{s.clienteNome || 'Sessão particular'} · {new Date(s.criadaEm).toLocaleDateString('pt-BR')}</p>
        <button type="button" disabled title="A mesa 3D está disponível apenas no site por enquanto." className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/60 opacity-60">Abrir mesa · em breve</button>
      </li>)}</ul>}
    </section>
  </div>
}

export function MinhaCartaCamera() {
  return <Suspense fallback={<p className="text-mist">Carregando sua carta…</p>}><EditorCartaTarologo /></Suspense>
}
