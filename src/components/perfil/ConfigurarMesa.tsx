import { useRef, useState } from 'react'
import type { ConfiguracaoMesa, LadoMesa } from '../../lib/backend'
import { limitarQuadro, redimensionarQuadro, type DirecaoAjuste, type QuadroCamera } from '../../lib/posicaoCamera'

const DIRECOES: { id: DirecaoAjuste; posicao: string; cursor: string }[] = [
  { id: 'nw', posicao: 'left-0.5 top-0.5', cursor: 'cursor-nwse-resize' },
  { id: 'n', posicao: 'left-1/2 top-0.5 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { id: 'ne', posicao: 'right-0.5 top-0.5', cursor: 'cursor-nesw-resize' },
  { id: 'e', posicao: 'right-0.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
  { id: 'se', posicao: 'bottom-0.5 right-0.5', cursor: 'cursor-nwse-resize' },
  { id: 's', posicao: 'bottom-0.5 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { id: 'sw', posicao: 'bottom-0.5 left-0.5', cursor: 'cursor-nesw-resize' },
  { id: 'w', posicao: 'left-0.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
]

const oposto = (lado: LadoMesa): LadoMesa => lado === 'esquerda' ? 'direita' : 'esquerda'

export default function ConfigurarMesa({ valor, salvar }: {
  valor: ConfiguracaoMesa
  salvar: (configuracao: ConfiguracaoMesa) => void
}) {
  const [edicao, setEdicao] = useState<ConfiguracaoMesa | null>(null)
  const rascunho = edicao ?? valor
  const area = useRef<HTMLDivElement>(null)
  const gesto = useRef<{
    tipo: 'mover' | DirecaoAjuste
    x: number
    y: number
    quadro: QuadroCamera
    ultimo: QuadroCamera
    largura: number
    altura: number
  } | null>(null)

  const mudar = (proxima: ConfiguracaoMesa) => {
    salvar(proxima)
    setEdicao(null)
  }

  const iniciar = (evento: React.PointerEvent, tipo: 'mover' | DirecaoAjuste) => {
    const caixa = area.current?.getBoundingClientRect()
    if (!caixa) return
    evento.stopPropagation()
    const quadro = limitarQuadro({ ...rascunho.cameraPosicao, largura: rascunho.cameraTamanho }, { largura: caixa.width, altura: caixa.height }, 16 / 9)
    gesto.current = { tipo, x: evento.clientX, y: evento.clientY, quadro, ultimo: quadro, largura: caixa.width, altura: caixa.height }
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  const mover = (evento: React.PointerEvent) => {
    const atual = gesto.current
    if (!atual) return
    evento.stopPropagation()
    const dx = evento.clientX - atual.x
    const dy = evento.clientY - atual.y
    atual.ultimo = atual.tipo === 'mover'
      ? limitarQuadro({
        ...atual.quadro,
        x: atual.quadro.x + dx / atual.largura * 100,
        y: atual.quadro.y + dy / atual.altura * 100,
      }, { largura: atual.largura, altura: atual.altura }, 16 / 9)
      : redimensionarQuadro(atual.quadro, atual.tipo, dx, dy, { largura: atual.largura, altura: atual.altura }, 16 / 9)
    setEdicao((anterior) => ({ ...(anterior ?? valor), cameraPosicao: { x: atual.ultimo.x, y: atual.ultimo.y }, cameraTamanho: atual.ultimo.largura }))
  }

  const terminar = (evento: React.PointerEvent) => {
    const atual = gesto.current
    if (!atual) return
    evento.stopPropagation()
    gesto.current = null
    evento.currentTarget.releasePointerCapture(evento.pointerId)
    mudar({ ...rascunho, cameraPosicao: { x: atual.ultimo.x, y: atual.ultimo.y }, cameraTamanho: atual.ultimo.largura })
  }

  const escolha = (rotulo: string, chave: 'chatLado' | 'painelLado' | 'barraLado') => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-3 last:border-0">
      <span className="text-sm text-mist">{rotulo}</span>
      <div className="flex rounded-full border border-white/15 bg-black/20 p-1">
        {(['esquerda', 'direita'] as const).map((lado) => (
          <button key={lado} type="button" aria-pressed={rascunho[chave] === lado}
            onClick={() => mudar({
              ...rascunho,
              [chave]: lado,
              ...(chave === 'chatLado' ? { painelLado: oposto(lado) } : {}),
              ...(chave === 'painelLado' ? { chatLado: oposto(lado) } : {}),
            })}
            className={`rounded-full px-3 py-1.5 text-xs capitalize transition ${rascunho[chave] === lado ? 'bg-gold text-void' : 'text-mist hover:text-star'}`}>
            {lado}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Antes de começar</p>
        <h2 className="mt-2 font-display text-2xl text-star">Configurar a mesa</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist/70">
          Arraste a câmera na prévia e puxe qualquer borda ou canto para mudar o tamanho. A imagem mantém a proporção para aparecer inteira. Sua escolha será usada nas próximas leituras.
        </p>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(250px,0.7fr)]">
        <div>
          <div ref={area} aria-label="Prévia da mesa" className="relative aspect-[16/10] w-full overflow-hidden rounded-[22px] border border-gold/25 bg-[#10091e]"
            style={{ backgroundImage: 'radial-gradient(ellipse at 50% 65%, #382446 0%, #180f2a 48%, #090414 100%)' }}>
            <div className={`absolute top-[3%] flex w-[55%] gap-1.5 ${rascunho.barraLado === 'direita' ? 'right-[3%] justify-end' : 'left-[3%]'}`}>
              <span className="rounded-full border border-gold/30 bg-[#21172c] px-2 py-1 text-[10px] text-gold">Câmera</span>
              <span className="rounded-full border border-white/20 bg-[#21172c] px-2 py-1 text-[10px] text-mist">Cartas</span>
              <span className="rounded-full border border-white/20 bg-[#21172c] px-2 py-1 text-[10px] text-mist">Encerrar</span>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[36%] flex -translate-x-1/2 gap-2.5 sm:gap-4">
              {[0, 1, 2].map((carta) => <span key={carta} className="block aspect-[0.67] w-[clamp(25px,5vw,55px)] rounded border border-gold/40 bg-gradient-to-b from-[#5d4080] to-[#27133f] shadow-xl" />)}
            </div>
            <div className={`pointer-events-none absolute bottom-[4%] z-20 w-[25%] rounded-lg border border-white/20 bg-[#1d1429]/90 px-2 py-1.5 text-[10px] text-mist ${rascunho.chatLado === 'direita' ? 'right-[3%]' : 'left-[3%]'}`}>Conversa · voz</div>
            <div className={`pointer-events-none absolute top-[25%] z-20 w-[22%] rounded-lg border border-white/20 bg-[#1d1429]/90 px-2 py-2 text-[10px] text-mist ${rascunho.painelLado === 'direita' ? 'right-[3%]' : 'left-[3%]'}`}>Painel de cartas<br />Layout · visual</div>

            <div className="absolute z-10 grid cursor-move place-items-center rounded-xl border border-gold bg-black/85 text-center shadow-[0_12px_36px_#0009] select-none"
              style={{ left: `${rascunho.cameraPosicao.x}%`, top: `${rascunho.cameraPosicao.y}%`, width: `${rascunho.cameraTamanho}%`, aspectRatio: 16 / 9, touchAction: 'none' }}
              onPointerDown={(e) => iniciar(e, 'mover')} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={() => { gesto.current = null }}>
              <span className="pointer-events-none px-2 text-xs text-gold">◉ Câmera do tarólogo</span>
              {DIRECOES.map(({ id, posicao, cursor }) => (
                <button key={id} type="button" aria-label={`Redimensionar câmera: ${id}`}
                  className={`absolute h-3 w-3 rounded-full border border-void bg-gold ${posicao} ${cursor}`}
                  onPointerDown={(e) => iniciar(e, id)} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={() => { gesto.current = null }} />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-mist/55">A posição da câmera também aparece para o cliente. A proporção real se ajusta ao vídeo do celular.</p>
        </div>

        <div className="glass h-fit rounded-2xl p-5">
          <h3 className="font-display text-lg text-star">Posição dos elementos</h3>
          <p className="mt-1 text-xs leading-relaxed text-mist/60">Conversa e painel ficam em lados opostos para não se cobrirem.</p>
          <div className="mt-4">
            {escolha('Conversa e microfone', 'chatLado')}
            {escolha('Painel de cartas', 'painelLado')}
            {escolha('Barra de ações', 'barraLado')}
          </div>
          <button type="button" onClick={() => mudar({ cameraPosicao: { x: 31, y: 20 }, cameraTamanho: 34, chatLado: 'esquerda', painelLado: 'direita', barraLado: 'esquerda' })}
            className="mt-5 rounded-full border border-white/20 px-4 py-2 text-xs text-mist hover:text-star">Restaurar disposição inicial</button>
          <p className="mt-4 text-xs text-gold/80">Salvo automaticamente no seu perfil.</p>
        </div>
      </div>
    </div>
  )
}
