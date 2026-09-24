import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useMemo } from 'react'
import { noise } from '../lib/fan'
import type { SmokeField } from '../lib/useSmokeField'

/** Alcance do cursor, em % da largura do retrato. */
const REACH = 54
/** Deslocamento máximo de uma voluta, em % da largura. */
const PUSH = 42
/** A fumaça abre mais para os lados do que para cima e para baixo. */
const VERTICAL_BIAS = 0.45
/** Componente tangencial: em vez de fugir em linha reta, a voluta contorna. */
const SWIRL = 0.4
/** Pontos amostrados na órbita. 12 já não se distingue de um círculo. */
const ORBIT_STEPS = 12

type Puff = {
  id: string
  /** Centro em % da caixa do retrato. */
  x: number
  y: number
  /** Diâmetro em % da largura. */
  size: number
  filter: string
  fill: string
  opacity: number
  /** Quanto a voluta corre do cursor: leves fogem mais. */
  mass: number
  /** Semente da forma e da fase da órbita. */
  seed: number
  /** Raio da órbita, em % do próprio tamanho. Pequeno: em repouso a fumaça
   *  deve respirar, não passear. */
  orbit: number
  /** Período da órbita, em segundos. */
  dur: number
  /** Sentido do giro. */
  spin: 1 | -1
}

/** Bruma larga, atrás da figura: órbitas grandes e lentas. */
const BEHIND: Puff[] = [
  { id: 'b1', x: 24, y: 64, size: 54, filter: 'smoke-f4', fill: '#7c4fe0', opacity: 0.3, mass: 0.5, seed: 3, orbit: 3.8, dur: 60, spin: 1 },
  { id: 'b2', x: 52, y: 70, size: 62, filter: 'smoke-f2', fill: '#7c4fe0', opacity: 0.28, mass: 0.42, seed: 11, orbit: 2.9, dur: 72, spin: -1 },
  { id: 'b3', x: 80, y: 64, size: 52, filter: 'smoke-f4', fill: '#6d3fd4', opacity: 0.28, mass: 0.52, seed: 19, orbit: 4.2, dur: 65, spin: 1 },
  { id: 'b4', x: 52, y: 50, size: 48, filter: 'smoke-f5', fill: '#8b5cf6', opacity: 0.19, mass: 0.6, seed: 27, orbit: 3.4, dur: 79, spin: -1 },
]

/** Volutas na frente, cobrindo a borda inferior e as laterais do recorte. */
const FRONT: Puff[] = [
  { id: 'f1', x: 8, y: 87, size: 32, filter: 'smoke-f1', fill: '#cbb0ff', opacity: 0.25, mass: 1.25, seed: 31, orbit: 6.3, dur: 37, spin: 1 },
  { id: 'f2', x: 22, y: 82, size: 28, filter: 'smoke-f3', fill: '#cbb0ff', opacity: 0.23, mass: 1.35, seed: 37, orbit: 7.1, dur: 32, spin: -1 },
  { id: 'f3', x: 36, y: 89, size: 34, filter: 'smoke-f6', fill: '#b79bff', opacity: 0.25, mass: 1.1, seed: 41, orbit: 5.5, dur: 44, spin: 1 },
  { id: 'f4', x: 50, y: 83, size: 28, filter: 'smoke-f1', fill: '#cbb0ff', opacity: 0.21, mass: 1.4, seed: 47, orbit: 7.6, dur: 28, spin: -1 },
  { id: 'f5', x: 64, y: 90, size: 32, filter: 'smoke-f3', fill: '#b79bff', opacity: 0.25, mass: 1.15, seed: 53, orbit: 5.9, dur: 40, spin: 1 },
  { id: 'f6', x: 78, y: 83, size: 28, filter: 'smoke-f2', fill: '#cbb0ff', opacity: 0.23, mass: 1.3, seed: 59, orbit: 6.7, dur: 33, spin: -1 },
  { id: 'f7', x: 92, y: 89, size: 32, filter: 'smoke-f5', fill: '#c0a4ff', opacity: 0.25, mass: 1.2, seed: 61, orbit: 5.9, dur: 47, spin: 1 },
  // Sobem pelas laterais, onde o recorte tem corte reto
  { id: 's1', x: 4, y: 70, size: 26, filter: 'smoke-f2', fill: '#e878c4', opacity: 0.19, mass: 1.45, seed: 67, orbit: 8.0, dur: 51, spin: -1 },
  { id: 's2', x: 7, y: 56, size: 22, filter: 'smoke-f6', fill: '#e878c4', opacity: 0.16, mass: 1.6, seed: 71, orbit: 8.8, dur: 58, spin: 1 },
  { id: 's3', x: 96, y: 68, size: 26, filter: 'smoke-f1', fill: '#e878c4', opacity: 0.19, mass: 1.45, seed: 73, orbit: 8.0, dur: 54, spin: 1 },
  { id: 's4', x: 93, y: 54, size: 22, filter: 'smoke-f4', fill: '#df6fc6', opacity: 0.16, mass: 1.6, seed: 79, orbit: 9.2, dur: 61, spin: -1 },
]

