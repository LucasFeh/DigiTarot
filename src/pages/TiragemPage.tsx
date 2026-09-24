import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import LayoutPainel, { type ItemMenu } from '../components/painel/LayoutPainel'
import SessaoParticular from '../components/painel/SessaoParticular'
import CarrosselPlanos from '../components/CarrosselPlanos'
import MinhasConsultas from '../components/agenda/MinhasConsultas'
import AgendaTarologo from '../components/agenda/AgendaTarologo'
import AvisoModoLocal from '../components/AvisoModoLocal'
import AcervoTemas from '../components/temas/AcervoTemas'
import MiniBaralho from '../components/temas/MiniBaralho'
import { useTema } from '../lib/temas/useTema'
import { useArtePano } from '../lib/temas/useArte'
import { PREFIXO_TEMA, panoEmbutidoDe } from '../lib/temas/visibilidade'
import LoginPage from './LoginPage'
import type { Agendamento, Sessao } from '../lib/backend'
import type { Aba, Tema, TemaBaralho, TemaPano, TipoTema } from '../lib/temas/tipos'

type Secao = 'agendas' | 'particular' | 'temas'
type SubAgenda = 'agendar' | 'conferir'

function PainelTiragem({
  embutido,
  titulo,
  subtitulo,
  avatar,
  itens,
  atual,
  aoEscolher,
  children,
}: {
  embutido: boolean
  titulo: string
  subtitulo: string
  avatar: ReactNode
  itens: ItemMenu<Secao>[]
  atual: Secao
  aoEscolher: (secao: Secao) => void
  children: ReactNode
}) {
  if (embutido) {
    return (
      <div>
        <div className="mb-7 flex flex-wrap gap-2 border-b border-white/10 pb-5" aria-label="Seções da tiragem">
          {itens.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => aoEscolher(item.id)}
              aria-current={atual === item.id ? 'page' : undefined}
              className={`rounded-full border px-4 py-2 text-[14px] transition ${atual === item.id ? 'border-gold/60 bg-gold/15 text-star' : 'border-white/15 text-mist hover:border-gold/40 hover:text-star'}`}
            >
              <span aria-hidden className="mr-2 text-gold">{item.icone}</span>
              {item.rotulo}
              {Boolean(item.contagem) && <span className="ml-2 text-gold">{item.contagem}</span>}
            </button>
          ))}
        </div>
        {children}
      </div>
    )
  }

  return (
    <LayoutPainel titulo={titulo} subtitulo={subtitulo} avatar={avatar} itens={itens} atual={atual} aoEscolher={aoEscolher}>
      {children}
    </LayoutPainel>
  )
}

