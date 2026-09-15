import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'
import { repoTemas } from '../lib/temas'
import { ErroDeCota } from '../lib/temas/db'
import { casarLote } from '../lib/temas/casar'
import { ALVO, corMedia, prepararLote } from '../lib/temas/imagens'
import {
  aplicarOrdemCanonica,
  iniciarConferencia,
  montarEntrada,
  reduzir,
  resumo,
} from '../lib/temas/conferencia'
import GradeConferencia from '../components/temas/GradeConferencia'
import LoginPage from './LoginPage'
import type { Conferencia, ItemImportado, ProgressoEnvio, TipoTema } from '../lib/temas/tipos'

type Passo = 'enviar' | 'conferir' | 'salvar'

/** O assistente de criação de tema, do envio ao salvamento. */
export default function CriarTemaPage() {
  const { usuario, carregando } = useAuth()
  const [tipo, setTipo] = useState<TipoTema>('baralho')
  const [passo, setPasso] = useState<Passo>('enviar')
  const [conf, setConf] = useState<Conferencia | null>(null)
  const [progresso, setProgresso] = useState<ProgressoEnvio | null>(null)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [cor, setCor] = useState<string | undefined>()
  const abortar = useRef<AbortController | null>(null)
  const urls = useRef<string[]>([])

  // As miniaturas viram object URL uma vez, e são revogadas ao sair — sem isso
  // um assistente aberto e fechado três vezes deixa 234 URLs vivas.
  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u))
      urls.current = []
      abortar.current?.abort()
    },
    [],
  )

  const receber = useCallback(
    async (lista: FileList | null) => {
      if (!lista?.length) return
      setErro(null)
      const arquivos = [...lista].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name))
      if (!arquivos.length) {
        setErro('Nenhuma imagem reconhecida nesses arquivos.')
        return
      }

      // Um envio por vez: sem abortar o anterior, dois `prepararLote` ficavam
      // vivos escrevendo no mesmo progresso e, no fim, no mesmo `conf`.
      abortar.current?.abort()
      const ac = new AbortController()
      abortar.current = ac
      setProgresso({ feitas: 0, total: arquivos.length, atual: '' })

      // Pano é uma imagem só: não há o que conferir, vai direto para o nome.
      if (tipo === 'pano') {
        const pronto = await prepararLote(
          [{ chave: 'fundo', rotulo: arquivos[0].name, file: arquivos[0] }],
          ALVO.pano,
          setProgresso,
          ac.signal,
        )
        const r = pronto.get('fundo')
        setProgresso(null)
        // Desmontou, ou outro lote começou: este resultado não é de ninguém —
        // e criar object URL aqui vazaria, porque a limpeza já rodou.
        if (ac.signal.aborted) return
        if (!r || 'erro' in r) {
          setErro(r && 'erro' in r ? r.erro : 'Não deu para ler essa imagem.')
          return
        }
        const u = URL.createObjectURL(r.mini.blob)
        urls.current.push(u)
        setCor(await corMedia(r.cheia.blob))
        const item: ItemImportado = {
          id: 'i-0',
          caminho: arquivos[0].name,
          rotulo: arquivos[0].name,
          estado: 'casado',
          alvo: 'fundo',
          palpites: [],
          cheia: r.cheia,
          mini: r.mini,
          miniUrl: u,
        }
        setConf({ itens: [item], porAlvo: new Map([['fundo', 'i-0']]) })
        setPasso('salvar')
        return
      }

      // Baralho: casa pelo nome ANTES de processar o pixel — assim a grade já
      // aparece organizada, e o processamento pesado roda uma vez só.
      const base = casarLote(
        arquivos.map((f) => ({ caminho: f.webkitRelativePath || f.name, rotulo: f.name })),
      )
      const porCaminho = new Map(arquivos.map((f) => [f.webkitRelativePath || f.name, f]))

      const pronto = await prepararLote(
        base.map((i) => ({ chave: i.id, rotulo: i.rotulo, file: porCaminho.get(i.caminho)! })),
        ALVO.carta,
        setProgresso,
        ac.signal,
      )
      setProgresso(null)
      if (ac.signal.aborted) return

      const itens: ItemImportado[] = base.map((i) => {
        const r = pronto.get(i.id)
        if (!r || 'erro' in r) {
          return { ...i, estado: 'ilegivel', alvo: null, erro: r && 'erro' in r ? r.erro : 'cancelado' }
        }
        const u = URL.createObjectURL(r.mini.blob)
        urls.current.push(u)
        return { ...i, cheia: r.cheia, mini: r.mini, miniUrl: u }
      })

      setConf(iniciarConferencia(itens))
      setPasso('conferir')
    },
    [tipo],
  )

  const salvar = async () => {
    if (!conf || !usuario || !nome.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      const entrada = montarEntrada(conf, tipo, nome.trim(), usuario, cor)
      if (entrada.imagens.size === 0) {
        setErro('Nenhuma imagem foi atribuída a uma carta.')
        return
      }
      const t = await repoTemas().salvar(entrada)
      irPara(`/temas/ver/${t.id}`)
    } catch (e) {
      setErro(
        e instanceof ErroDeCota
          ? 'Não há espaço neste navegador para guardar esse tema. Apague um tema antigo e tente de novo.'
          : e instanceof Error
            ? e.message
            : 'Não deu para salvar.',
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Carregando…</p>
      </main>
    )
  }
  if (!usuario) return <LoginPage />

  const r = conf ? resumo(conf) : null

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6">
        <a href="#/temas" className="text-[14px] text-mist/70 transition hover:text-star">
          ← Acervo de temas
        </a>
        <h1 className="mt-2 font-display text-2xl text-nebula">Criar um tema</h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-mist/80">
          Mande as imagens com o nome da carta no arquivo — <em>o-louco.jpg</em>, <em>A Imperatriz.png</em>,{' '}
          <em>as de paus.webp</em>. O que não casar sozinho você acerta na mão.
        </p>
      </header>

      {/* ------------------------------ envio ------------------------------ */}
      {passo === 'enviar' && (
        <section className="glass rounded-2xl p-6">
          <div className="mb-5 flex gap-2">
            {(['baralho', 'pano'] as TipoTema[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className="rounded-full px-4 py-2 text-[15px] tracking-wide transition"
                style={{
                  color: tipo === t ? '#fff' : '#cbbde8',
                  background: tipo === t ? '#ffffff14' : 'transparent',
                  boxShadow: tipo === t ? '0 0 22px -8px var(--color-violet)' : 'none',
                }}
              >
                {t === 'baralho' ? 'Baralho de cartas' : 'Pano da mesa'}
              </button>
            ))}
          </div>

          <label
            className="grid cursor-pointer place-items-center rounded-2xl border border-dashed border-white/20 px-6 py-14 text-center transition hover:border-lilac/60"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void receber(e.dataTransfer.files)
            }}
          >
            <span aria-hidden className="text-3xl text-lilac">
              ✦
            </span>
            <span className="mt-3 text-[16px] text-star">
              {tipo === 'baralho' ? 'Solte as imagens das cartas aqui' : 'Solte a imagem do pano aqui'}
            </span>
            <span className="mt-1 text-[14px] text-mist/70">ou clique para escolher</span>
            <input
              type="file"
              accept="image/*"
              multiple={tipo === 'baralho'}
              className="hidden"
              onChange={(e) => void receber(e.target.files)}
            />
          </label>

          {progresso && (
            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{
                    width: `${(progresso.feitas / Math.max(1, progresso.total)) * 100}%`,
                    background: 'linear-gradient(90deg, var(--color-violet), var(--color-rose))',
                  }}
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <p className="mr-auto truncate text-[13px] text-mist/70">
                  {progresso.feitas}/{progresso.total} · {progresso.atual}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    abortar.current?.abort()
                    setProgresso(null)
                  }}
                  className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-[13px] text-mist transition hover:text-star"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* --------------------------- conferência --------------------------- */}
      {passo === 'conferir' && conf && r && (
        <section className="flex h-[calc(100vh-15rem)] flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-[14px] text-mist/80">
              <span className="text-star">{r.casadas}</span> no lugar
              {r.aConfirmar > 0 && ` · ${r.aConfirmar} a confirmar`}
              {r.soltas > 0 && ` · ${r.soltas} sobrando`}
              {r.ilegiveis > 0 && ` · ${r.ilegiveis} ilegíveis`}
            </p>
            {r.aConfirmar > 0 && (
              <button
                type="button"
                onClick={() => setConf(reduzir(conf, { tipo: 'aceitarTodas' }))}
                className="rounded-full border border-white/25 px-4 py-1.5 text-[14px] text-star transition hover:border-gold/60"
              >
                Aceitar as {r.aConfirmar} sugestões
              </button>
            )}
            {r.casadas === 0 && r.soltas > 0 && (
              <button
                type="button"
                onClick={() => setConf(aplicarOrdemCanonica(conf))}
                title="Para baralhos cujos arquivos são só numerados"
                className="rounded-full border border-white/25 px-4 py-1.5 text-[14px] text-star transition hover:border-gold/60"
              >
                Aplicar a ordem padrão
              </button>
            )}
            {conf.anterior && (
              <button
                type="button"
                onClick={() => setConf(reduzir(conf, { tipo: 'desfazer' }))}
                className="rounded-full border border-white/20 px-4 py-1.5 text-[14px] text-mist transition hover:text-star"
              >
                Desfazer
              </button>
            )}
            <button
              type="button"
              disabled={r.casadas === 0}
              onClick={() => setPasso('salvar')}
              className="rounded-full px-5 py-1.5 text-[14px] font-medium text-star transition disabled:opacity-40"
              style={{ background: 'linear-gradient(100deg, #6d3fd4, #c2449d)' }}
            >
              Continuar
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <GradeConferencia
              conf={conf}
              onAtribuir={(itemId, alvo) => setConf(reduzir(conf, { tipo: 'atribuir', itemId, alvo }))}
              onDesatribuir={(itemId) => setConf(reduzir(conf, { tipo: 'desatribuir', itemId }))}
            />
          </div>
        </section>
      )}

      {/* ----------------------------- salvar ----------------------------- */}
      {passo === 'salvar' && conf && (
        <section className="glass mx-auto max-w-md rounded-2xl p-6">
          <h2 className="font-display text-lg text-star">Dê um nome ao tema</h2>
          <p className="mt-1 text-[14px] text-mist/70">
            {tipo === 'baralho'
              ? `${resumo(conf).casadas} cartas neste tema. As que faltarem usam a arte do site.`
              : 'Este pano vai ficar disponível para a sua mesa.'}
          </p>

          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, 40))}
            placeholder="Rider-Waite, Aquarela da Lua…"
            className="mt-4 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] text-star outline-none transition focus:border-lilac/60"
          />

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setPasso(tipo === 'pano' ? 'enviar' : 'conferir')}
              className="rounded-full border border-white/20 px-5 py-2 text-[15px] text-mist transition hover:text-star"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!nome.trim() || salvando}
              onClick={() => void salvar()}
              className="flex-1 rounded-full px-5 py-2 text-[15px] font-medium text-star transition disabled:opacity-40"
              style={{ background: 'linear-gradient(100deg, #6d3fd4, #c2449d)' }}
            >
              {salvando ? 'Guardando…' : 'Salvar tema'}
            </button>
          </div>
        </section>
      )}

      {erro && (
        <p className="mt-4 rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-[14px] text-rose">{erro}</p>
      )}
    </main>
  )
}
