import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { SPREADS } from '../../data/spreads'
import { formatPriceFull } from '../../data/plans'
import SeloStatus from '../agenda/SeloStatus'
import type { Convite } from '../../lib/backend'

const CAMPO =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/40 focus:border-lilac/60'

/** O endereço completo do convite, pronto para colar numa conversa. */
function linkDo(token: string) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/convite/${token}`
}

function quando(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/**
 * A criação numa janela, e não num formulário sempre aberto no topo.
 *
 * O formulário fixo empurrava a lista para baixo e ocupava a tela toda mesmo
 * nos dias em que não se cria sessão nenhuma — que são quase todos. A lista é o
 * que se olha; criar é o que se faz de vez em quando.
 */
function JanelaNovaSessao({
  aoFechar,
  aoCriar,
  ocupado,
  erro,
}: {
  aoFechar: () => void
  aoCriar: (dados: { titulo: string; descricao: string; preco: number }) => void
  ocupado: boolean
  erro: string | null
}) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = antes
    }
  }, [aoFechar])

  const valor = Number(preco.replace(',', '.'))
  const pronto = titulo.trim().length > 2 && valor > 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nova sessão particular"
      onClick={aoFechar}
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      style={{ background: 'rgba(3,0,10,.86)', backdropFilter: 'blur(8px)' }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (pronto) aoCriar({ titulo: titulo.trim(), descricao: descricao.trim(), preco: valor })
        }}
        className="glass w-full max-w-lg rounded-2xl p-7"
      >
        <h3 className="font-display text-xl text-star">Nova sessão particular</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-mist/70">
          Quem receber o link não precisa criar conta: abre, diz o nome, paga pelo Pix e espera você
          liberar.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nome da consulta — ex.: Leitura combinada"
            className={CAMPO}
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            placeholder="O que está incluído (opcional) — a pessoa lê isto antes de pagar"
            className={`${CAMPO} resize-y leading-relaxed`}
          />
          <label className="flex items-center gap-2">
            <span className="text-[15px] text-mist/70">R$</span>
            <input
              value={preco}
              onChange={(e) => setPreco(e.target.value.replace(/[^\d,.]/g, ''))}
              placeholder="150"
              inputMode="decimal"
              className={`${CAMPO} w-36`}
            />
          </label>
        </div>

        {erro && (
          <p className="mt-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
            {erro}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-mist transition hover:text-star"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!pronto || ocupado}
            className="rounded-full px-7 py-2.5 text-[15px] font-medium text-star transition disabled:opacity-40"
            style={{
              background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
              boxShadow: '0 12px 34px -14px #c2449d',
            }}
          >
            {ocupado ? 'Criando…' : 'Criar sessão'}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Sessões particulares: uma mesa avulsa, fora do catálogo e fora da agenda.
 *
 * A lista é uma tabela de verdade — uma linha por sessão, colunas alinhadas —
 * porque o que se faz aqui é comparar e agir: ver o valor, achar a que ainda
 * não foi paga, copiar um link. Em cartões empilhados, cada valor fica num
 * lugar diferente e o olho tem que procurar.
 */
export default function SessaoParticular() {
  const { usuario, backend } = useAuth()
  const [convites, setConvites] = useState<Convite[]>([])
  const [janela, setJanela] = useState(false)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarMeusConvites(usuario.uid, setConvites)
  }, [backend, usuario])

  if (!usuario) return null

  const copiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(linkDo(token))
      setCopiado(token)
      setTimeout(() => setCopiado(null), 2500)
    } catch {
      // Área de transferência bloqueada: o link continua visível na linha.
    }
  }

  const criar = async (dados: { titulo: string; descricao: string; preco: number }) => {
    if (!backend || criando) return
    setErro(null)
    setCriando(true)
    try {
      const token = await backend.criarConvite({
        tarologoUid: usuario.uid,
        tarologoNome: usuario.nome,
        titulo: dados.titulo,
        descricao: dados.descricao,
        preco: dados.preco,
        convidadoNome: '',
        status: 'aguardando',
        codigo: `TAROT${Date.now().toString(36).toUpperCase()}`,
      })
      setJanela(false)
      void copiar(token)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a sessão.')
    } finally {
      setCriando(false)
    }
  }

  /**
   * Confirmar o pagamento JÁ ABRE a mesa.
   *
   * Eram dois cliques, e o segundo era invisível do outro lado: a pessoa via
   * "pagamento confirmado" e continuava esperando, sem nada para clicar, até o
   * tarólogo lembrar de abrir a sala. Como aqui não há horário marcado, separar
   * as duas ações só criava uma espera que ninguém entendia.
   */
  const confirmar = async (c: Convite) => {
    if (!backend || ocupado) return
    setErro(null)
    setOcupado(c.token)
    try {
      const id =
        c.sessaoId ??
        (await backend.criarSessao({
          tarologoUid: usuario.uid,
          tarologoNome: usuario.nome,
          clienteNome: c.convidadoNome || 'Convidado',
          spreadId: SPREADS[0].id,
          visualTarologo: { baralhoId: null, panoId: null },
          cartas: [],
          encerrada: false,
          titulo: `${c.titulo} — ${c.convidadoNome || 'convidado'}`,
          // Sem `clienteUid`: quem entra não tem conta. É o id imprevisível da
          // própria mesa que faz as vezes de senha, e `publica` é o que autoriza
          // as regras a liberarem a leitura por id.
          publica: true,
          conviteToken: c.token,
        }))
      await backend.atualizarConvite(c.token, { status: 'confirmado', sessaoId: id })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a mesa.')
    } finally {
      setOcupado(null)
    }
  }

  // As colunas, uma vez só: o cabeçalho e as linhas precisam da MESMA grade,
  // senão o alinhamento se perde na primeira mudança.
  //
  // A faixa das ações é FIXA, e não `auto`. Com `auto` ela se mede pelo que tem
  // dentro — e o que tem dentro muda de linha para linha ("Confirmar pagamento"
  // é bem mais largo que "Entrar na mesa") e também no cabeçalho, onde só há a
  // palavra "Ações". Cada linha ganhava então uma sobra diferente para dividir
  // entre as faixas `fr`, e nada ficava embaixo do seu próprio rótulo.
  const COLUNAS = 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,2.4fr) 296px'

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 font-display text-xl text-star">Sessão particular</h2>
          <p className="max-w-lg text-[14px] leading-relaxed text-mist/70">
            Uma mesa fora da agenda, com valor combinado por você. Gera um link — quem recebe não
            precisa criar conta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErro(null)
            setJanela(true)
          }}
          className="shrink-0 rounded-full px-6 py-3 text-[15px] font-medium text-star transition"
          style={{
            background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
            boxShadow: '0 12px 34px -14px #c2449d',
          }}
        >
          ✦ Criar sessão
        </button>
      </div>

      {erro && !janela && (
        <p className="mb-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
          {erro}
        </p>
      )}

      {convites.length === 0 ? (
        <p className="glass rounded-2xl px-5 py-10 text-center text-[15px] text-mist/70">
          Nenhuma sessão particular ainda. Crie uma e mande o link para quem quiser.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {/* O cabeçalho some no celular: lá as linhas viram blocos empilhados,
              e uma fila de rótulos soltos no topo não se liga a nada. */}
          <div
            className="hidden gap-4 border-b border-white/10 bg-white/5 px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-mist/60 lg:grid"
            style={{ gridTemplateColumns: COLUNAS }}
          >
            <span>Consulta</span>
            <span>Valor</span>
            <span>Criada</span>
            <span>Link do convite</span>
            <span className="text-right">Ações</span>
          </div>

          <ul className="divide-y divide-white/8">
            {convites.map((c) => (
              <li
                key={c.token}
                className="grid items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-white/[0.03] lg:grid"
                style={{ gridTemplateColumns: COLUNAS }}
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-[16px] text-star">{c.titulo}</p>
                  <p className="mt-1 flex items-center gap-2 text-[13px] text-mist/60">
                    {/* O selo acompanha o nome, e não os botões: ali ele mudava
                        de largura a cada estado e empurrava as colunas. */}
                    <SeloStatus status={c.status} />
                    <span className="min-w-0 truncate">{c.convidadoNome || 'ainda sem convidado'}</span>
                  </p>
                </div>

                <span className="font-display text-[16px] text-gold">
                  {formatPriceFull(c.preco)}
                </span>

                <span className="text-[14px] text-mist/70">{quando(c.criadoEm)}</span>

                <span className="min-w-0">
                  <span className="block truncate rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-mist/65">
                    {linkDo(c.token)}
                  </span>
                </span>

                <span className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void copiar(c.token)}
                    className="rounded-full border border-white/25 px-4 py-1.5 text-[14px] text-star transition hover:border-gold/60"
                  >
                    {copiado === c.token ? 'Copiado' : 'Copiar link'}
                  </button>

                  {c.sessaoId ? (
                    <a
                      href={`#/tiragem/${c.sessaoId}`}
                      className="rounded-full px-4 py-1.5 text-[14px] font-medium text-star transition"
                      style={{
                        background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                        boxShadow: '0 10px 26px -14px #c2449d',
                      }}
                    >
                      Entrar na mesa
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={ocupado === c.token || c.status === 'cancelado'}
                      onClick={() => void confirmar(c)}
                      className="rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-[14px] text-gold transition hover:bg-gold/20 disabled:opacity-40"
                    >
                      {ocupado === c.token ? 'Abrindo…' : 'Confirmar pagamento'}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-mist/55">
        Quem tiver o link entra na mesa — foi a forma escolhida para dispensar o cadastro. Trate-o
        como uma chave: mande direto para a pessoa, e não em grupo.
      </p>

      {janela && (
        <JanelaNovaSessao
          aoFechar={() => setJanela(false)}
          aoCriar={(d) => void criar(d)}
          ocupado={criando}
          erro={erro}
        />
      )}
    </div>
  )
}