/**
 * Cada voluta é um aglomerado de quatro elipses sob o MESMO filtro. É isso que
 * a deixa orgânica: o ruído costura as elipses numa massa só, abrindo fendas e
 * pontas entre elas. Uma elipse sozinha por filtro volta a ser um borrão
 * redondo, por mais deslocamento que leve.
 */
function cluster(seed: number) {
  return Array.from({ length: 4 }, (_, i) => ({
    cx: 50 + (noise(seed + i * 3.7) - 0.5) * 38,
    cy: 50 + (noise(seed + i * 8.1) - 0.5) * 28,
    rx: 15 + noise(seed + i * 5.3) * 15,
    ry: 11 + noise(seed + i * 2.9) * 11,
    o: 0.6 + noise(seed + i * 6.1) * 0.4,
  }))
}

/** Órbita fechada: o último ponto repete o primeiro, então o laço não tem emenda. */
function orbit(puff: Puff) {
  const phase = noise(puff.seed) * Math.PI * 2
  const rx = puff.orbit
  const ry = puff.orbit * 0.62
  const x: string[] = []
  const y: string[] = []
  for (let i = 0; i <= ORBIT_STEPS; i++) {
    const a = phase + puff.spin * (i / ORBIT_STEPS) * Math.PI * 2
    x.push(`${(Math.cos(a) * rx).toFixed(2)}%`)
    y.push(`${(Math.sin(a) * ry).toFixed(2)}%`)
  }
  return { x, y }
}

/**
 * Campo de influência do cursor sobre uma voluta: direção normalizada e o
 * quanto ela é afetada (0 longe, 1 em cima).
 */
function field(puff: Puff, px: number, py: number, s: number) {
  const dx = puff.x - px
  // Achata a distância vertical: o campo é largo e baixo, então a fumaça se
  // abre para os lados em vez de subir — que é como ela reage quando uma mão
  // passa por dentro.
  const dy = (puff.y - py) * 0.62
  const d = Math.hypot(dx, dy) || 0.0001
  return { nx: dx / d, ny: dy / d, f: Math.max(0, 1 - d / REACH) * s }
}

/** Empurrão que o cursor dá numa voluta, em pixels. */
function shove(puff: Puff, px: number, py: number, s: number, w: number, axis: 'x' | 'y') {
  if (!w || s <= 0.001) return 0
  const { nx, ny, f } = field(puff, px, py, s)
  const force = f * f * PUSH * puff.mass
  // Radial (fugir) + tangencial (contornar) — o tangencial é o que dá o
  // redemoinho e evita que pareça uma explosão a partir do cursor.
  const out =
    axis === 'x' ? nx * force - ny * force * SWIRL : ny * force * VERTICAL_BIAS + nx * force * SWIRL
  return (out * w) / 100
}

/** Perto do cursor a voluta também incha — fumaça empurrada se dispersa. */
function bloat(puff: Puff, px: number, py: number, s: number) {
  const { f } = field(puff, px, py, s)
  return 1 + f * f * 0.45 * puff.mass
}

