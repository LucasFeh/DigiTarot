import { useEffect, useRef } from 'react'

type Ponto = { x: number; y: number; t: number }
type Faisca = { x: number; y: number; vx: number; vy: number; vida: number; total: number; raio: number; cor: number; fase: number; ponta: boolean }

const CORES = ['#b98cff', '#8f5cff', '#6d8cff', '#4466ff', '#e6ecff', '#a87cf0']
const DURACAO = 1900
const ATRASO = 180
const CAUDA = 330

function sprite(cor: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const brilho = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    brilho.addColorStop(0, `${cor}ff`)
    brilho.addColorStop(.2, `${cor}aa`)
    brilho.addColorStop(.55, `${cor}33`)
    brilho.addColorStop(1, `${cor}00`)
    ctx.fillStyle = brilho
    ctx.fillRect(0, 0, 64, 64)
  }
  return canvas
}

function estrela(ctx: CanvasRenderingContext2D, tamanho: number) {
  const curva = tamanho * .22
  ctx.beginPath()
  ctx.moveTo(0, -tamanho)
  ctx.quadraticCurveTo(curva, -curva, tamanho, 0)
  ctx.quadraticCurveTo(curva, curva, 0, tamanho)
  ctx.quadraticCurveTo(-curva, curva, -tamanho, 0)
  ctx.quadraticCurveTo(-curva, -curva, 0, -tamanho)
  ctx.fill()
}

