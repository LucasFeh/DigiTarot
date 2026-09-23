import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { irPara } from '../lib/useHashRoute'
import { CARD_BY_ID } from '../data/cards'
import { SPREAD_BY_ID } from '../data/spreads'
import {
  AFASTAMENTO_MAX,
  AFASTAMENTO_MIN,
  PASSO_BOTAO,
  limitarAfastamento,
} from '../lib/afastamento'
import { useDesempenho } from '../lib/desempenho'
import { panoEmbutidoDe } from '../lib/temas/visibilidade'
import { useVisual } from '../lib/temas/useVisual'
import { useTema } from '../lib/temas/useTema'
import SeletorDesempenho from '../components/SeletorDesempenho'
import BarraFerramentas from '../components/sala/BarraFerramentas'
import CartaFlutuante from '../components/sala/CartaFlutuante'
import PainelTarologo from '../components/sala/PainelTarologo'
import PopupCarta from '../components/sala/PopupCarta'
import ChatMesa from '../components/sala/ChatMesa'
import CameraMesa, { type CameraMesaHandle } from '../components/sala/CameraMesa'
import DicaGirar from '../components/sala/DicaGirar'
import SeletorTema from '../components/temas/SeletorTema'
import LoginPage from './LoginPage'
import type { CartaNaMesa, Sessao } from '../lib/backend'
import type { TemaBaralho, TemaPano } from '../lib/temas/tipos'

// O Three.js só entra no bundle de quem abre a sala.
const Sala3D = lazy(() => import('../components/sala/Sala3D'))

/** Botão redondo de vidro. FORA do componente: declarado dentro do render, ele
 *  vira um tipo novo a cada quadro e o React remonta a árvore inteira. */
function BotaoRedondo({
  children,
  titulo,
  onClick,
  desabilitado,
}: {
  children: React.ReactNode
  titulo: string
  onClick: () => void
  desabilitado?: boolean
}) {
  return (
    <button
      type="button"
      // `aria-disabled`, e não `disabled`: chega-se ao limite APERTANDO ESTE
      // botão, e desabilitar um elemento com o foco em cima devolve o foco ao
      // <body> — o Tab seguinte recomeçaria no cabeçalho do site, que continua
      // montado atrás da sala. Inerte e focado é melhor que perdido, e o
      // `limitarAfastamento` já prende o valor de qualquer jeito.
      aria-disabled={desabilitado || undefined}
      onClick={desabilitado ? undefined : onClick}
      title={titulo}
      aria-label={titulo}
      className="glass grid h-10 w-10 place-items-center rounded-full text-[20px] leading-none text-mist transition hover:text-star aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:text-mist"
    >
      {children}
    </button>
  )
}

