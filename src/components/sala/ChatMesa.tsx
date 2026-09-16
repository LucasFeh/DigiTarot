import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import type { Mensagem } from '../../lib/backend'

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
}: {
  sessaoId: string
  autor: 'tarologo' | 'cliente'
  nome: string
  aberto: boolean
  aoFechar: () => void
  /** Avisa a sala quantas mensagens chegaram enquanto estava fechado. */
  aoNaoLidas: (n: number) => void
}) {
  const { backend } = useAuth()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const lidasAte = useRef(0)

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

  if (!aberto) return null

  const enviar = async () => {
    const limpo = texto.trim()
    if (!backend || !limpo || enviando) return
    setEnviando(true)
    try {
      await backend.enviarMensagem(sessaoId, { autor, nome, texto: limpo.slice(0, 2000) })
      setTexto('')
    } finally {
      setEnviando(false)
    }
  }

  /*
   * O painel vai À ESQUERDA, e não à direita. O painel de cartas do tarólogo e
   * o resumo da carta em foco do cliente moram os dois na direita — com o chat
   * lá, ele cobria justamente a ferramenta que a pessoa estava usando. E o
   * rodapé fica de fora (`bottom-16`) para a faixa de estado continuar legível.
   */
  return (
    <aside
      className="absolute bottom-16 left-3 top-16 z-40 flex w-[min(92vw,340px)] flex-col overflow-hidden rounded-2xl"
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

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
        {mensagens.length === 0 ? (
          <p className="my-auto text-center text-[14px] leading-relaxed text-mist/60">
            Nada dito ainda. Use este espaço para comentar as cartas enquanto elas vão para a mesa.
          </p>
        ) : (
          mensagens.map((m) => {
            const minha = m.autor === autor
            return (
              <div key={m.id} className={`flex flex-col ${minha ? 'items-end' : 'items-start'}`}>
                <span className="px-1 text-[11px] text-mist/50">
                  {minha ? 'você' : m.nome} · {hora(m.em)}
                </span>
                <p
                  className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed"
                  style={
                    minha
                      ? { background: 'linear-gradient(100deg, #6d3fd4, #c2449d)', color: '#fff' }
                      : { background: '#ffffff12', color: '#e9dcff' }
                  }
                >
                  {m.texto}
                </p>
              </div>
            )
          })
        )}
        <div ref={fim} />
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-white/10 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void enviar()
        }}
      >
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
          placeholder="Escreva aqui…"
          className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[15px] text-star outline-none transition placeholder:text-mist/45 focus:border-gold/50"
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          aria-label="Enviar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[17px] text-star transition disabled:opacity-40"
          style={{ background: 'linear-gradient(100deg, #6d3fd4, #c2449d)' }}
        >
          ➤
        </button>
      </form>
    </aside>
  )
}
