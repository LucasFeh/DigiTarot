import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { noise } from '../lib/fan'
import type { Side } from '../lib/usePortalPull'

/**
 * Proporção da fenda: largura = altura × isto. Baixo de propósito — é uma
 * abertura lateral alta e estreita, não um disco.
 */
export const PORTAL_ASPECT = 0.44
/**
 * Deslocamento lateral da fenda, em frações da própria largura. Negativo = para
 * DENTRO do palco — a fumaça em volta transborda bastante, e encostada na borda
 * ela seria decepada.
 */
export const PORTAL_INSET = -0.16
/**
 * Distância do centro da fenda até a borda do palco, em frações da largura
 * dela. O DeckSection usa isto para mirar o voo das cartas — sem a constante
 * compartilhada, mudar a geometria aqui faria as cartas pararem no lugar errado.
 */
export const PORTAL_CENTER_INSET = 0.5 - PORTAL_INSET

/** Volutas em volta da fenda, em % da caixa. */
const PUFFS = [
  { id: 'a', x: 50, y: 16, s: 78, filter: 'smoke-f4', fill: '#4a2a9e', o: 0.55, seed: 23, dir: 1 },
  { id: 'b', x: 50, y: 84, s: 76, filter: 'smoke-f2', fill: '#3f1f8c', o: 0.52, seed: 29, dir: -1 },
  { id: 'c', x: 32, y: 38, s: 60, filter: 'smoke-f5', fill: '#6d3fd4', o: 0.42, seed: 34, dir: 1 },
  { id: 'd', x: 68, y: 62, s: 62, filter: 'smoke-f1', fill: '#5e35bb', o: 0.42, seed: 26, dir: -1 },
  { id: 'e', x: 50, y: 50, s: 92, filter: 'smoke-f6', fill: '#2a1668', o: 0.5, seed: 41, dir: 1 },
  { id: 'f', x: 38, y: 26, s: 48, filter: 'smoke-f3', fill: '#8b5cf6', o: 0.3, seed: 19, dir: -1 },
  { id: 'g', x: 62, y: 74, s: 50, filter: 'smoke-f5', fill: '#7c4fe0', o: 0.3, seed: 21, dir: 1 },
]

/**
 * Estrias de vento convergindo para a fenda. `y` em % da altura, `len` em
 * múltiplos da largura da fenda. Curtas de propósito: compridas, viravam
 * listras retas cruzando o palco inteiro por cima das cartas.
 */
const STREAKS = [
  { id: 0, y: 20, len: 0.7, w: 1.4, dur: 1.1, delay: 0, peak: 0.34 },
  { id: 1, y: 30, len: 1.1, w: 2, dur: 0.92, delay: 0.24, peak: 0.46 },
  { id: 2, y: 39, len: 1.4, w: 1.5, dur: 1.26, delay: 0.52, peak: 0.4 },
  { id: 3, y: 47, len: 1.7, w: 2.6, dur: 0.8, delay: 0.1, peak: 0.6 },
  { id: 4, y: 54, len: 1.6, w: 1.6, dur: 1.02, delay: 0.66, peak: 0.5 },
  { id: 5, y: 62, len: 1.3, w: 2.1, dur: 0.88, delay: 0.34, peak: 0.46 },
  { id: 6, y: 72, len: 1, w: 1.5, dur: 1.18, delay: 0.14, peak: 0.4 },
  { id: 7, y: 82, len: 0.7, w: 1.3, dur: 1.3, delay: 0.46, peak: 0.3 },
]

/**
 * Céu dentro do portal. Metade são estrelas distantes que só cintilam; a outra
 * metade cai para o centro e encolhe — é o contraste entre as duas que dá a
 * sensação de poço, e não de superfície pintada.
 */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const cai = i % 2 === 1
  const a = noise(i * 2.7) * Math.PI * 2
  // Nascem dentro do miolo: a fenda é estreita, e longe do eixo a estrela
  // apareceria fora do recorte.
  const r = 14 + noise(i * 5.1) * 26
  return {
    i,
    cai,
    x: 50 + Math.cos(a) * r * 0.55,
    y: 50 + Math.sin(a) * r,
    size: 1 + noise(i * 3.3) * 1.9,
    brilho: 0.5 + noise(i * 7.9) * 0.5,
    dur: cai ? 2.6 + noise(i * 4.3) * 3.4 : 2.2 + noise(i * 6.1) * 3,
    delay: noise(i * 1.9) * 4,
    cor: i % 7 === 0 ? '#f2d492' : i % 5 === 0 ? '#e878c4' : '#ffffff',
  }
})

/** Fenda em forma de lente: pontas afiadas em cima e embaixo, ventre no meio. */
const RIFT = 'M50 0 C80 66 80 234 50 300 C20 234 20 66 50 0 Z'

