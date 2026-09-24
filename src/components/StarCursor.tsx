import { useEffect, useRef } from 'react'

type Mote = {
  x: number
  y: number
  /** Velocidade em px/ms. */
  vx: number
  vy: number
  /** Vida restante e vida total, em ms. */
  life: number
  max: number
  /** Raio em px quando a partícula nasce. */
  size: number
  /** Índice em TRAIL: o glow colorido e a cor da ponta. */
  ci: number
  /** Cintilar: velocidade (rad/ms) e fase — é o que faz piscar. */
  tw: number
  phase: number
  /** Comprimento do raio da estrelinha de 4 pontas; 0 = só o glow redondo. */
  ponta: number
  /** Giro da estrelinha: ângulo inicial e velocidade. */
  rot: number
  spin: number
}

/** Ponto do caminho do ponteiro, com o instante em que foi registrado. */
type Ponto = { x: number; y: number; t: number }

/** Cores das faíscas: roxo e azul, sem magenta, com um azul frio no meio. */
const TRAIL = ['#b98cff', '#8f5cff', '#6d8cff', '#4466ff', '#e6ecff', '#a87cf0']

/** Onde o cursor do sistema serve melhor que a estrela. */
const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]'
/** Onde a estrela cresce e brilha mais. */
const CLICKABLE = 'a, button, [role="button"], summary, label'

const VIOLET = '185,140,255'
const BLUE = '112,152,255'

/** Cauda da fita, em ms, e teto de pontos guardados. O teto tem de caber a
 *  cauda inteira na taxa de quadros mais alta que a amostragem permite (um
 *  ponto a cada 4ms = 65), senão ele corta a cauda antes da idade e o rastro
 *  encurta em monitor de 240Hz. */
const CAUDA = 260
const MAX_PONTOS = 72
/** Intervalo mínimo entre pontos, em ms: desacopla o custo do traçado da taxa
 *  de atualização do monitor. */
const AMOSTRA = 4
/** Salto acima disto é teleporte (voltar de outra janela, entrar pela borda):
 *  a fita é zerada, senão sai um risco atravessando a tela. */
const SALTO = 180

/** Bolinha de luz pré-renderizada — desenhar sprite sai bem mais barato que
 *  montar um gradiente radial por partícula a cada quadro. */
function makeSprite(hex: string) {
  const s = 96
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    grad.addColorStop(0, `${hex}ff`)
    grad.addColorStop(0.18, `${hex}a8`)
    grad.addColorStop(0.5, `${hex}33`)
    grad.addColorStop(1, `${hex}00`)
    g.fillStyle = grad
    g.fillRect(0, 0, s, s)
  }
  return c
}

/**
 * Substitui o ponteiro por uma estrela de quatro pontas que arrasta uma fita de
 * luz roxo/azul. Tudo é somado por cima do fundo (`lighter`), então o rastro
 * "acende" a nebulosa em vez de tapá-la.
 *
 * A fita é um traço contínuo pelo caminho do ponteiro, não uma nuvem de
 * partículas: é o que a faz ler como um risco de luz sólido. O degradê da
 * cauda para a cabeça vem de traçados ANINHADOS — o caminho inteiro, depois só
 * os 58% finais, depois só os 28% finais. Somados, a cabeça recebe três
 * demãos e a cauda uma, o que dá a queda de brilho sem nenhuma emenda visível
 * (dentro de um mesmo `stroke()` o canvas não acumula sobreposição, então
 * curvas que se cruzam não viram nó brilhante).
 *
 * Só entra em cena com ponteiro fino e sem `prefers-reduced-motion`: no toque
 * e para quem pediu menos movimento o cursor nativo continua como está.
 */