export default function SalaPage({ sessaoId }: { sessaoId: string }) {
  const { usuario, carregando, backend } = useAuth()
  // `undefined` = ainda carregando; `null` = não existe. Assim o estado de
  // carregamento é derivado, sem um setState extra dentro do efeito.
  const [sessao, setSessao] = useState<Sessao | null | undefined>(undefined)
  const [slotAtivo, setSlotAtivo] = useState<number | null>(null)
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)
  /** Posição do popup. Em state, e não em ref, porque é lida na renderização. */
  const [ponteiro, setPonteiro] = useState({ x: 0, y: 0 })
  const [luzAcesa, setLuzAcesa] = useState(false)
  /** Carta que o cliente escolheu olhar de perto. */
  const [focoSlot, setFocoSlot] = useState<number | null>(null)
  /**
   * Quanto o cliente afastou a mesa. Começa em 1, que é o enquadramento
   * desenhado — a mesa nunca NASCE longe, só vai para lá se pedirem.
   */
  const [afastamento, setAfastamento] = useState(AFASTAMENTO_MIN)
  const [qualidadeAberta, setQualidadeAberta] = useState(false)
  /** Gatilho e balão da qualidade: o de fora envolve os dois, e é ele que
   *  decide o que é "clicar fora". */
  const caixaQualidade = useRef<HTMLDivElement>(null)
  const gatilhoQualidade = useRef<HTMLButtonElement>(null)
  const balaoQualidade = useRef<HTMLDivElement>(null)
  const [acervo, setAcervo] = useState(false)
  const [menuAberto, setMenuAberto] = useState(true)
  const [chat, setChat] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)
  const cameraRef = useRef<CameraMesaHandle>(null)
  /** Carta viajando na ponta do ponteiro, em coordenadas de cliente. */
  const [arraste, setArraste] = useState<{ cardId: string; x: number; y: number } | null>(null)
  const [slotAlvo, setSlotAlvo] = useState<number | null>(null)
  /** Onde cada slot está na tela. A cena preenche enquanto se arrasta. */
  const projecao = useRef<{ slot: number; x: number; y: number }[]>([])
  const arrastando = useRef(false)

  // Os hooks vêm todos ANTES dos early returns — é a regra dos hooks, e o
  // `useVisual` já trata sessão nula.
  const visual = useVisual(sessao, usuario)
  const desempenho = useDesempenho(usuario)
  const baralho = useTema<TemaBaralho>(visual.visivel.baralhoId, 'baralho')
  const pano = useTema<TemaPano>(visual.visivel.panoId, 'pano')
  const ehTarologo = visual.ehTarologo

  // ------------------------------ tempo real ------------------------------
  // Sem exigir usuário: a mesa de sessão particular é lida por quem tem o link,
  // e essa pessoa não tem conta. Para as outras mesas o Firestore continua
  // negando a leitura, e a tela cai em "sala não encontrada".
  useEffect(() => {
    if (!backend) return
    return backend.observarSessao(sessaoId, setSessao)
  }, [backend, sessaoId])

  // Cliente que entra é registrado na sessão, para ela aparecer no histórico
  // dele. Só vale para mesa ainda SEM dono: as mesas nascidas de um
  // agendamento já vêm com o cliente escrito, e sobrescrever aquele campo
  // entregaria a consulta de alguém a quem tivesse o link.
  useEffect(() => {
    if (!backend || !usuario || !sessao) return
    if (usuario.uid === sessao.tarologoUid || sessao.clienteUid || sessao.publica) return
    void backend.atualizarSessao(sessao.id, { clienteUid: usuario.uid, clienteNome: usuario.nome })
  }, [backend, usuario, sessao])

  // Esc sai do foco da carta antes de sair da sala.
  useEffect(() => {
    if (focoSlot === null) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFocoSlot(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [focoSlot])

  /**
   * Fecha o balão da qualidade devolvendo o foco a quem o abriu: sem isso o nó
   * focado some do DOM e o foco cai no <body>. Só devolve se o foco ESTAVA lá
   * dentro — num clique fora, puxar o foco de volta surpreende mais do que
   * ajuda. O `.focus()` vem antes do setState de propósito, enquanto o nó
   * ainda existe.
   */
  const fecharQualidade = useCallback(() => {
    if (balaoQualidade.current?.contains(document.activeElement)) gatilhoQualidade.current?.focus()
    setQualidadeAberta(false)
  }, [])

  // Esc ou clique fora fecham o balão. Sem camada cobrindo a tela: um
  // `fixed inset-0` por cima da barra engoliria o primeiro clique no Sair, no
  // zoom e no resumo da carta. É o mesmo padrão do menu do cabeçalho.
  useEffect(() => {
    if (!qualidadeAberta) return
    const fora = (e: PointerEvent) => {
      if (caixaQualidade.current && !caixaQualidade.current.contains(e.target as Node))
        setQualidadeAberta(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fecharQualidade()
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [qualidadeAberta, fecharQualidade])

  // O tarólogo pode tirar da mesa a carta que o cliente está olhando de perto.
  // Sem isto a câmera fica parada sobre um lugar vazio e o painel mente,
  // dizendo que a carta "ainda está coberta".
  useEffect(() => {
    if (focoSlot === null) return
    if (!sessao?.cartas.some((c) => c.slot === focoSlot)) setFocoSlot(null)
  }, [focoSlot, sessao])

  const patch = useCallback(
    (p: Partial<Sessao>) => {
      if (!backend || !sessao) return
      void backend.atualizarSessao(sessao.id, p)
    },
    [backend, sessao],
  )

  const cartas = sessao?.cartas ?? []
  const spread = SPREAD_BY_ID.get(sessao?.spreadId ?? 'tres')
  const panoEmbutidoId = panoEmbutidoDe(visual.visivel.panoId)

  // --------------------------- ações do tarólogo ---------------------------
  const porCartaEm = (slot: number, cardId: string) => {
    const nova: CartaNaMesa = { slot, cardId, invertida: false, revelada: false }
    patch({ cartas: [...cartas.filter((c) => c.slot !== slot), nova] })
    setSlotAtivo(null)
  }

  /** O slot mais perto do ponteiro, dentro de um raio de captura generoso —
   *  mirar num alvo pequeno em 3D é difícil, e errar custa uma carta no lugar
   *  errado. */
  const alvoEm = (x: number, y: number) => {
    let melhor: number | null = null
    let menor = 110 * 110
    for (const p of projecao.current) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < menor) {
        menor = d
        melhor = p.slot
      }
    }
    return melhor
  }

  /**
   * Puxar uma carta da lista. O mesmo gesto serve para as duas formas de pôr
   * carta na mesa: se o ponteiro andar mais que o limiar, vira arrasto; se não
   * andar, é clique e vale o lugar que estiver selecionado.
   *
   * Por isso a lista não tem `onClick` — ele dispararia TAMBÉM no fim de um
   * arrasto, e a carta entraria duas vezes.
   */
  const pegarCarta = (cardId: string, e: React.PointerEvent) => {
    const inicio = { x: e.clientX, y: e.clientY }
    const slotNoInicio = slotAtivo
    arrastando.current = false

    const mover = (ev: PointerEvent) => {
      if (!arrastando.current && Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) < 6) return
      arrastando.current = true
      setArraste({ cardId, x: ev.clientX, y: ev.clientY })
      setSlotAlvo(alvoEm(ev.clientX, ev.clientY))
    }
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      if (arrastando.current) {
        const alvo = alvoEm(ev.clientX, ev.clientY)
        if (alvo !== null) porCartaEm(alvo, cardId)
      } else if (slotNoInicio !== null) {
        porCartaEm(slotNoInicio, cardId)
      }
      arrastando.current = false
      setArraste(null)
      setSlotAlvo(null)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    // Sem isto, um arrasto interrompido pelo sistema deixa a carta grudada no
    // ponteiro e os ouvintes vivos para sempre.
    window.addEventListener('pointercancel', soltar)
  }
  const mexer = (slot: number, f: (c: CartaNaMesa) => CartaNaMesa) =>
    patch({ cartas: cartas.map((c) => (c.slot === slot ? f(c) : c)) })

  /**
   * Revira a mesa inteira de uma vez. Enquanto sobrar uma carta coberta, o
   * gesto é REVELAR todas; só quando todas já estão abertas é que ele cobre.
   * Alternar carta a carta deixaria a mesa em xadrez, que não é o que "revirar
   * todas" quer dizer.
   */
  const revirarTodas = () => {
    if (!cartas.length) return
    const revelar = cartas.some((c) => !c.revelada)
    patch({ cartas: cartas.map((c) => ({ ...c, revelada: revelar })) })
  }

  const carta = hoverSlot === null ? null : (cartas.find((c) => c.slot === hoverSlot) ?? null)
  /** Carta no lugar selecionado. É sobre ela que agem os botões da barra. */
  const cartaAtiva = slotAtivo === null ? undefined : cartas.find((c) => c.slot === slotAtivo)

  if (carregando) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Preparando a mesa…</p>
      </main>
    )
  }

  if (sessao === undefined) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center">
        <p className="text-[15px] text-mist/70">Preparando a mesa…</p>
      </main>
    )
  }

  if (!sessao) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
        <div className="glass rounded-2xl px-8 py-10 text-center">
          <p className="font-display text-xl text-star">Sala não encontrada</p>
          <p className="mt-2 text-[15px] text-mist">Ela pode ter sido encerrada.</p>
          <a
            href="#/tiragem"
            className="mt-6 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
          >
            Voltar
          </a>
        </div>
      </main>
    )
  }

  // A mesa particular dispensa conta: quem tem o link entra, que foi o combinado
  // ao criá-la. As demais continuam exigindo login — e a verificação vem DEPOIS
  // de a sessão chegar, porque só o documento diz de que tipo ela é.
  if (!sessao.publica && !usuario) {
    return (
      <LoginPage
        titulo="Entre para ver sua mesa"
        descricao="Esta leitura é de uma consulta agendada, e só quem a marcou pode abri-la."
      />
    )
  }

  // A mesa é de uma consulta só. No Firestore as regras já barram a leitura de
  // quem não participa; esta tela existe para o modo local — e para dizer o que
  // aconteceu, em vez de mostrar uma sala vazia e sem explicação.
  if (
    sessao.clienteUid &&
    sessao.clienteUid !== usuario?.uid &&
    sessao.tarologoUid !== usuario?.uid
  ) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
        <div className="glass rounded-2xl px-8 py-10 text-center">
          <p className="font-display text-xl text-star">Esta mesa é de outra consulta</p>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-mist">
            Cada leitura abre uma sala exclusiva para quem a agendou. A sua aparece na sua conta
            quando o Rodrigo abrir a mesa, no horário marcado.
          </p>
          <a
            href="#/tiragem"
            className="mt-6 inline-block rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-star transition hover:border-gold/60"
          >
            Ver minhas consultas
          </a>
        </div>
      </main>
    )
  }

  const acendendo = (
    <div className="grid h-full place-items-center bg-abyss">
      <p className="text-[15px] text-mist/70">Acendendo as velas…</p>
    </div>
  )

  // A cena só monta com o nível de detalhe já decidido: trocá-lo depois
  // remontaria o Canvas na cara da pessoa. Ver `desempenho.pronto`.
  const cena = !desempenho.pronto ? (
    acendendo
  ) : (
    <Suspense fallback={acendendo}>
      <Sala3D
        spreadId={sessao.spreadId}
        panoEmbutidoId={panoEmbutidoId}
        temaPano={pano.tema}
        temaBaralho={baralho.tema}
        cartas={cartas}
        editavel={ehTarologo}
        slotAtivo={arraste ? slotAlvo : slotAtivo}
        luzAcesa={luzAcesa}
        focoSlot={focoSlot}
        afastamento={afastamento}
        onAfastamento={setAfastamento}
        leve={desempenho.leve}
        arrastando={Boolean(arraste)}
        onProjetar={(p) => {
          projecao.current = p
        }}
        onSlot={setSlotAtivo}
        onCarta={(slot) => {
          if (ehTarologo) setSlotAtivo(slot)
          // O cliente não move a câmera: clicar numa carta é como ele se
          // aproxima, e clicar no vazio é como ele volta.
          else setFocoSlot((s) => (s === slot ? null : slot))
        }}
        onHoverCarta={setHoverSlot}
        onPonteiro={setPonteiro}
        onFundo={() => setFocoSlot(null)}
      />
    </Suspense>
  )

  /**
   * O gatilho do chat. Mora aqui, e não dentro do painel, porque as duas visões
   * da sala — a do cliente e a do tarólogo — o mostram no mesmo canto.
   */
  const botaoChat = (
    <button
      type="button"
      onClick={() => setChat((v) => !v)}
      aria-expanded={chat}
      className="glass relative rounded-full px-3 py-1.5 text-[13px] text-mist transition hover:text-star"
      title={chat ? 'Fechar a conversa' : 'Abrir a conversa'}
    >
      <span aria-hidden className="mr-1.5">
        ✉
      </span>
      Conversa
      {naoLidas > 0 && !chat && (
        <span
          aria-label={`${naoLidas} não lidas`}
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold text-void"
          style={{ background: 'var(--color-gold)' }}
        >
          {naoLidas}
        </span>
      )}
    </button>
  )

  const painelChat = (
    <ChatMesa
      sessaoId={sessao.id}
      autor={ehTarologo ? 'tarologo' : 'cliente'}
      nome={ehTarologo ? sessao.tarologoNome : (sessao.clienteNome ?? usuario?.nome ?? 'Convidado')}
      aberto={chat}
      aoFechar={() => setChat(false)}
      aoNaoLidas={setNaoLidas}
    />
  )

  const botaoLuz = (
    <button
      type="button"
      onClick={() => setLuzAcesa((v) => !v)}
      className="glass rounded-full px-3 py-1.5 text-[13px] text-mist transition hover:text-star"
      title={luzAcesa ? 'Apagar a luz' : 'Acender a luz'}
    >
      {luzAcesa ? '☾ Apagar a luz' : '☀ Acender a luz'}
    </button>
  )

  const avisoTemaAusente =
    baralho.estado === 'ausente' || pano.estado === 'ausente' ? (
      <p className="glass rounded-full px-3 py-1.5 text-[13px] text-gold/90">
        Tema indisponível neste dispositivo
      </p>
    ) : null

  // ═══════════════════════ visão do cliente: imersiva ═══════════════════════
  // `fixed inset-0` acima do header (z-70): a sala ocupa a tela inteira, sem
  // painel lateral e sem navegação, que é o pedido — e não depende de o App
  // saber o papel de quem está na sala.
  if (!ehTarologo) {
    const cartaFoco = focoSlot === null ? null : (cartas.find((c) => c.slot === focoSlot) ?? null)
    const dados = cartaFoco?.revelada ? CARD_BY_ID.get(cartaFoco.cardId) : null

    return (
      <div className="fixed inset-0 z-[80] bg-void">
        {cena}
        {backend && <CameraMesa backend={backend} sessao={sessao} ehTarologo={false} />}

        {/* Faixa de cima. `z-50` porque ela quebra em duas linhas no celular
            — cinco pílulas não cabem em 390px — e o painel de conversa é z-40:
            sem isto a segunda linha some atrás dele, inclusive o "◐ Qualidade",
            que existe justamente para socorrer quem está com a mesa travando. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between gap-2 p-3">
          <span className="glass pointer-events-auto rounded-full px-3 py-1.5 text-[13px] text-mist">
            {sessao.titulo} · com {sessao.tarologoNome}
            {sessao.encerrada && ' · encerrada'}
          </span>
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
            {avisoTemaAusente}
            {botaoChat}
            {botaoLuz}
            <button
              type="button"
              onClick={() => setAcervo(true)}
              className="glass rounded-full px-3 py-1.5 text-[13px] text-mist transition hover:text-star"
            >
              ✦ Tema
            </button>

            {/* Qualidade da cena. Também aqui, e não só no perfil, porque quem
                entra por link não TEM perfil — e porque a hora de descobrir
                que a mesa está travando é com ela travando na frente. */}
            <div className="relative" ref={caixaQualidade}>
              <button
                type="button"
                ref={gatilhoQualidade}
                onClick={() => (qualidadeAberta ? fecharQualidade() : setQualidadeAberta(true))}
                aria-expanded={qualidadeAberta}
                className="glass rounded-full px-3 py-1.5 text-[13px] text-mist transition hover:text-star"
                title="Quanto a mesa gasta do seu aparelho"
              >
                ◐ Qualidade
              </button>
              {qualidadeAberta && (
                <div
                  ref={balaoQualidade}
                  // A altura é limitada porque a barra de cima quebra em duas
                  // linhas no celular, e o balão nasce embaixo dela: sem teto
                  // a última opção cairia fora da tela deitada. `svh` é o
                  // viewport COM a barra do navegador; `vh` mente ali.
                  className="glass absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(60vh,calc(100svh-7rem))] w-[min(calc(100vw-5rem),266px)] overflow-y-auto overscroll-contain rounded-2xl p-3 text-left"
                  style={{ boxShadow: '0 24px 60px -18px #000' }}
                >
                  <SeletorDesempenho
                    compacto
                    modo={desempenho.modo}
                    leve={desempenho.leve}
                    onModo={desempenho.definir}
                  />
                  <p className="mt-2 px-1 text-[12px] leading-snug text-mist/55">
                    Fica guardado neste aparelho{usuario && ' e no seu perfil'}. A mesa pisca ao
                    trocar.
                  </p>
                </div>
              )}
            </div>
            <a
              href="#/tiragem"
              className="glass rounded-full px-3 py-1.5 text-[13px] text-mist transition hover:text-star"
            >
              Sair
            </a>
          </div>
        </div>

        {/* resumo da carta em foco, no canto direito */}
        {focoSlot !== null && (
          <aside
            className="absolute right-3 top-1/2 w-[min(88vw,320px)] -translate-y-1/2 rounded-2xl p-5"
            style={{
              // Vidro mais transparente que o `.glass` padrão: o pedido é um
              // pop sobre o fundo, não um painel sólido tapando a mesa.
              background: 'linear-gradient(160deg, #ffffff14, #05010f66)',
              backdropFilter: 'blur(16px)',
              border: '1px solid #ffffff22',
              boxShadow: '0 24px 60px -18px #000, 0 0 40px -12px var(--color-violet)',
            }}
          >
            <p className="text-[12px] uppercase tracking-[0.18em] text-gold/80">
              {spread?.slots[focoSlot]?.rotulo}
            </p>
            {dados ? (
              <>
                <h2 className="mt-1 font-display text-xl text-nebula">{dados.nome}</h2>
                {cartaFoco?.invertida && (
                  <p className="mt-0.5 text-[13px] text-rose/90">invertida</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dados.chaves.map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-white/15 px-2 py-0.5 text-[12px] text-mist/85"
                    >
                      {k}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-mist">
                  {cartaFoco?.invertida ? dados.invertida : dados.normal}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-mist/80">
                Esta carta ainda está coberta. Espere {sessao.tarologoNome} virá-la.
              </p>
            )}
            <button
              type="button"
              onClick={() => setFocoSlot(null)}
              className="mt-4 w-full rounded-full border border-white/20 px-4 py-2 text-[14px] text-mist transition hover:text-star"
            >
              Voltar para a mesa
            </button>
          </aside>
        )}

        {/* Afastar e aproximar. Fica na FAIXA DE BAIXO À ESQUERDA porque é o
            único canto livre nos dois estados da tela: o painel de conversa
            ocupa a coluna da esquerda mas para 4rem antes do fim, e o resumo
            da carta em foco mora à direita, no meio. */}
        <div className="pointer-events-auto absolute bottom-3 left-3 z-30 flex gap-2">
          <BotaoRedondo
            titulo="Afastar a mesa para ver todas as cartas"
            onClick={() => setAfastamento((f) => limitarAfastamento(f * PASSO_BOTAO))}
            desabilitado={afastamento >= AFASTAMENTO_MAX - 0.001}
          >
            −
          </BotaoRedondo>
          <BotaoRedondo
            titulo="Aproximar a mesa"
            onClick={() => setAfastamento((f) => limitarAfastamento(f / PASSO_BOTAO))}
            // A folga existe porque o passo é geométrico: o valor encosta no
            // limite sem nunca bater nele exatamente, em ponto flutuante.
            desabilitado={afastamento <= AFASTAMENTO_MIN + 0.001}
          >
            +
          </BotaoRedondo>
        </div>

        {/* A dica sai de cena com a conversa aberta: a faixa que sobra abaixo
            do painel é estreita, e a frase acabaria metade escondida atrás
            dele. O texto fica curto de propósito — em 390px qualquer coisa
            mais longa quebra em três linhas e sobe para debaixo da conversa.
            Quem afasta a mesa encontra os botões ali do lado. */}
        {focoSlot === null && !chat && (
          <p className="glass pointer-events-none absolute bottom-3 left-28 right-3 mx-auto w-fit rounded-full px-4 py-2 text-center text-[13px] text-mist/85">
            Clique numa carta para vê-la de perto.
          </p>
        )}

        {painelChat}
        <DicaGirar />

        {acervo && (
          <SeletorTema
            visual={visual}
            aoFechar={() => setAcervo(false)}
          />
        )}
      </div>
    )
  }

  // ═════════════════════════ visão do tarólogo ═════════════════════════
  return (
    <main
      className="relative"
      onPointerMove={(e) => {
        // Só acompanha o ponteiro enquanto há popup aberto: fora disso, cada
        // movimento do mouse custaria uma renderização à toa.
        if (hoverSlot !== null) setPonteiro({ x: e.clientX, y: e.clientY })
      }}
    >
      {/* A mesa toma a tela inteira abaixo do cabeçalho. A barra e o painel
          flutuam sobre ela em vidro: nenhuma faixa opaca rouba altura da mesa,
          que é o que a pessoa realmente precisa ver. */}
      <div data-sala className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
        {cena}
        {backend && <CameraMesa backend={backend} sessao={sessao} ehTarologo cameraRef={cameraRef} />}

        <BarraFerramentas
          cartas={cartas}
          luzAcesa={luzAcesa}
          menuAberto={menuAberto}
          cartaAtiva={cartaAtiva}
          nomeCartaAtiva={cartaAtiva ? CARD_BY_ID.get(cartaAtiva.cardId)?.nome : undefined}
          rotuloSlot={slotAtivo !== null ? spread?.slots[slotAtivo]?.rotulo : undefined}
          onRevirarTodas={revirarTodas}
          onLuz={() => setLuzAcesa((v) => !v)}
          onCamera={() => cameraRef.current?.conectar()}
          onLimpar={() => {
            patch({ cartas: [] })
            setSlotAtivo(null)
          }}
          onMenu={() => setMenuAberto((v) => !v)}
          onVirar={(slot) => mexer(slot, (c) => ({ ...c, revelada: !c.revelada }))}
          onInverter={(slot) => mexer(slot, (c) => ({ ...c, invertida: !c.invertida }))}
          onTirar={(slot) => {
            patch({ cartas: cartas.filter((c) => c.slot !== slot) })
            setSlotAtivo(null)
          }}
          onEncerrar={() => {
            patch({ encerrada: true })
            irPara('/tiragem')
          }}
        />

        {/* Rodapé de estado, do lado oposto ao menu. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-wrap items-end gap-2 p-3">
          <span className="glass rounded-full px-3 py-1.5 text-[13px] text-mist">
            {sessao.titulo} · Você conduz{sessao.encerrada && ' · encerrada'}
          </span>
          {avisoTemaAusente}
          <span className="pointer-events-auto">{botaoChat}</span>
        </div>

        {painelChat}
        <DicaGirar />

        {/* O menu no cantinho: some quando não é preciso, e volta num clique.
            `inert` e não `aria-hidden`: opacidade zero e `pointer-events: none`
            barram o MOUSE, mas deixam tudo lá dentro no Tab — dava para chegar
            no "Encerrar" às cegas e apertar Enter. E `aria-hidden` sobre
            elementos focáveis é a violação que o próprio Chrome acusa. `inert`
            tira do foco, do ponteiro e do leitor de tela de uma vez. */}
        <div
          className="absolute bottom-3 right-3 top-28 z-30 w-[min(94vw,400px)] transition-[opacity,transform] duration-200 sm:top-16"
          style={{
            opacity: menuAberto ? 1 : 0,
            transform: menuAberto ? 'translateX(0)' : 'translateX(12px)',
          }}
          inert={!menuAberto}
        >
          <PainelTarologo
            spreadId={sessao.spreadId}
            visual={visual}
            temaBaralho={baralho.tema}
            cartas={cartas}
            slotAtivo={slotAtivo}
            onSpread={(id) => {
              // Trocar de layout descarta as cartas que não cabem no novo.
              const n = SPREAD_BY_ID.get(id)?.slots.length ?? 0
              patch({ spreadId: id, cartas: cartas.filter((c) => c.slot < n) })
              setSlotAtivo(null)
            }}
            onPegarCarta={pegarCarta}
          />
        </div>
      </div>

      {arraste && (
        <CartaFlutuante
          cardId={arraste.cardId}
          tema={baralho.tema}
          x={arraste.x}
          y={arraste.y}
          sobreAlvo={slotAlvo !== null}
        />
      )}

      <PopupCarta
        carta={carta}
        rotulo={hoverSlot !== null ? spread?.slots[hoverSlot]?.rotulo : undefined}
        x={ponteiro.x}
        y={ponteiro.y}
      />
    </main>
  )
}