/** Avatar do menu: foto do perfil, ou a inicial do nome. */
function Avatar({ nome, foto }: { nome: string; foto?: string }) {
  if (foto) return <img src={foto} alt="" className="h-11 w-11 rounded-full object-cover" />
  return (
    <span className="grid h-11 w-11 place-items-center rounded-full bg-violet/40 text-[18px] font-semibold text-star">
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * A seção de temas, que antes vivia no perfil.
 *
 * Mudou de lugar porque o tema é escolhido para a MESA, e é na tiragem que a
 * pessoa está quando pensa nele — no perfil, ao lado do e-mail e da senha, ele
 * parecia configuração de conta.
 */
function SecaoTemas() {
  const { usuario } = useAuth()
  const { perfil, salvar } = usePerfil(usuario)
  const [tipo, setTipo] = useState<TipoTema>('baralho')
  const [aba, setAba] = useState<Aba>('comunidade')
  const [selecao, setSelecao] = useState<Tema | null>(null)

  const padraoBaralho = useTema<TemaBaralho>(perfil.padrao.baralhoId, 'baralho')
  const padraoPano = useTema<TemaPano>(perfil.padrao.panoId, 'pano')
  const fundoPano = useArtePano(padraoPano.tema, panoEmbutidoDe(perfil.padrao.panoId))

  const atual = tipo === 'baralho' ? perfil.padrao.baralhoId : perfil.padrao.panoId
  const refDe = (t: Tema) => (t.tipo === 'pano' ? `${PREFIXO_TEMA}${t.id}` : t.id)
  const jaEhPadrao = selecao ? refDe(selecao) === atual : false

  const definirPadrao = (t: Tema) =>
    salvar({
      padrao: {
        ...perfil.padrao,
        [t.tipo === 'baralho' ? 'baralhoId' : 'panoId']: refDe(t),
      },
    })

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/12"
        style={{
          backgroundImage: `url("${fundoPano}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Véu: sem ele o texto some sobre um pano claro. */}
        <div aria-hidden className="absolute inset-0 bg-void/62" />
        <div className="relative flex flex-wrap items-center gap-6 p-7">
          <MiniBaralho tema={padraoBaralho.tema} largura={112} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] uppercase tracking-[0.18em] text-gold/80">Seu padrão</p>
            <h2 className="mt-1 font-display text-2xl text-star">
              {padraoBaralho.tema?.nome ?? 'Rider-Waite'}
            </h2>
            <p className="mt-1 text-[14px] text-mist/80">
              sobre {padraoPano.tema?.nome ?? 'Roda da Lua'}
            </p>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-mist/70">
              É com este par que você entra em toda leitura. Dentro da sala dá para trocar só para
              aquela leitura, sem mexer aqui.
            </p>
            {padraoBaralho.estado === 'ausente' && (
              <p className="mt-2 text-[13px] text-gold/90">
                O baralho escolhido não está neste dispositivo.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="glass flex min-h-[54vh] flex-col rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-display text-[18px] text-star">Seu conjunto de decks</h2>
          <a
            href="#/temas/novo"
            className="rounded-full border border-white/25 px-4 py-1.5 text-[14px] text-star transition hover:border-gold/60"
          >
            ✦ Criar um tema
          </a>
        </div>

        <p className="mb-4 text-[14px] leading-relaxed text-mist/70">
          Use o marcador no canto do tema para guardar o que você quer levar para a mesa — só o que estiver no seu conjunto
          aparece durante a leitura. Clique num tema para selecioná-lo e defina-o como padrão.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['baralho', 'pano'] as TipoTema[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipo(t)
                setSelecao(null)
              }}
              className="rounded-full px-4 py-1.5 text-[14px] transition"
              style={{
                color: tipo === t ? '#fff' : '#cbbde8',
                background: tipo === t ? '#ffffff14' : 'transparent',
                boxShadow: tipo === t ? '0 0 22px -8px var(--color-violet)' : 'none',
              }}
            >
              {t === 'baralho' ? 'Baralhos' : 'Panos'}
            </button>
          ))}

          {selecao && (
            <span className="ml-auto flex items-center gap-2">
              <span className="max-w-[180px] truncate text-[14px] text-mist/75">{selecao.nome}</span>
              <button
                type="button"
                disabled={jaEhPadrao}
                onClick={() => definirPadrao(selecao)}
                className="rounded-full px-4 py-1.5 text-[14px] font-medium text-star transition disabled:opacity-40"
                style={{
                  background: jaEhPadrao ? '#ffffff12' : 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                }}
              >
                {jaEhPadrao ? 'Já é o padrão' : 'Definir como padrão'}
              </button>
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1">
          <AcervoTemas
            tipo={tipo}
            aba={aba}
            onAba={(a) => {
              setAba(a)
              setSelecao(null)
            }}
            selecionado={selecao?.id ?? null}
            onEscolher={setSelecao}
          />
        </div>
      </div>
    </div>
  )
}

export default function TiragemPage({ embutido = false }: { embutido?: boolean }) {
  const { usuario, carregando, backend } = useAuth()
  const { perfil, nomeExibido } = usePerfil(usuario)
  const [secao, setSecao] = useState<Secao>('agendas')
  const [sub, setSub] = useState<SubAgenda>('agendar')
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
  const foto = perfil.foto || usuario.foto
  const avatar = <Avatar nome={nomeExibido} foto={foto} />

  // ═══════════════════════════ visão do tarólogo ═══════════════════════════
  if (ehTarologo) {
    const pendentes = 0
    const itens: ItemMenu<Secao>[] = [
      { id: 'agendas', rotulo: 'Agendas', icone: '☾', contagem: pendentes },
      { id: 'particular', rotulo: 'Sessão particular', icone: '❖' },
      { id: 'temas', rotulo: 'Temas', icone: '✦' },
    ]

    return (
      <PainelTiragem
        embutido={embutido}
        titulo={nomeExibido}
        subtitulo="sua mesa digital"
        avatar={avatar}
        itens={itens}
        atual={secao}
        aoEscolher={setSecao}
      >
        <AvisoModoLocal />

        {secao === 'agendas' && (
          <div>
            <h2 className="mb-1 font-display text-xl text-star">Agendas</h2>
            <p className="mb-6 max-w-lg text-[14px] leading-relaxed text-mist/70">
              Quem marcou com você. Cada consulta paga abre a própria mesa, exclusiva daquele
              cliente, quando você clicar em “Abrir mesa” — o botão acende 15 minutos antes do
              horário.
            </p>

            {abertas.length > 0 && (
              <section className="mb-8">
                <h3 className="mb-3 font-display text-[17px] text-star">Mesas em andamento</h3>
                <ul className="flex flex-col gap-2">
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
                            {s.cartas.length}{' '}
                            {s.cartas.length === 1 ? 'carta na mesa' : 'cartas na mesa'}
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

            <AgendaTarologo />
          </div>
        )}

        {secao === 'particular' && <SessaoParticular />}
        {secao === 'temas' && <SecaoTemas />}
      </PainelTiragem>
    )
  }

  // ═══════════════════════════ visão do cliente ═══════════════════════════
  const emAberto = minhas.filter((a) => a.status !== 'cancelado').length
  const itens: ItemMenu<Secao>[] = [
    { id: 'agendas', rotulo: 'Agendamentos', icone: '☾', contagem: emAberto },
    { id: 'temas', rotulo: 'Temas', icone: '✦' },
  ]

  return (
    <PainelTiragem
      embutido={embutido}
      titulo={nomeExibido}
      subtitulo="tiragem digital"
      avatar={avatar}
      itens={itens}
      atual={secao === 'particular' ? 'agendas' : secao}
      aoEscolher={setSecao}
    >
      <AvisoModoLocal />

      {secao !== 'temas' ? (
        <div>
          <h2 className="mb-1 font-display text-xl text-star">Agendamentos</h2>
          <p className="mb-5 max-w-lg text-[14px] leading-relaxed text-mist/70">
            Escolha a consulta, marque o dia e o horário e pague pelo Pix. No horário marcado, a
            mesa abre aqui — e ela é só sua.
          </p>

          {/* ---------------------------- sub-abas ---------------------------- */}
          <div className="mb-6 flex gap-1 border-b border-white/10">
            {(
              [
                ['agendar', 'Agendar'],
                ['conferir', 'Conferir agendamento'],
              ] as const
            ).map(([id, rotulo]) => {
              const on = sub === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSub(id)}
                  aria-current={on ? 'true' : undefined}
                  className="relative px-4 py-3 text-[15px] tracking-wide transition"
                  style={{ color: on ? '#fff' : '#cbbde8' }}
                >
                  {rotulo}
                  {id === 'conferir' && emAberto > 0 && (
                    <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[12px] text-gold">
                      {emAberto}
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold transition-opacity"
                    style={{ opacity: on ? 1 : 0 }}
                  />
                </button>
              )
            })}
          </div>

          {sub === 'agendar' ? (
            /* Sem tabela: quem quer comparar valores usa o modo "Leque" do
               próprio baralho, que mostra todas as cartas com os preços. Duas
               formas de dizer a mesma coisa na mesma página faziam a segunda
               parecer sobra da primeira. */
            <CarrosselPlanos destino={(id) => `#/agendar/${id}`} />
          ) : (
            <MinhasConsultas />
          )}
        </div>
      ) : (
        <SecaoTemas />
      )}
    </PainelTiragem>
  )
}