export default function StarCursor() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const root = document.documentElement
    root.classList.add('star-cursor')

    const sprites = TRAIL.map(makeSprite)
    const motes: Mote[] = []
    /** Caminho do ponteiro, do mais velho para o mais novo. */
    const pontos: Ponto[] = []
    const pos = { x: -200, y: -200 }
    const last = { x: -200, y: -200 }

    let w = 0
    let h = 0
    let raf = 0
    let prevT = 0
    /** Já houve um primeiro mousemove? Antes disso não desenhamos nada. */
    let seen = false
    /** Molas de aparição e de "está sobre algo clicável". */
    let vis = 0
    let hover = 0
    let hoverTarget = 0
    /** Decai de 1 a 0 depois de um clique. */
    let press = 0
    let overField = false
    let inside = true
    /** `ativo` do quadro anterior, para detectar a volta ao estado ativo. */
    let ativoPrev = false

    const schedule = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      // Medir o elemento, nunca a janela: o canvas é `fixed inset-0`, então a
      // caixa dele EXCLUI os 10px da barra de rolagem que `innerWidth` inclui.
      // Com innerWidth o bitmap era espremido e a estrela ficava desenhada até
      // 10px à esquerda do ponteiro de verdade.
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawn = (x: number, y: number, vx: number, vy: number, scale = 1) => {
      if (motes.length > 190) motes.shift()
      const max = 520 + Math.random() * 760
      motes.push({
        x,
        y,
        vx,
        vy,
        life: max,
        max,
        size: (1.8 + Math.random() * 2.6) * scale,
        ci: Math.floor(Math.random() * TRAIL.length),
        // Período de ~350ms a ~1s: a faísca pisca duas ou três vezes antes de
        // apagar, que é o que a faz parecer brilhinho e não bolinha.
        tw: 0.006 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
        // Parte delas ganha ponta de estrela; o resto fica só como brilho
        // redondo, senão o rastro vira um enxame de asteriscos.
        ponta: Math.random() < 0.42 ? (2.2 + Math.random() * 3) * scale : 0,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.0016,
      })
    }

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      if (!seen) {
        last.x = pos.x
        last.y = pos.y
        seen = true
      }
      inside = true
      const el = e.target instanceof Element ? e.target : null
      overField = !!el?.closest(TEXT_FIELDS)
      hoverTarget = el?.closest(CLICKABLE) ? 1 : 0
      schedule()
    }

    const onDown = () => {
      // Mesma porta do resto do efeito: sobre campo de texto, fora da janela
      // ou antes do primeiro mousemove a estrela está desligada — era o único
      // emissor sem essa checagem, e soltava faíscas onde nada devia aparecer.
      if (!seen || !inside || overField) return
      press = 1
      // Faiscada curta saindo da estrela.
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 0.05 + Math.random() * 0.12
        spawn(pos.x, pos.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.8)
      }
      schedule()
    }

    const onLeave = () => {
      inside = false
      schedule()
    }
    const onEnter = () => {
      inside = true
      schedule()
    }

    // Drag nativo (arrastar uma imagem ou link): o Chrome para de emitir
    // mousemove até o drop, e sem isto a estrela congela acesa no meio da
    // página. Nenhuma imagem do site tem `draggable={false}`.
    const onDragStart = () => {
      inside = false
      schedule()
    }
    const onDragEnd = () => {
      inside = true
      schedule()
    }

    /** Estrela de quatro pontas com as laterais côncavas. */
    const sparkle = (len: number, k: number) => {
      ctx.beginPath()
      ctx.moveTo(0, -len)
      ctx.quadraticCurveTo(k, -k, len, 0)
      ctx.quadraticCurveTo(k, k, 0, len)
      ctx.quadraticCurveTo(-k, k, -len, 0)
      ctx.quadraticCurveTo(-k, -k, 0, -len)
      ctx.fill()
    }

    /**
     * Traça o caminho do índice `i0` até a cabeça. A curva passa pelos pontos
     * médios usando cada ponto como controle: um polígono cru mostraria cada
     * quina do movimento do mouse.
     */
    const traco = (i0: number, larg: number, cor: string, alfa: number) => {
      const n = pontos.length
      if (n - i0 < 2 || alfa <= 0.002) return
      ctx.lineWidth = larg
      ctx.strokeStyle = cor
      ctx.globalAlpha = alfa
      ctx.beginPath()
      ctx.moveTo(pontos[i0].x, pontos[i0].y)
      for (let i = i0 + 1; i < n - 1; i++) {
        ctx.quadraticCurveTo(
          pontos[i].x,
          pontos[i].y,
          (pontos[i].x + pontos[i + 1].x) / 2,
          (pontos[i].y + pontos[i + 1].y) / 2,
        )
      }
      ctx.lineTo(pontos[n - 1].x, pontos[n - 1].y)
      ctx.stroke()
    }

    const draw = (t: number) => {
      raf = 0
      // Primeiro quadro (e volta de aba parada) não pode render dt gigante.
      const dt = Math.min(prevT ? t - prevT : 16, 48)
      prevT = t
      ctx.clearRect(0, 0, w, h)

      // ---- molas -------------------------------------------------------
      const visTarget = seen && inside && !overField ? 1 : 0
      vis += (visTarget - vis) * Math.min(1, dt / 90)
      hover += (hoverTarget - hover) * Math.min(1, dt / 130)
      press = Math.max(0, press - dt / 260)

      // ---- caminho do ponteiro ------------------------------------------
      const dx = pos.x - last.x
      const dy = pos.y - last.y
      const dist = Math.hypot(dx, dy)
      const ativo = seen && inside && !overField

      if (dist > SALTO) pontos.length = 0
      // Voltar de um campo de texto ou de fora da janela também recomeça: sem
      // isto o primeiro ponto novo é ligado ao último de antes por um risco.
      if (ativo && !ativoPrev) pontos.length = 0

      // Limiar por VELOCIDADE, não por quadro: com `dist > 0.6` fixo, a
      // velocidade mínima para o rastro existir subia junto com a taxa do
      // monitor (36px/s a 60Hz, mas 144px/s a 240Hz).
      const passo = 0.6 * (dt / 16.7)
      const ultimo = pontos[pontos.length - 1]
      if (ativo && (!ultimo || t - ultimo.t >= AMOSTRA) && (dist > passo || pontos.length === 0)) {
        pontos.push({ x: pos.x, y: pos.y, t })
        if (pontos.length > MAX_PONTOS) pontos.shift()
      }

      // A ponta velha DESLIZA para cima da seguinte em vez de ser decepada.
      // Cortando ponto a ponto, a cauda sumia em blocos de um quadro inteiro
      // de deslocamento (~13px a 800px/s) e com brilho total até o fim.
      while (pontos.length > 1 && t - pontos[1].t > CAUDA) pontos.shift()
      if (pontos.length > 1) {
        const a = pontos[0]
        const b = pontos[1]
        const span = b.t - a.t
        if (span > 0) {
          const kk = Math.min(1, Math.max(0, (t - a.t - CAUDA) / span))
          a.x += (b.x - a.x) * kk
          a.y += (b.y - a.y) * kk
          a.t += span * kk
        }
      } else if (pontos.length === 1 && t - pontos[0].t > CAUDA) {
        pontos.length = 0
      }
      // Some JUNTO com a estrela, não um quadro antes: zerar no instante em
      // que `ativo` cai dava um corte seco enquanto a estrela ainda apagava
      // suavemente por ~90ms.
      if (!ativo && vis <= 0.01) pontos.length = 0
      ativoPrev = ativo

      // `dist <= SALTO`: num teleporte a fita é descartada, mas sem esta porta
      // as faíscas continuavam sendo semeadas ao longo do salto — três pontos
      // atravessando a tela, disparando a 3600px/s. Era o mesmo risco que o
      // guarda existe para evitar, só que em partícula.
      if (ativo && dist > 0.6 && dist <= SALTO) {
        // Brilhinhos soltos por cima da fita — o brilho sólido é a fita, estes
        // são o pó que ela vai deixando cair.
        const n = Math.min(4, 1 + Math.round(dist * 0.2))
        for (let i = 0; i < n; i++) {
          const k = (i + Math.random()) / n
          spawn(
            last.x + dx * k + (Math.random() - 0.5) * 4,
            last.y + dy * k + (Math.random() - 0.5) * 4,
            dx * 0.003 + (Math.random() - 0.5) * 0.02,
            dy * 0.003 + (Math.random() - 0.5) * 0.02,
          )
        }
      }
      last.x = pos.x
      last.y = pos.y

      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // ---- a fita de luz -------------------------------------------------
      if (vis > 0.01 && pontos.length > 1) {
        const n = pontos.length
        // Presos em `n - 2`: `traco` desiste com menos de dois pontos, então
        // com a fita curta (3 pontos) a demão da cabeça era descartada e o
        // brilho caía ~40% num degrau — bem no fim de cada recolhida.
        const meio = Math.min(n - 2, Math.floor(n * 0.42))
        const cabeca = Math.min(n - 2, Math.floor(n * 0.72))

        // Halo azul largo: o vazamento de luz em volta do risco.
        traco(0, 16, `rgb(${BLUE})`, 0.05 * vis)
        traco(meio, 11.5, `rgb(${BLUE})`, 0.05 * vis)
        traco(cabeca, 7.5, `rgb(${BLUE})`, 0.055 * vis)

        // Corpo violeta: é ele que dá a cor do rastro.
        traco(0, 6.5, `rgb(${VIOLET})`, 0.1 * vis)
        traco(meio, 4.6, `rgb(${VIOLET})`, 0.11 * vis)
        traco(cabeca, 3, `rgb(${VIOLET})`, 0.12 * vis)

        // Núcleo quase branco: o fio sólido no meio da luz. Somados, os três
        // traçados chegam a ~0,64 de alfa na cabeça e caem para 0,18 na cauda.
        traco(0, 2.2, '#f4ecff', 0.18 * vis)
        traco(meio, 1.6, '#f6f0ff', 0.21 * vis)
        traco(cabeca, 1.1, '#ffffff', 0.25 * vis)
      }

      // ---- faíscas -------------------------------------------------------
      const damp = Math.pow(0.92, dt / 16)
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i]
        m.life -= dt
        if (m.life <= 0) {
          motes.splice(i, 1)
          continue
        }
        m.x += m.vx * dt
        m.y += m.vy * dt
        // Sobe de leve, como brasa, e vai perdendo o embalo.
        m.vy -= 0.00004 * dt
        m.vx *= damp
        m.vy *= damp

        const k = m.life / m.max
        const r = m.size * (0.4 + 0.6 * k)
        // Cintilar: vai de 0,35 a 1 e volta. É o piscar que transforma a
        // partícula em "brilhinho" — sem ele são bolinhas que só apagam.
        const cintila = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * m.tw + m.phase))
        const vida = Math.sqrt(k) * k

        ctx.globalAlpha = vida * 0.42 * cintila
        ctx.drawImage(sprites[m.ci], m.x - r, m.y - r, r * 2, r * 2)

        // A ponta de estrela vai por cima do glow colorido: o branco dá o
        // estalo e a cor do glow por baixo faz o halo.
        if (m.ponta > 0) {
          ctx.save()
          ctx.translate(m.x, m.y)
          ctx.rotate(m.rot + t * m.spin)
          const len = m.ponta * (0.45 + 0.55 * k)
          ctx.globalAlpha = vida * 0.55 * cintila
          ctx.fillStyle = '#ffffff'
          sparkle(len, len * 0.24)
          ctx.restore()
        }
      }

      // ---- a estrela ----------------------------------------------------
      if (vis > 0.01) {
        const beat = 1 + 0.05 * Math.sin(t * 0.0032)
        const s = (8.6 + hover * 5.5 + press * 4.5) * beat * (0.7 + 0.3 * vis)
        const rot = t * 0.00016

        ctx.save()
        ctx.translate(pos.x, pos.y)

        // Bloom largo e azul, o vazamento de luz mais externo.
        ctx.globalAlpha = 1
        ctx.fillStyle = `rgba(96,140,255,${0.07 * vis})`
        ctx.beginPath()
        ctx.arc(0, 0, s * 6.5, 0, Math.PI * 2)
        ctx.fill()

        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 4.2)
        halo.addColorStop(0, `rgba(${VIOLET},${0.32 * vis})`)
        halo.addColorStop(0.35, `rgba(138,124,255,${0.18 * vis})`)
        halo.addColorStop(0.62, `rgba(${BLUE},${0.14 * vis})`)
        halo.addColorStop(1, `rgba(${BLUE},0)`)
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(0, 0, s * 4.2, 0, Math.PI * 2)
        ctx.fill()

        // Raios diagonais: menores, mais frios.
        ctx.rotate(rot + Math.PI / 4)
        ctx.globalAlpha = 0.52 * vis
        ctx.fillStyle = '#9dc4ff'
        sparkle(s * 0.9, s * 0.22)

        // Raios principais.
        ctx.rotate(-Math.PI / 4)
        ctx.globalAlpha = 0.82 * vis
        ctx.fillStyle = '#f4ecff'
        sparkle(s * 1.7, s * 0.22)

        // Núcleo.
        ctx.globalAlpha = vis
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      // Keep the pulse fluid while the star is visible, then stop the canvas
      // entirely once its fade and particles have finished.
      if ((seen && inside && !overField) || vis > 0.01 || motes.length || pontos.length) schedule()
    }

    resize()
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
        ctx.clearRect(0, 0, w, h)
      } else {
        prevT = 0
        schedule()
      }
    }
    // ResizeObserver e não `window.resize`: a barra de rolagem aparece e some
    // conforme o conteúdo da rota muda, e isso não dispara resize de janela.
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    document.addEventListener('dragstart', onDragStart)
    document.addEventListener('dragend', onDragEnd)
    document.addEventListener('drop', onDragEnd)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('dragend', onDragEnd)
      document.removeEventListener('drop', onDragEnd)
      document.removeEventListener('visibilitychange', onVisibility)
      root.classList.remove('star-cursor')
    }
  }, [])

  return (
    // `w-screen` e não `inset-0`: a caixa de um `fixed inset-0` exclui a calha
    // da barra de rolagem, e como `cursor: none` vale lá também, o ponteiro
    // sumia de vez naqueles ~10px. 100vw inclui a calha; `overflow-x: hidden`
    // no body (index.css) garante que isso não crie rolagem horizontal.
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-screen w-screen"
    />
  )
}
