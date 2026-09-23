import type { CartaNaMesa } from '../../lib/backend'

/** Botão da barra. FORA do componente de propósito: declarado dentro do render,
 *  ele vira um tipo novo a cada quadro e o React remonta a árvore inteira. */
function Botao({
  children,
  onClick,
  ativo,
  desabilitado,
  perigo,
  titulo,
}: {
  children: React.ReactNode
  onClick: () => void
  ativo?: boolean
  desabilitado?: boolean
  perigo?: boolean
  titulo?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      title={titulo}
      className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] tracking-wide transition disabled:opacity-35"
      style={{
        color: ativo ? '#fff' : perigo ? '#e8a0c4' : '#cbbde8',
        background: ativo ? '#ffffff16' : 'transparent',
        boxShadow: ativo ? '0 0 20px -8px var(--color-violet)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

/** Divisória fina entre grupos de ação. */
function Risco() {
  return <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-white/15" />
}

/**
 * A barra do tarólogo, sobre o topo da mesa.
 *
 * É o ÚNICO lugar de ação: o painel lateral ficou só com escolha (layout,
 * cartas, visual) e tudo que mexe na mesa mora aqui em cima, onde a mão já
 * está e sem depender de o menu estar aberto.
 *
 * Flutua sobre o canvas em vez de ocupar uma faixa própria: a mesa é o que
 * importa na tela, e uma barra opaca roubaria altura dela em todo monitor.
 */
export default function BarraFerramentas({
  cartas,
  luzAcesa,
  menuAberto,
  cartaAtiva,
  nomeCartaAtiva,
  rotuloSlot,
  onRevirarTodas,
  onLuz,
  onCamera,
  cameraConectada,
  cameraVisivel,
  onLimpar,
  onMenu,
  onVirar,
  onInverter,
  onTirar,
  onEncerrar,
}: {
  cartas: CartaNaMesa[]
  luzAcesa: boolean
  menuAberto: boolean
  /** Carta no lugar selecionado. As ações dela só existem junto com ela. */
  cartaAtiva?: CartaNaMesa
  nomeCartaAtiva?: string
  rotuloSlot?: string
  onRevirarTodas: () => void
  onLuz: () => void
  onCamera: () => void
  cameraConectada: boolean
  cameraVisivel: boolean
  onLimpar: () => void
  onMenu: () => void
  onVirar: (slot: number) => void
  onInverter: (slot: number) => void
  onTirar: (slot: number) => void
  onEncerrar: () => void
}) {
  const naMesa = cartas.length
  // Enquanto houver uma carta coberta, o botão revela; com todas reveladas, ele
  // cobre. Um rótulo que muda diz o que VAI acontecer, e não o estado atual.
  const cobertas = cartas.filter((c) => !c.revelada).length
  const vaiRevelar = cobertas > 0

  return (
    <div className="pointer-events-none absolute inset-x-0 top-8 z-40 flex items-start justify-between gap-2 p-3 sm:top-0">
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        {/* --------------------- ações sobre a mesa --------------------- */}
        {/* Uma linha só, rolando na horizontal se faltar espaço. Com
            `flex-wrap` ela quebrava em duas no celular e a segunda linha ia
            parar embaixo do painel, que começa em top-16 — o clique morria. */}
        <div className="glass pointer-events-auto flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto rounded-full px-1.5 py-1">
          <button
            type="button"
            onClick={onCamera}
            title={cameraConectada ? (cameraVisivel ? 'Ocultar câmera sem desconectar o celular' : 'Mostrar câmera conectada') : 'Conectar a câmera do celular à mesa'}
            aria-pressed={cameraConectada && cameraVisivel}
            className="shrink-0 whitespace-nowrap rounded-full border border-gold/50 bg-gold/15 px-4 py-1.5 text-[14px] font-semibold text-gold transition hover:bg-gold/25"
          >
            ◉ {cameraConectada ? (cameraVisivel ? 'Ocultar câmera' : 'Mostrar câmera') : 'Câmera do celular'}
          </button>

          <Risco />

          <button
            type="button"
            onClick={onRevirarTodas}
            disabled={naMesa === 0}
            title={vaiRevelar ? 'Virar todas as cartas para cima' : 'Cobrir todas as cartas'}
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] font-medium tracking-wide text-star transition disabled:opacity-35"
            style={{
              background: naMesa === 0 ? '#ffffff10' : 'linear-gradient(100deg, #6d3fd4, #c2449d)',
              boxShadow: naMesa === 0 ? 'none' : '0 8px 24px -12px #c2449d',
            }}
          >
            {vaiRevelar ? '✦ Revirar todas' : '✦ Cobrir todas'}
          </button>

          <Risco />

          <Botao onClick={onLuz} ativo={luzAcesa} titulo={luzAcesa ? 'Apagar a luz' : 'Acender a luz'}>
            {luzAcesa ? '☾ Apagar' : '☀ Acender'}
          </Botao>

          <Botao onClick={onLimpar} desabilitado={naMesa === 0} titulo="Tirar todas as cartas da mesa">
            Limpar mesa
          </Botao>

          <Risco />

          <Botao onClick={onEncerrar} perigo titulo="Encerrar esta leitura">
            Encerrar
          </Botao>

          <span className="hidden whitespace-nowrap px-2 text-[13px] text-mist/60 sm:inline">
            {naMesa === 0 ? 'mesa vazia' : `${naMesa - cobertas}/${naMesa} reveladas`}
          </span>
        </div>

        {/* ------------------- ações sobre UMA carta ------------------- */}
        {/* Pílula separada, e só com carta escolhida: é o que deixa claro que
            estas três agem sobre uma carta, e não sobre a mesa inteira. */}
        {cartaAtiva && (
          <div className="glass pointer-events-auto flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto rounded-full px-1.5 py-1">
            <span className="max-w-[26ch] shrink-0 truncate px-2 text-[13px] text-gold/85">
              {nomeCartaAtiva}
              {rotuloSlot && <span className="text-mist/55"> · {rotuloSlot}</span>}
            </span>

            <Botao onClick={() => onVirar(cartaAtiva.slot)} ativo titulo="Virar esta carta">
              {cartaAtiva.revelada ? 'Cobrir' : 'Revelar'}
            </Botao>
            <Botao onClick={() => onInverter(cartaAtiva.slot)} titulo="Inverter o sentido da carta">
              {cartaAtiva.invertida ? 'Desinverter' : 'Inverter'}
            </Botao>
            <Botao onClick={() => onTirar(cartaAtiva.slot)} perigo titulo="Tirar esta carta da mesa">
              Tirar
            </Botao>
          </div>
        )}
      </div>

      {/* O menu mora no cantinho: a mesa fica com o resto da tela. */}
      <button
        type="button"
        onClick={onMenu}
        aria-expanded={menuAberto}
        className="glass pointer-events-auto shrink-0 rounded-full px-4 py-2 text-[14px] tracking-wide transition"
        style={{
          color: menuAberto ? '#fff' : '#cbbde8',
          boxShadow: menuAberto ? '0 0 22px -8px var(--color-violet)' : 'none',
        }}
      >
        {menuAberto ? '✕ Fechar' : '☰ Menu'}
      </button>
    </div>
  )
}