/** Uma passagem da mesma estrela de quatro pontas, fita e faíscas da retícula. */
export default function CometaAgendamento() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const imagens = CORES.map(sprite)
    const pontos: Ponto[] = []
    const faiscas: Faisca[] = []
    let largura = 0
    let altura = 0
    let avatar = 98
    let base = 119
    let raf = 0
    let inicio = 0
    let anterior = 0

    function medir() {
      if (!canvas || !ctx) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      largura = canvas.clientWidth
      altura = canvas.clientHeight
      avatar = parseFloat(getComputedStyle(canvas.parentElement!).getPropertyValue('--booking-avatar-center')) || 98
      base = parseFloat(getComputedStyle(canvas.parentElement!).getPropertyValue('--booking-flight-bottom')) || 119
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function traco(inicioPonto: number, espessura: number, cor: string, opacidade: number) {
      if (!ctx || pontos.length - inicioPonto < 2 || opacidade <= 0) return
      ctx.lineWidth = espessura
      ctx.strokeStyle = cor
      ctx.globalAlpha = opacidade
      ctx.beginPath()
      ctx.moveTo(pontos[inicioPonto].x, pontos[inicioPonto].y)
      for (let i = inicioPonto + 1; i < pontos.length - 1; i++) {
        ctx.quadraticCurveTo(pontos[i].x, pontos[i].y, (pontos[i].x + pontos[i + 1].x) / 2, (pontos[i].y + pontos[i + 1].y) / 2)
      }
      ctx.lineTo(pontos[pontos.length - 1].x, pontos[pontos.length - 1].y)
      ctx.stroke()
    }

    function quadro(agora: number) {
      if (!ctx) return
      if (!inicio) inicio = agora
      const intervalo = Math.min(anterior ? agora - anterior : 16, 48)
      anterior = agora
      const tempo = agora - inicio - ATRASO
      const progresso = Math.min(1, Math.max(0, tempo / DURACAO))
      const suavizado = progresso * progresso * (3 - 2 * progresso)
      const x = avatar + (largura - avatar * 2) * suavizado
      const y = altura - base - 42 * Math.sin(Math.PI * suavizado) + 7 * Math.sin(2 * Math.PI * suavizado)

      ctx.clearRect(0, 0, largura, altura)
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (tempo >= 0 && tempo <= DURACAO) {
        pontos.push({ x, y, t: agora })
        if (pontos.length > 80) pontos.shift()
        // O pó nasce ao longo da viagem e deriva depois que a estrela passa.
        for (let i = 0; i < 2; i++) {
          if (faiscas.length >= 150) faiscas.shift()
          const vida = 450 + Math.random() * 550
          faiscas.push({
            x: x + (Math.random() - .5) * 7,
            y: y + (Math.random() - .5) * 7,
            vx: (Math.random() - .7) * .045,
            vy: (Math.random() - .65) * .045,
            vida,
            total: vida,
            raio: 2 + Math.random() * 2.8,
            cor: Math.floor(Math.random() * CORES.length),
            fase: Math.random() * Math.PI * 2,
            ponta: Math.random() < .38,
          })
        }
      }

      while (pontos.length > 1 && agora - pontos[1].t > CAUDA) pontos.shift()
      if (pontos.length > 1) {
        const primeiro = pontos[0]
        const segundo = pontos[1]
        const distancia = segundo.t - primeiro.t
        if (distancia > 0) {
          const avance = Math.min(1, Math.max(0, (agora - primeiro.t - CAUDA) / distancia))
          primeiro.x += (segundo.x - primeiro.x) * avance
          primeiro.y += (segundo.y - primeiro.y) * avance
          primeiro.t += distancia * avance
        }
      } else if (pontos.length === 1 && agora - pontos[0].t > CAUDA) pontos.length = 0

      const caudaVisivel = Math.min(1, Math.max(0, (DURACAO + 400 - tempo) / 400))
      if (pontos.length > 1) {
        const meio = Math.min(pontos.length - 2, Math.floor(pontos.length * .42))
        const ponta = Math.min(pontos.length - 2, Math.floor(pontos.length * .72))
        traco(0, 16, '#7098ff', .05 * caudaVisivel)
        traco(meio, 11.5, '#7098ff', .05 * caudaVisivel)
        traco(ponta, 7.5, '#7098ff', .055 * caudaVisivel)
        traco(0, 6.5, '#b98cff', .1 * caudaVisivel)
        traco(meio, 4.6, '#b98cff', .11 * caudaVisivel)
        traco(ponta, 3, '#b98cff', .12 * caudaVisivel)
        traco(0, 2.2, '#f4ecff', .18 * caudaVisivel)
        traco(meio, 1.6, '#f6f0ff', .21 * caudaVisivel)
        traco(ponta, 1.1, '#ffffff', .25 * caudaVisivel)
      }

      for (let i = faiscas.length - 1; i >= 0; i--) {
        const faisca = faiscas[i]
        faisca.vida -= intervalo
        if (faisca.vida <= 0) { faiscas.splice(i, 1); continue }
        faisca.x += faisca.vx * intervalo
        faisca.y += faisca.vy * intervalo
        faisca.vy -= .00004 * intervalo
        const vida = faisca.vida / faisca.total
        const brilho = .35 + .65 * (.5 + .5 * Math.sin(agora * .012 + faisca.fase))
        const raio = faisca.raio * (.4 + .6 * vida)
        ctx.globalAlpha = vida * vida * .48 * brilho
        ctx.drawImage(imagens[faisca.cor], faisca.x - raio, faisca.y - raio, raio * 2, raio * 2)
        if (faisca.ponta) {
          ctx.save()
          ctx.translate(faisca.x, faisca.y)
          ctx.rotate(faisca.fase + agora * .0004)
          ctx.globalAlpha = vida * vida * .56 * brilho
          ctx.fillStyle = '#fff'
          estrela(ctx, raio * .7)
          ctx.restore()
        }
      }

      const cabeca = tempo < 0 || tempo >= DURACAO ? 0 : Math.min(1, progresso * 12, (1 - progresso) * 16)
      if (cabeca > 0) {
        const escala = 10.8 * (1 + .045 * Math.sin(agora * .009))
        ctx.save()
        ctx.translate(x, y)
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, escala * 4.2)
        halo.addColorStop(0, `rgba(185,140,255,${.32 * cabeca})`)
        halo.addColorStop(.45, `rgba(112,152,255,${.16 * cabeca})`)
        halo.addColorStop(1, 'rgba(112,152,255,0)')
        ctx.globalAlpha = 1
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(0, 0, escala * 4.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.rotate(agora * .00016 + Math.PI / 4)
        ctx.globalAlpha = .52 * cabeca
        ctx.fillStyle = '#9dc4ff'
        estrela(ctx, escala * .9)
        ctx.rotate(-Math.PI / 4)
        ctx.globalAlpha = .86 * cabeca
        ctx.fillStyle = '#f4ecff'
        estrela(ctx, escala * 1.7)
        ctx.globalAlpha = cabeca
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(0, 0, escala * .17, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      if (tempo < DURACAO + 1100) raf = requestAnimationFrame(quadro)
    }

    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(canvas)
    raf = requestAnimationFrame(quadro)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={ref} className="booking-comet-canvas" aria-hidden="true" />
}
