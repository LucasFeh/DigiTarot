import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { ErroDeImagem, prepararImagemDoChat } from '../../lib/imagemChat'
import type { Mensagem } from '../../lib/backend'
import VozMesa from './VozMesa'

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * A foto ampliada, sobre tudo o mais.
 *
 * Fica num `z-[100]` e cobre a tela inteira — inclusive o cabeçalho do site,
 * que é `z-[70]`. Uma lightbox que deixa a navegação aparecendo por cima não
 * cumpre a única coisa que promete, que é isolar a imagem do resto.
 */
function Ampliada({ src, aoFechar }: { src: string; aoFechar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    // Trava a rolagem do fundo: rolar a página atrás de uma imagem ampliada dá
    // a impressão de que o clique escapou.
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = antes
    }
  }, [aoFechar])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Imagem ampliada"
      onClick={aoFechar}
      // O respiro embaixo é do aviso de fechar: sem ele, a imagem cresce até o
      // rodapé e o texto fica por cima dela.
      className="fixed inset-0 z-[100] grid place-items-center p-4 pb-12"
      style={{ background: 'rgba(3, 0, 10, 0.92)', backdropFilter: 'blur(8px)' }}
    >
      <img
        src={src}
        alt=""
        // O clique na própria imagem não fecha: quem quer olhar de perto acaba
        // clicando nela, e fechar aí seria o oposto do pedido.
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-xl object-contain"
        style={{ boxShadow: '0 30px 90px -20px #000' }}
      />

      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-void/70 text-[20px] leading-none text-star transition hover:border-gold/60"
      >
        ×
      </button>

      <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-[13px] text-mist/60">
        Toque fora da imagem ou aperte Esc para fechar
      </p>
    </div>
  )
}

/**
 * A conversa da mesa, escondida atrás de um ícone.
 *
 * Fica fechada por padrão porque a mesa é o assunto: um painel de chat sempre
 * aberto rouba metade da tela de uma cena 3D que a pessoa veio ver. O ícone
 * ganha um ponto quando chega mensagem nova com o painel fechado — é o mínimo
 * para ninguém falar sozinho sem saber.
 */