function PuffLayer({ puff, field: smoke }: { puff: Puff; field?: SmokeField }) {
  const reduce = useReducedMotion()
  const shapes = useMemo(() => cluster(puff.seed), [puff.seed])
  const path = useMemo(() => orbit(puff), [puff])

  // Sem campo (páginas sem interação) as motion values ficam paradas em zero.
  const zero = useMotionValue(0)
  const px = smoke?.x ?? zero
  const py = smoke?.y ?? zero
  const st = smoke?.strength ?? zero
  const w = smoke?.width ?? zero

  const tx = useTransform([px, py, st, w], ([a, b, c, d]: number[]) => shove(puff, a, b, c, d, 'x'))
  const ty = useTransform([px, py, st, w], ([a, b, c, d]: number[]) => shove(puff, a, b, c, d, 'y'))
  const tScale = useTransform([px, py, st], ([a, b, c]: number[]) => bloat(puff, a, b, c))

  // Mola frouxa e pouco amortecida: a voluta chega atrasada, passa do ponto e
  // volta balançando. É o atraso que faz parecer fumaça, e não objeto rígido.
  const spring = { stiffness: 42, damping: 12, mass: 0.7 }
  const sx = useSpring(tx, spring)
  const sy = useSpring(ty, spring)
  const scale = useSpring(tScale, spring)
  // Inchou, rareou: a opacidade sai da própria escala, sem uma segunda mola.
  const opacity = useTransform(scale, (v) => Math.max(0.35, 1 - (v - 1) * 1.15))

  return (
    // De fora para dentro: reação ao cursor (molas), depois o rodopio ocioso.
    // Se os dois mexessem no transform do mesmo elemento, um anularia o outro.
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: `${puff.x}%`,
        top: `${puff.y}%`,
        width: `${puff.size}%`,
        aspectRatio: '1',
        // Margens em % resolvem contra a largura do container — e a voluta é
        // quadrada com essa mesma base, então as duas centralizam certo. Assim
        // x/y ficam livres para as molas.
        marginLeft: `-${puff.size / 2}%`,
        marginTop: `-${puff.size / 2}%`,
        x: sx,
        y: sy,
        scale,
        opacity,
      }}
    >
      <motion.div
        className="h-full w-full"
        animate={
          reduce
            ? undefined
            : { x: path.x, y: path.y, rotate: [0, puff.spin * 360], scale: [1, 1.035, 0.975, 1.02, 1] }
        }
        transition={
          reduce
            ? undefined
            : {
                x: { duration: puff.dur, repeat: Infinity, ease: 'linear' },
                y: { duration: puff.dur, repeat: Infinity, ease: 'linear' },
                // O giro roda bem mais devagar que a órbita: os dois períodos
                // nunca coincidem, então o movimento não se repete à vista.
                rotate: { duration: puff.dur * 3.4, repeat: Infinity, ease: 'linear' },
                scale: { duration: puff.dur * 0.83, repeat: Infinity, ease: 'easeInOut' },
              }
        }
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" style={{ overflow: 'visible' }} aria-hidden>
          <g filter={`url(#${puff.filter})`} fill={puff.fill} opacity={puff.opacity}>
            {shapes.map((s, i) => (
              <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} opacity={s.o} />
            ))}
          </g>
        </svg>
      </motion.div>
    </motion.div>
  )
}

/**
 * Fumaça em volta da ilustração. Cada voluta é um aglomerado de elipses fundido
 * por ruído, girando na própria órbita, e empurrado para longe do ponteiro
 * conforme a distância — passar o mouse abre a nuvem por onde ele passou, como
 * uma mão atravessando fumaça de verdade. Sem `field`, elas só rodopiam.
 */
export default function SmokeCloud({ field, front = false }: { field?: SmokeField; front?: boolean }) {
  return (
    <>
      {(front ? FRONT : BEHIND).map((p) => (
        <PuffLayer key={p.id} puff={p} field={field} />
      ))}
    </>
  )
}
