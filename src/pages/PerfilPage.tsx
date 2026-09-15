import { useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { usePerfil } from '../lib/perfil'
import { useTema } from '../lib/temas/useTema'
import { useArtePano } from '../lib/temas/useArte'
import { PREFIXO_TEMA, panoEmbutidoDe } from '../lib/temas/visibilidade'
import AcervoTemas from '../components/temas/AcervoTemas'
import MiniBaralho from '../components/temas/MiniBaralho'
import AvatarEditavel from '../components/temas/AvatarEditavel'
import SecaoConta from '../components/perfil/SecaoConta'
import MinhasConsultas from '../components/agenda/MinhasConsultas'
import AgendaTarologo from '../components/agenda/AgendaTarologo'
import HistoricoLista from '../components/HistoricoLista'
import LoginPage from './LoginPage'
import type { Aba, Tema, TemaBaralho, TemaPano, TipoTema } from '../lib/temas/tipos'

type Secao = 'geral' | 'conta' | 'agenda' | 'temas' | 'historico'

/**
 * O menu muda com o papel: o cliente vê as consultas que marcou, o tarólogo vê
 * a agenda inteira. É a mesma seção, com dois conteúdos — e é aqui que o Rodrigo
 * abre a mesa de cada consulta paga.
 */
const secoesDe = (ehTarologo: boolean): { id: Secao; rotulo: string; icone: string }[] => [
  { id: 'geral', rotulo: 'Geral', icone: '☾' },
  { id: 'conta', rotulo: 'Conta e acesso', icone: '✧' },
  { id: 'agenda', rotulo: ehTarologo ? 'Agenda' : 'Minhas consultas', icone: '❖' },
  { id: 'temas', rotulo: 'Temas', icone: '✦' },
  { id: 'historico', rotulo: 'Histórico de tiragem', icone: '◈' },
]

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  dica,
}: {
  rotulo: string
  valor: string
  onChange: (v: string) => void
  placeholder?: string
  dica?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] uppercase tracking-[0.14em] text-mist/70">{rotulo}</span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition placeholder:text-mist/40 focus:border-lilac/60"
      />
      {dica && <span className="mt-1.5 block text-[13px] text-mist/55">{dica}</span>}
    </label>
  )
}

