import { useMemo, useRef } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { noise } from '../lib/fan'

/** Quanto a perspectiva empurra o centro visível para baixo, em frações da largura. */
const PERSPECTIVE_DROP = 0.148

/** Raio de cada anel dentro do viewBox de 400x400 (centro em 200,200). */
const R = { ticks: 188, runes: 160, band: 132, star: 116, core: 58 }

/**
 * Runas desenhadas em traço, não em caractere. Fonte de símbolo varia demais
 * entre sistemas — no Windows 10 metade dos glifos alquímicos vira quadrado.
 * Três segmentos por runa, sorteados de um ruído determinístico: sempre as
 * mesmas, e nenhuma depende de fonte instalada.
 */
function rune(i: number) {
  const seg: string[] = []
  for (let s = 0; s < 3; s++) {
    const k = i * 9.7 + s * 3.1
    const x1 = -4.5 + noise(k) * 9
    const y1 = -7 + noise(k + 1.3) * 14
    const x2 = -4.5 + noise(k + 2.7) * 9
    const y2 = -7 + noise(k + 4.1) * 14
    seg.push(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`)
  }
  return seg.join('')
}

/** Polígono estrelado {n/step} — os vértices pulam de `step` em `step`. */
function starPath(n: number, step: number, r: number) {
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const a = ((i * step) % n) * ((Math.PI * 2) / n) - Math.PI / 2
    pts.push(`${(200 + Math.cos(a) * r).toFixed(1)},${(200 + Math.sin(a) * r).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

const RUNES = Array.from({ length: 24 }, (_, i) => i)
const TICKS = Array.from({ length: 60 }, (_, i) => i)
const NODES = Array.from({ length: 7 }, (_, i) => i)

function Ring({
  children,
  spin,
  seconds,
  running,
}: {
  children: React.ReactNode
  spin: 'cw' | 'ccw'
  seconds: number
  /** Parado, o navegador não refiltra o drop-shadow do SVG a cada quadro. */
  running: boolean
}) {
  return (
    <g
      style={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        // O play-state vai DENTRO da shorthand: declarar `animationPlayState` ao
        // lado de `animation` faz o React avisar sobre propriedades conflitantes.
        animation: `spin-${spin} ${seconds}s linear 0s infinite normal none ${running ? 'running' : 'paused'}`,
      }}
    >
      {children}
    </g>
  )
}

/**
 * Círculo de invocação. Fica deitado no "chão" do palco: a perspectiva vem de um
 * `rotateX` no wrapper, então os anéis giram de verdade no plano do chão em vez
 * de ser uma elipse desenhada à mão.
 */
export default function MagicCircle({
  summoning,
  dimmed,
  width,
}: {
  /** Invocando: o círculo acende e acelera. */
  summoning: boolean
  /** As cartas foram embora: o círculo recua para brasa. */
  dimmed: boolean
  width: number
}) {
  const box = useRef<HTMLDivElement>(null)
  // O círculo inteiro vive dentro de um <svg> com drop-shadow: girar anel fora
  // da tela custa uma refiltragem por quadro sem ninguém ver.
  const onScreen = useInView(box, { margin: '120px' })
  const reduce = useReducedMotion()
  const running = onScreen && !reduce
  const runes = useMemo(() => RUNES.map((i) => ({ i, d: rune(i) })), [])
  const intensity = dimmed ? 0.35 : summoning ? 1 : 0.78
  const speed = summoning ? 0.35 : 1
  // Acender é rápido e apagar é lento: o clarão tem de chegar antes da primeira
  // carta, senão parece que ela subiu sozinha e o círculo só reagiu depois.
  const fade = summoning ? '160ms' : '700ms'

  return (
    <div
      ref={box}
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
      style={{
        width,
        height: width,
        // O rotateX não só achata: a metade próxima fica ampliada e o centro
        // visível desce. Sem compensar, o círculo nasce medido pelo centro do
        // container e aparece bem mais embaixo — batendo na base do palco.
        marginTop: -(width * 0.5 + width * PERSPECTIVE_DROP),
      }}
    >
      {/* Clarão da invocação: um pulso curto que anuncia as cartas */}
      {summoning && (
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-xl"
          style={{
            width: width * 0.8,
            height: width * 0.34,
            background: 'radial-gradient(ellipse at center, #fff6e8 0%, #e878c4 40%, transparent 70%)',
            animation: reduce ? 'none' : 'summon-flash 620ms ease-out',
          }}
        />
      )}

      {/* Poça de luz no chão, por baixo de tudo */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-2xl"
        style={{
          width: width * 1.05,
          height: width * 0.44,
          background:
            'radial-gradient(ellipse at center, #a87cf0cc 0%, #c2449d66 42%, transparent 72%)',
          opacity: intensity,
          transition: `opacity ${fade} ease`,
        }}
      />

      {/* Feixes subindo — ficam fora da perspectiva, senão deitariam junto com o chão */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full overflow-visible"
        style={{ width: width * 0.62, height: width * 0.5, opacity: summoning ? 1 : 0.35, transition: 'opacity 500ms ease' }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${10 + i * 20}%`,
              width: 2 + (i % 2) * 2,
              height: '100%',
              background: `linear-gradient(to top, ${i % 2 ? '#e878c4' : '#c9a7ff'}, transparent)`,
              filter: 'blur(1.5px)',
              transformOrigin: 'bottom center',
              animation: `beam-rise ${2.6 + i * 0.45}s ease-out ${i * 0.34}s infinite normal none ${running ? 'running' : 'paused'}`,
            }}
          />
        ))}
      </div>

      {/* O chão: tudo aqui dentro está deitado em perspectiva */}
      <div
        className="absolute inset-0"
        style={{ transform: 'perspective(620px) rotateX(66deg)', transformStyle: 'preserve-3d' }}
      >
        <svg
          viewBox="0 0 400 400"
          className="h-full w-full"
          aria-hidden
          style={{
            opacity: intensity,
            filter: `drop-shadow(0 0 ${summoning ? 14 : 6}px #a87cf0)`,
            transition: `opacity ${fade} ease, filter ${fade} ease`,
          }}
        >
          {/* Anel externo com marcações */}
          <Ring spin="cw" seconds={110 * speed} running={running}>
            <circle cx="200" cy="200" r={R.ticks} fill="none" stroke="#f2d492" strokeWidth="1" opacity="0.7" />
            <circle cx="200" cy="200" r={R.ticks - 7} fill="none" stroke="#f2d492" strokeWidth="0.6" opacity="0.4" />
            {TICKS.map((i) => {
              const a = (i / TICKS.length) * Math.PI * 2
              const long = i % 5 === 0
              const r1 = R.ticks - 7
              const r2 = R.ticks - (long ? 18 : 12)
              return (
                <line
                  key={i}
                  x1={200 + Math.cos(a) * r1}
                  y1={200 + Math.sin(a) * r1}
                  x2={200 + Math.cos(a) * r2}
                  y2={200 + Math.sin(a) * r2}
                  stroke="#f2d492"
                  strokeWidth={long ? 1.4 : 0.7}
                  opacity={long ? 0.8 : 0.45}
                />
              )
            })}
          </Ring>

          {/* Faixa de runas, girando ao contrário */}
          <Ring spin="ccw" seconds={74 * speed} running={running}>
            <circle cx="200" cy="200" r={R.runes + 14} fill="none" stroke="#cbb0ff" strokeWidth="0.7" opacity="0.45" />
            <circle cx="200" cy="200" r={R.runes - 14} fill="none" stroke="#cbb0ff" strokeWidth="0.7" opacity="0.45" />
            {runes.map(({ i, d }) => (
              <g key={i} transform={`rotate(${(i / RUNES.length) * 360} 200 200) translate(200 ${200 - R.runes})`}>
                <path d={d} stroke="#e4d4ff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85" />
              </g>
            ))}
          </Ring>

          {/* Heptagrama */}
          <Ring spin="cw" seconds={52 * speed} running={running}>
            <circle cx="200" cy="200" r={R.band} fill="none" stroke="#e878c4" strokeWidth="1.1" opacity="0.6" />
            <path d={starPath(7, 3, R.star)} fill="none" stroke="#e878c4" strokeWidth="1.3" opacity="0.75" />
            {NODES.map((i) => {
              const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2
              return (
                <circle
                  key={i}
                  cx={200 + Math.cos(a) * R.star}
                  cy={200 + Math.sin(a) * R.star}
                  r="4.5"
                  fill="#f2d492"
                  opacity="0.9"
                />
              )
            })}
          </Ring>

          {/* Núcleo */}
          <Ring spin="ccw" seconds={38 * speed} running={running}>
            <circle cx="200" cy="200" r={R.core} fill="none" stroke="#f2d492" strokeWidth="1.2" opacity="0.7" />
            <path
              d="M200 142 L208 192 L258 200 L208 208 L200 258 L192 208 L142 200 L192 192 Z"
              fill="#f2d492"
              opacity="0.55"
            />
          </Ring>
        </svg>
      </div>

      {/* Faíscas soltas subindo da borda */}
      <div aria-hidden className="absolute inset-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${8 + noise(i * 5.1) * 84}%`,
              top: `${44 + noise(i * 3.3) * 14}%`,
              width: 2 + noise(i * 7.7) * 3,
              height: 2 + noise(i * 7.7) * 3,
              background: i % 3 === 0 ? '#f2d492' : '#e4d4ff',
              boxShadow: '0 0 8px currentColor',
              color: i % 3 === 0 ? '#f2d492' : '#e4d4ff',
              opacity: summoning ? 1 : 0.5,
              animation: `mote-rise ${3.4 + noise(i * 2.2) * 2.6}s ease-out ${noise(i * 1.7) * 3}s infinite normal none ${running ? 'running' : 'paused'}`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