export default function ChatMesa({
  sessaoId,
  autor,
  nome,
  aberto,
  aoFechar,
  aoNaoLidas,
  lado = 'esquerda',
}: {
  sessaoId: string
  autor: 'tarologo' | 'cliente'
  nome: string
  aberto: boolean
  aoFechar: () => void
  /** Avisa a sala quantas mensagens chegaram enquanto estava fechado. */
  aoNaoLidas: (n: number) => void
  lado?: 'esquerda' | 'direita'
}) {
  const { backend } = useAuth()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [anexo, setAnexo] = useState<string | null>(null)
  const [preparando, setPreparando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [preparandoAudio, setPreparandoAudio] = useState(false)
  const gravador = useRef<MediaRecorder | null>(null)
  const pressionado = useRef(false)
  const descartandoAudio = useRef(false)
  const [ampliada, setAmpliada] = useState<string | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const lidasAte = useRef(0)

  useEffect(() => () => {
    descartandoAudio.current = true
    pressionado.current = false
    if (gravador.current?.state === 'recording') gravador.current.stop()
    gravador.current?.stream.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    if (!backend) return
    return backend.observarMensagens(sessaoId, setMensagens)
  }, [backend, sessaoId])

  // Aberto, tudo que chega já está lido. Fechado, a diferença vira o contador
  // do ícone.
  useEffect(() => {
    if (aberto) {
      lidasAte.current = mensagens.length
      aoNaoLidas(0)
    } else {
      aoNaoLidas(Math.max(0, mensagens.length - lidasAte.current))
    }
  }, [mensagens.length, aberto, aoNaoLidas])

  // Rola para a última fala. `block: 'nearest'` para a página atrás do painel
  // não se mexer junto.
  useEffect(() => {
    if (aberto) fim.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [mensagens.length, aberto])

  const receberArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setErro(null)
    setPreparando(true)
    try {
      setAnexo(await prepararImagemDoChat(arquivo))
    } catch (e) {
      setErro(e instanceof ErroDeImagem ? e.message : 'Não foi possível preparar essa imagem.')
    } finally {
      setPreparando(false)
      // Zera o input: escolher o MESMO arquivo de novo não dispara `change`.
      if (entrada.current) entrada.current.value = ''
    }
  }

  const enviar = async () => {
    const limpo = texto.trim()
    if (!backend || enviando || (!limpo && !anexo)) return
    setErro(null)
    setEnviando(true)
    try {
      await backend.enviarMensagem(sessaoId, {
        autor,
        nome: nome.slice(0, 100),
        texto: limpo.slice(0, 2000),
        ...(anexo ? { imagem: anexo } : {}),
      })
      setTexto('')
      setAnexo(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  const iniciarAudio = async () => {
    if (!backend || gravador.current || preparandoAudio) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErro('Este navegador não permite gravar áudio aqui. Abra o site em HTTPS no Chrome, Safari ou Firefox atualizado.')
      return
    }
    pressionado.current = true
    setErro(null)
    setPreparandoAudio(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!pressionado.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
      const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 })
      const partes: BlobPart[] = []
      let limite: number | undefined
      recorder.ondataavailable = (e) => { if (e.data.size) partes.push(e.data) }
      recorder.onstop = () => {
        window.clearTimeout(limite)
        stream.getTracks().forEach((t) => t.stop())
        gravador.current = null
        setGravando(false)
        if (descartandoAudio.current) return
        if (!partes.length) return
        const leitor = new FileReader()
        leitor.onload = async () => {
          const audio = leitor.result
          if (typeof audio !== 'string' || audio.length > 700000) {
            setErro('O áudio ficou grande demais. Grave uma mensagem mais curta.')
            return
          }
          try {
            await backend.enviarMensagem(sessaoId, { autor, nome: nome.slice(0, 100), texto: '', audio })
          } catch {
            setErro('Não foi possível enviar o áudio. Tente novamente.')
          }
        }
        leitor.readAsDataURL(new Blob(partes, { type: (recorder.mimeType || 'audio/webm').split(';')[0] }))
      }
      gravador.current = recorder
      recorder.start()
      setGravando(true)
      limite = window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 45000)
    } catch {
      setErro('Não foi possível abrir o microfone. Confira a permissão do navegador.')
    } finally {
      setPreparandoAudio(false)
    }
  }

  const pararAudio = () => {
    pressionado.current = false
    if (gravador.current?.state === 'recording') gravador.current.stop()
  }

  // A imagem ampliada vive FORA do painel: ela precisa continuar aberta mesmo
  // que a conversa seja fechada, e cobrir a tela inteira em vez do painel.
  const modal = ampliada ? <Ampliada src={ampliada} aoFechar={() => setAmpliada(null)} /> : null

  /*
   * O painel vai À ESQUERDA, e não à direita. O painel de cartas do tarólogo e
   * o resumo da carta em foco do cliente moram os dois na direita — com o chat
   * lá, ele cobria justamente a ferramenta que a pessoa estava usando. E o
   * rodapé fica de fora (`bottom-16`) para a faixa de estado continuar legível.
   */
  return (
    <>
      <aside
        className={`absolute bottom-16 top-16 z-40 flex w-[min(92vw,340px)] flex-col overflow-hidden rounded-2xl ${lado === 'direita' ? 'right-3' : 'left-3'} ${aberto ? '' : 'hidden'}`}
        inert={!aberto}
        style={{
          background: 'linear-gradient(160deg, #ffffff14, #05010fdd)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #ffffff22',
          boxShadow: '0 24px 60px -18px #000',
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <span className="font-display text-[16px] text-star">Conversa</span>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar a conversa"
            className="rounded-full px-2 py-1 text-[18px] leading-none text-mist transition hover:text-star"
          >
            ×
          </button>
        </header>
        {backend && <VozMesa backend={backend} sessaoId={sessaoId} autor={autor} />}

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
          {mensagens.length === 0 ? (
            <p className="my-auto text-center text-[14px] leading-relaxed text-mist/60">
              Nada dito ainda. Use este espaço para comentar as cartas enquanto elas vão para a
              mesa — e para mandar uma foto, se ajudar.
            </p>
          ) : (
            mensagens.map((m) => {
              const minha = m.autor === autor
              return (
                <div key={m.id} className={`flex flex-col ${minha ? 'items-end' : 'items-start'}`}>
                  <span className="px-1 text-[11px] text-mist/50">
                    {minha ? 'você' : m.nome} · {hora(m.em)}
                  </span>

                  {m.imagem && (
                    <button
                      type="button"
                      onClick={() => setAmpliada(m.imagem ?? null)}
                      aria-label="Ver a imagem maior"
                      className="mt-0.5 max-w-[85%] overflow-hidden rounded-2xl border border-white/15 transition hover:border-gold/50"
                    >
                      <img
                        src={m.imagem}
                        alt=""
                        loading="lazy"
                        className="block max-h-56 w-full object-cover"
                      />
                    </button>
                  )}

                  {m.texto && (
                    <p
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${m.imagem ? 'mt-1' : ''}`}
                      style={
                        minha
                          ? { background: 'linear-gradient(100deg, #6d3fd4, #c2449d)', color: '#fff' }
                          : { background: '#ffffff12', color: '#e9dcff' }
                      }
                    >
                      {m.texto}
                    </p>
                  )}
                  {m.audio && (
                    <audio
                      controls
                      preload="none"
                      src={m.audio}
                      aria-label={`Áudio de ${minha ? 'você' : m.nome}`}
                      className="mt-1 max-w-[85%]"
                    />
                  )}
                </div>
              )
            })
          )}
          <div ref={fim} />
        </div>

        {/* ---------------------------- o que vai sair ---------------------------- */}
        {anexo && (
          <div className="shrink-0 border-t border-white/10 px-3 pt-3">
            <div className="relative inline-block">
              <img
                src={anexo}
                alt=""
                className="max-h-24 rounded-xl border border-white/15 object-cover"
              />
              <button
                type="button"
                onClick={() => setAnexo(null)}
                aria-label="Descartar a imagem"
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-void text-[15px] leading-none text-star transition hover:border-rose/60 hover:text-rose"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {erro && (
          <p className="shrink-0 px-3 pt-2 text-[13px] leading-snug text-rose">{erro}</p>
        )}

        <form
          className="flex shrink-0 items-end gap-2 border-t border-white/10 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void enviar()
          }}
        >
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void receberArquivo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={preparando}
            aria-label="Enviar uma imagem"
            title="Enviar uma imagem"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 text-[17px] text-mist transition hover:border-gold/50 hover:text-star disabled:opacity-50"
          >
            {preparando ? (
              '…'
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
                <path d="M4 16.5l4.5-4 3.5 3 3-2.5 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia, Shift+Enter quebra linha — a convenção de todo chat.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void enviar()
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={anexo ? 'Uma legenda? (opcional)' : 'Escreva aqui…'}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[15px] text-star outline-none transition placeholder:text-mist/45 focus:border-gold/50"
          />

          <button
            type="submit"
            disabled={(!texto.trim() && !anexo) || enviando || preparando}
            aria-label="Enviar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[17px] text-star transition disabled:opacity-40"
            style={{ background: 'linear-gradient(100deg, #6d3fd4, #c2449d)' }}
          >
            ➤
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              void iniciarAudio()
            }}
            onPointerUp={pararAudio}
            onPointerCancel={pararAudio}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); void iniciarAudio() } }}
            onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') pararAudio() }}
            aria-label={gravando ? 'Solte para enviar o áudio' : 'Segure para gravar um áudio'}
            title={gravando ? 'Solte para enviar' : 'Segure para gravar áudio (até 45 segundos)'}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[18px] transition ${gravando ? 'border-rose bg-rose/20 text-rose' : 'border-white/15 text-mist hover:border-gold/50 hover:text-star'}`}
          >
            {preparandoAudio ? '…' : '🎙'}
          </button>
        </form>
      </aside>

      {modal}
    </>
  )
}