/**
 * Portal lateral: uma fenda escura rasgada na borda do palco, envolta em
 * fumaça. Sem aro aceso nem disco de acreção — o contorno é dado só pela
 * fumaça, que usa os mesmos filtros de ruído da ilustração do hero, para os
 * dois efeitos falarem a mesma língua.
 *
 * Sempre montado: `open` (0..1) é quem manda.
 */
export default function Portal({
  side,
  open,
  centerY,
  height,
}: {
  side: Side
  open: MotionValue<number>
  /** Centro vertical, em px a partir do topo do palco. */
  centerY: number
  height: number
}) {
  const reduce = useReducedMotion()
  const width = Math.round(height * PORTAL_ASPECT)
  /** Lado por onde o vento chega: o oposto ao da fenda. */
  const inward = side === 'right' ? 'right' : 'left'

  // A fumaça roda acumulando ângulo por quadro: a velocidade acompanha `open`
  // sem o pulo que trocar `animation-duration` daria.
  const spin = useMotionValue(0)
  useAnimationFrame((_, delta) => {
    const o = open.get()
    if (reduce || o < 0.01) return
    spin.set((spin.get() + (delta / 1000) * (6 + o * 22)) % 360)
  })

  const scaleX = useTransform(open, [0, 1], [0.04, 1])
  const scaleY = useTransform(open, [0, 1], [0.3, 1])
  const opacity = useTransform(open, [0, 0.06, 1], [0, 0.5, 1])
  const glow = useTransform(open, (o) => o * 0.9)
  // Só a aura colorida contorna a fenda. Havia também um traço quase branco
  // rente ao contorno e um fio no eixo: ambos liam como cinza sobre o preto e
  // sujavam o buraco, então saíram.
  const aura = useTransform(open, [0, 0.3, 1], [0, 0.4, 0.95])
  // O vento só sopra com a fenda escancarada — é o sinal de que ela está puxando.
  const vento = useTransform(open, [0, 0.6, 1], [0, 0.15, 1])
  // O céu de dentro só aparece com a fenda aberta o bastante para caber nele.
  const ceu = useTransform(open, [0, 0.3, 1], [0, 0.4, 1])
  // A fumaça abre um pouco mais que a fenda, para transbordar as bordas dela.
  const smokeScale = useTransform(open, [0, 1], [0.85, 1.22])

  return (
    <motion.div
      aria-hidden
      data-portal={side}
      className="pointer-events-none absolute z-[55]"
      style={{
        top: centerY,
        [side]: -width * PORTAL_INSET,
        width,
        height,
        marginTop: -height / 2,
        scaleX,
        scaleY,
        opacity,
        // Abre a partir da borda do palco, não do próprio centro.
        transformOrigin: side === 'right' ? '100% 50%' : '0% 50%',
      }}
    >
      {/* Vento: estrias nascendo dentro do palco e colapsando na fenda */}
      <motion.div className="absolute inset-y-0" style={{ opacity: vento, [inward]: '50%', width: 1 }}>
        {!reduce &&
          STREAKS.map((k) => (
            <span
              key={k.id}
              className="absolute rounded-full"
              style={{
                top: `${k.y}%`,
                [side]: 0,
                width: `${k.len * width}px`,
                height: `${k.w}px`,
                // O encolhimento tem de apontar para a fenda, não para o meio
                // da estria — daí a origem no lado dela que toca o portal.
                transformOrigin: side === 'right' ? 'left center' : 'right center',
                background: `linear-gradient(to ${side === 'right' ? 'right' : 'left'}, transparent, #b38cf5 60%, #e8dbff)`,
                filter: 'blur(2.2px)',
                ['--dx' as string]: `${(side === 'right' ? -1 : 1) * k.len * width * 0.55}px`,
                ['--peak' as string]: k.peak,
                animation: `suck-streak ${k.dur}s cubic-bezier(.55,0,.85,.3) ${k.delay}s infinite`,
              }}
            />
          ))}
      </motion.div>

      {/* Sombra funda atrás de tudo: dá profundidade sem desenhar borda */}
      <motion.div
        className="absolute inset-0 -m-[30%] rounded-[50%] blur-2xl"
        style={{
          opacity: glow,
          background: 'radial-gradient(ellipse at center, #1a0836 0%, #2a1668aa 45%, transparent 75%)',
        }}
      />

      {/* Fumaça em volta — transborda a caixa de propósito */}
      <motion.div className="absolute inset-0" style={{ scale: smokeScale }}>
        {PUFFS.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.s}%`,
              aspectRatio: '1',
              marginLeft: `-${p.s / 2}%`,
              marginTop: `-${p.s / 2}%`,
              rotate: reduce ? 0 : spin,
              scaleX: p.dir,
            }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full" style={{ overflow: 'visible' }}>
              <g filter={`url(#${p.filter})`} fill={p.fill} opacity={p.o}>
                {[0, 1, 2].map((k) => (
                  <ellipse
                    key={k}
                    cx={50 + (noise(p.seed + k * 3.1) - 0.5) * 26}
                    cy={50 + (noise(p.seed + k * 7.3) - 0.5) * 34}
                    rx={13 + noise(p.seed + k * 5.9) * 11}
                    ry={17 + noise(p.seed + k * 2.7) * 14}
                  />
                ))}
              </g>
            </svg>
          </motion.div>
        ))}
      </motion.div>

      {/* Luz vazando de dentro da fenda */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-md"
        style={{
          width: '46%',
          height: '72%',
          opacity: glow,
          background: 'radial-gradient(ellipse at center, #a87cf0aa 0%, #6d3fd455 44%, transparent 72%)',
        }}
      />

      {/* A fenda: só o vazio, sem aro */}
      <svg viewBox="0 0 100 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          {/* Horizontal, não radial: o path é alto e fino, e um gradiente
              radial esticado dissolveria o miolo antes de ele aparecer. Assim o
              vazio fica sólido no eixo e some nas laterais — sem contorno. */}
          <linearGradient id={`rift-void-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a0836" stopOpacity="0" />
            <stop offset="14%" stopColor="#120630" stopOpacity="0.5" />
            <stop offset="28%" stopColor="#05010f" stopOpacity="0.95" />
            {/* Platô: o miolo fica sólido, e só as beiradas dissolvem. */}
            <stop offset="38%" stopColor="#000" />
            <stop offset="62%" stopColor="#000" />
            <stop offset="72%" stopColor="#05010f" stopOpacity="0.95" />
            <stop offset="86%" stopColor="#120630" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1a0836" stopOpacity="0" />
          </linearGradient>
          {/* Sem este amaciamento o path recorta contra o fundo e devolve
              justamente o contorno duro que a fenda deveria não ter. */}
          <filter id={`rift-soft-${side}`} x="-50%" y="-20%" width="200%" height="140%">
            <feGaussianBlur stdDeviation="1.4 4" />
          </filter>

          {/* Brilho da borda: o contorno acende, mas sempre borrado. É o blur
              que separa "borda luminosa" de "aro desenhado". */}
          <filter id={`rift-halo-${side}`} x="-120%" y="-30%" width="340%" height="160%">
            <feGaussianBlur stdDeviation="3 7" />
          </filter>
          {/* Vertical: a luz é forte no ventre e morre nas pontas da fenda. */}
          <linearGradient id={`rift-aura-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c4fe0" stopOpacity="0" />
            <stop offset="30%" stopColor="#a87cf0" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#e878c4" />
            <stop offset="70%" stopColor="#a87cf0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7c4fe0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Aura larga em volta da borda */}
        <motion.path
          d={RIFT}
          fill="none"
          stroke={`url(#rift-aura-${side})`}
          strokeWidth="11"
          filter={`url(#rift-halo-${side})`}
          style={{ opacity: aura }}
        />
        {/* O vazio, por cima da aura */}
        <path d={RIFT} fill={`url(#rift-void-${side})`} filter={`url(#rift-soft-${side})`} />
      </svg>

      {/*
        Interior: céu profundo. Entra entre o vazio e a borda acesa — por isso o
        SVG é partido em dois, senão o preto do vazio cobriria as estrelas. O
        recorte é uma elipse inscrita na lente; `clip-path: path()` usaria px
        fixos e não acompanharia a escala do palco.
      */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: ceu, clipPath: 'ellipse(27% 47% at 50% 50%)' }}
      >
        <div className="absolute inset-0 bg-void" />
        {/* Nuvens da galáxia lá no fundo, na mesma paleta da nebulosa do site */}
        <div
          className="absolute inset-0 blur-md"
          style={{
            background:
              'radial-gradient(ellipse 66% 26% at 50% 24%, #241463cc, transparent 72%), radial-gradient(ellipse 56% 22% at 50% 74%, #5c1f5faa, transparent 74%), radial-gradient(ellipse 46% 36% at 50% 50%, #0d0526, transparent 82%)',
          }}
        />
        {/* Poço escuro no eixo: é o que afunda o centro */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 44% 40% at 50% 50%, #000 0%, #000 55%, #00000088 78%, transparent 100%)' }}
        />
        {!reduce &&
          STARS.map((st) => (
            <span
              key={st.i}
              className="absolute rounded-full"
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                width: st.size,
                height: st.size,
                background: st.cor,
                boxShadow: `0 0 ${st.size * 3.2}px ${st.cor}`,
                ['--so' as string]: st.brilho,
                ['--sx' as string]: `${(50 - st.x) * -0.9}px`,
                ['--sy' as string]: `${(50 - st.y) * -2.4}px`,
                animation: `${st.cai ? 'star-infall' : 'star-twinkle'} ${st.dur}s ${
                  st.cai ? 'cubic-bezier(.5,0,.85,.35)' : 'ease-in-out'
                } ${st.delay}s infinite`,
              }}
            />
          ))}
      </motion.div>

    </motion.div>
  )
}
