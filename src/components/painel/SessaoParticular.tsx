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
 * Sessões particulares: uma mesa avulsa, fora do catálogo e fora da agenda.
 *
 * O tarólogo combina o valor por fora, gera um link e manda para quem quiser.
 * Do outro lado não há cadastro — a pessoa abre, diz o nome, paga e espera ser
 * liberada. Serve para o que a agenda não cobre: um amigo, um preço combinado,
 * uma consulta fora de hora.
 */
export default function SessaoParticular() {
  const { usuario, backend } = useAuth()
  const [convites, setConvites] = useState<Convite[]>([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarMeusConvites(usuario.uid, setConvites)
  }, [backend, usuario])

  if (!usuario) return null

  const valor = Number(preco.replace(',', '.'))
  const pronto = titulo.trim().length > 2 && valor > 0

  const criar = async () => {
    if (!backend || !pronto || criando) return
    setErro(null)
    setCriando(true)
    try {
      const token = await backend.criarConvite({
        tarologoUid: usuario.uid,
        tarologoNome: usuario.nome,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        preco: valor,
        convidadoNome: '',
        status: 'aguardando',
        codigo: `TAROT${Date.now().toString(36).toUpperCase()}`,
      })
      setTitulo('')
      setDescricao('')
      setPreco('')
      void copiar(token)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a sessão.')
    } finally {
      setCriando(false)
    }
  }

  const copiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(linkDo(token))
      setCopiado(token)
      setTimeout(() => setCopiado(null), 2500)
    } catch {
      // Área de transferência bloqueada: o link continua visível na tela.
    }
  }

  /**
   * Confirmar o pagamento JÁ ABRE a mesa.
   *
   * Eram dois cliques, e o segundo era invisível do outro lado: a pessoa via
   * "pagamento confirmado" e continuava esperando, sem nada para clicar, até o
   * tarólogo lembrar de abrir a sala. Como aqui não há horário marcado — a
   * sessão particular acontece quando os dois estão a postos —, separar as duas
   * ações só criava uma espera que ninguém entendia.
   */
  const confirmar = async (c: Convite) => {
    if (!backend || !usuario || ocupado) return
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

  return (
    <div className="max-w-3xl">
      <h2 className="mb-1 font-display text-xl text-star">Sessão particular</h2>
      <p className="mb-6 max-w-lg text-[14px] leading-relaxed text-mist/70">
        Uma mesa fora da agenda, com valor combinado por você. Gera um link — quem recebe não
        precisa criar conta: abre, diz o nome, paga pelo Pix e espera você liberar.
      </p>

      {/* ------------------------------ criar ------------------------------ */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display text-[17px] text-star">Nova sessão</h3>
        <div className="mt-4 flex flex-col gap-3">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nome da consulta — ex.: Leitura combinada"
            className={CAMPO}
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            placeholder="O que está incluído (opcional) — a pessoa lê isto antes de pagar"
            className={`${CAMPO} resize-y leading-relaxed`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-[14px] text-mist/70">R$</span>
              <input
                value={preco}
                onChange={(e) => setPreco(e.target.value.replace(/[^\d,.]/g, ''))}
                placeholder="150"
                inputMode="decimal"
                className={`${CAMPO} w-32`}
              />
            </label>
            <button
              type="button"
              disabled={!pronto || criando}
              onClick={() => void criar()}
              className="rounded-full px-6 py-3 text-[15px] font-medium text-star transition disabled:opacity-40"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 12px 34px -14px #c2449d',
              }}
            >
              {criando ? 'Criando…' : 'Criar e copiar o link'}
            </button>
          </div>
        </div>
        {erro && (
          <p className="mt-4 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[14px] text-rose">
            {erro}
          </p>
        )}
      </div>

      {/* ------------------------------ lista ------------------------------ */}
      <h3 className="mb-3 mt-8 font-display text-[17px] text-star">Sessões criadas</h3>

      {convites.length === 0 ? (
        <p className="glass rounded-2xl px-5 py-8 text-center text-[15px] text-mist/70">
          Nenhuma sessão particular ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {convites.map((c) => (
            <li key={c.token} className="glass rounded-2xl px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[17px] text-star">{c.titulo}</p>
                  <p className="mt-0.5 text-[14px] text-mist/75">
                    {formatPriceFull(c.preco)} ·{' '}
                    {c.convidadoNome ? (
                      <span className="text-star">{c.convidadoNome}</span>
                    ) : (
                      'ainda sem convidado'
                    )}{' '}
                    · criada em {quando(c.criadoEm)}
                  </p>
                </div>
                <SeloStatus status={c.status} />
              </div>

              <p className="mt-3 truncate rounded-xl border border-white/12 bg-white/5 px-3 py-2 font-mono text-[12px] text-mist/70">
                {linkDo(c.token)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                <button
                  type="button"
                  onClick={() => void copiar(c.token)}
                  className="rounded-full border border-white/25 px-5 py-2 text-[15px] text-star transition hover:border-gold/60"
                >
                  {copiado === c.token ? 'Link copiado' : 'Copiar link'}
                </button>

                {c.sessaoId ? (
                  <a
                    href={`#/tiragem/${c.sessaoId}`}
                    className="rounded-full px-5 py-2 text-[15px] font-medium text-star transition"
                    style={{
                      background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                      boxShadow: '0 10px 30px -14px #c2449d',
                    }}
                  >
                    Entrar na mesa
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={ocupado === c.token || c.status === 'cancelado'}
                    onClick={() => void confirmar(c)}
                    className="rounded-full px-5 py-2 text-[15px] font-medium text-star transition disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                      boxShadow: '0 10px 30px -14px #c2449d',
                    }}
                  >
                    {ocupado === c.token ? 'Abrindo…' : 'Confirmar pagamento e abrir a mesa'}
                  </button>
                )}
              </div>

              {c.sessaoId && (
                <p className="mt-2 text-[13px] text-mist/55">
                  A mesa já abriu no aparelho de quem tem o link — sem precisar recarregar nada.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-[13px] leading-relaxed text-mist/75">
        Quem tiver o link entra na mesa — foi a forma escolhida para dispensar o cadastro. Trate-o
        como uma chave: mande direto para a pessoa, e não em grupo.
      </p>
    </div>
  )
}