export default function PerfilPage() {
  const { usuario, carregando } = useAuth()
  const { perfil, salvar, nomeExibido } = usePerfil(usuario)
  const [secao, setSecao] = useState<Secao>('geral')
  const [tipo, setTipo] = useState<TipoTema>('baralho')
  const [aba, setAba] = useState<Aba>('comunidade')
  /** Marcado na grade, ainda não confirmado como padrão. */
  const [selecao, setSelecao] = useState<Tema | null>(null)

  const padraoBaralho = useTema<TemaBaralho>(perfil.padrao.baralhoId, 'baralho')
  const padraoPano = useTema<TemaPano>(perfil.padrao.panoId, 'pano')
  // O pano escolhido vira o fundo desta aba: o baralho fica sobre o pano em
  // que ele vai ser jogado, que é a única forma de ver se os dois combinam.
  const fundoPano = useArtePano(padraoPano.tema, panoEmbutidoDe(perfil.padrao.panoId))

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }
  if (!usuario) return <LoginPage />

  const ehTarologo = usuario.papel === 'tarologo'
  const secoes = secoesDe(ehTarologo)

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
    <main className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* ------------------------ menu, colado à esquerda ------------------------ */}
      <nav className="w-full shrink-0 border-white/10 bg-void/35 backdrop-blur-xl md:w-[300px] md:border-r">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          {perfil.foto ? (
            <img src={perfil.foto} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-violet/40 text-[18px] font-semibold text-star">
              {nomeExibido.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[16px] text-star">{nomeExibido}</span>
            <span className="block truncate text-[12px] uppercase tracking-[0.14em] text-mist/55">
              {ehTarologo ? 'tarólogo' : 'cliente'}
            </span>
          </span>
        </div>

        <div className="flex gap-1 p-2 md:flex-col">
          {secoes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSecao(s.id)}
              aria-current={secao === s.id ? 'page' : undefined}
              className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-[15px] transition md:flex-none"
              style={{
                color: secao === s.id ? '#fff' : '#cbbde8',
                background: secao === s.id ? '#ffffff14' : 'transparent',
                boxShadow: secao === s.id ? 'inset 2px 0 0 var(--color-gold)' : 'none',
              }}
            >
              <span aria-hidden className="text-lilac">
                {s.icone}
              </span>
              {s.rotulo}
            </button>
          ))}
        </div>
      </nav>

      {/* ------------------------------ conteúdo ------------------------------ */}
      <section className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10">
        {secao === 'geral' && (
          <div className="glass max-w-3xl rounded-2xl p-7">
            <h2 className="mb-1 font-display text-xl text-star">Seus dados</h2>
            <p className="mb-6 text-[14px] text-mist/70">
              É o que aparece para quem estiver do outro lado da mesa.
            </p>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <AvatarEditavel
                foto={perfil.foto}
                inicial={nomeExibido.slice(0, 1).toUpperCase()}
                onFoto={(dataUrl) => salvar({ foto: dataUrl })}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <Campo
                  rotulo="Nome"
                  valor={perfil.nome}
                  onChange={(v) => salvar({ nome: v })}
                  placeholder={usuario.nome}
                  dica="Como você quer ser chamada aqui."
                />
                <Campo
                  rotulo="Contato"
                  valor={perfil.contato}
                  onChange={(v) => salvar({ contato: v })}
                  placeholder="WhatsApp, telefone, e-mail…"
                />
                <Campo
                  rotulo="Instagram"
                  valor={perfil.instagram}
                  onChange={(v) => salvar({ instagram: v.replace(/^@+/, '') })}
                  placeholder="seu.perfil"
                  dica="Sem o arroba."
                />
              </div>
            </div>

            <p className="mt-7 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-mist/55">
              Salva sozinho, e fica guardado na sua conta. Quem entra ({usuario.email}) você muda em
              "Conta e acesso".
            </p>
          </div>
        )}

        {secao === 'conta' && <SecaoConta />}

        {secao === 'agenda' && (
          <div className="max-w-3xl">
            <h2 className="mb-1 font-display text-xl text-star">
              {ehTarologo ? 'Agenda' : 'Minhas consultas'}
            </h2>
            <p className="mb-6 max-w-lg text-[14px] leading-relaxed text-mist/70">
              {ehTarologo
                ? 'Tudo que foi marcado. Cada consulta paga abre a própria mesa, exclusiva daquele cliente, quando você clicar em "Abrir mesa" — o botão acende 15 minutos antes do horário.'
                : 'O que você marcou, o pagamento de cada uma e a porta da sua mesa no horário combinado.'}
            </p>
            {ehTarologo ? <AgendaTarologo /> : <MinhasConsultas />}
          </div>
        )}

        {secao === 'temas' && (
          <div className="flex flex-col gap-4">
            {/* --------- o que está definido, sobre o pano definido --------- */}
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
                    É com este par que você entra em toda leitura. Dentro da sala dá para trocar só
                    para aquela leitura, sem mexer aqui.
                  </p>
                  {padraoBaralho.estado === 'ausente' && (
                    <p className="mt-2 text-[13px] text-gold/90">
                      O baralho escolhido não está neste dispositivo.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ------------------- escolher e reunir ------------------- */}
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
                Marque com ★ os temas que você quer levar para a mesa — só o que estiver no seu
                conjunto aparece durante a leitura. Clique num tema para selecioná-lo e defina-o
                como padrão.
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
                    <span className="max-w-[180px] truncate text-[14px] text-mist/75">
                      {selecao.nome}
                    </span>
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
        )}

        {secao === 'historico' && (
          <div className="max-w-3xl">
            <h2 className="mb-1 font-display text-xl text-star">Histórico de tiragem</h2>
            <p className="mb-6 text-[14px] text-mist/70">Tudo em que você participou.</p>
            <HistoricoLista />
          </div>
        )}
      </section>
    </main>
  )
}
