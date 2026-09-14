import { motion } from 'framer-motion'
import { useState } from 'react'
import { site } from '../data/site'
import CardBackArt from './CardBackArt'
import SocialLinks from './SocialLinks'
import SmokeCloud from './SmokeCloud'
import { useSmokeField } from '../lib/useSmokeField'
import { portraitMask } from '../lib/portrait'

const PORTRAIT_SHADOW = 'drop-shadow(0 22px 40px rgba(0,0,0,.55))'
/**
 * O halo roxo acompanha a silhueta do PNG porque drop-shadow trabalha sobre o
 * canal alfa — um box-shadow desenharia o retângulo da imagem. Dois raios: um
 * curto que marca o contorno e um largo que vaza para a nebulosa.
 */
const PORTRAIT_GLOW = [
  PORTRAIT_SHADOW,
  'drop-shadow(0 0 13px rgba(168,124,240,.9))',
  'drop-shadow(0 0 38px rgba(123,79,224,.65))',
].join(' ')

/** Cartas decorativas flutuando atrás do título, fora da área do retrato. */
const FLOATERS = [
  { left: '5%', top: '26%', rot: -18, delay: 0, dur: 9, size: 0.85 },
  { left: '14%', top: '64%', rot: 9, delay: 0.7, dur: 10, size: 0.55 },
  { left: '82%', top: '54%', rot: 14, delay: 1.4, dur: 11, size: 0.7 },
  { left: '90%', top: '78%', rot: -12, delay: 2.1, dur: 12, size: 0.6 },
]

function FloatingCard({ left, top, rot, delay, dur, size }: (typeof FLOATERS)[number]) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute hidden lg:block"
      style={{ left, top, width: 150 * size, height: 240 * size }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 0.5, y: [0, -18, 0], rotate: [rot, rot + 4, rot] }}
      transition={{
        opacity: { duration: 1.2, delay: delay * 0.3 },
        y: { duration: dur, repeat: Infinity, ease: 'easeInOut', delay },
        rotate: { duration: dur * 1.3, repeat: Infinity, ease: 'easeInOut', delay },
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-xl border border-gold/25"
        style={{
          background: 'linear-gradient(158deg, #2a1668, #170b42 45%, #0d0526)',
          boxShadow: '0 24px 60px -20px #000',
        }}
      >
        <div className="absolute inset-[5px] rounded-lg border border-gold/20" />
        <CardBackArt className="absolute inset-0 m-auto h-[75%] w-[75%] text-gold/80" />
      </div>
    </motion.div>
  )
}

export default function Hero() {
  // Some se o arquivo não estiver configurado, ou se estiver configurado e faltar.
  const [hasAvatar, setHasAvatar] = useState(Boolean(site.avatar))
  const [glow, setGlow] = useState(false)
  const { ref: smokeRef, field: smokeField, onPointerMove, onPointerLeave, setActive: setSmokeActive } = useSmokeField()

  return (
    <header
      className="relative flex min-h-[92vh] flex-col overflow-hidden"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {FLOATERS.map((f, i) => (
        <FloatingCard key={i} {...f} />
      ))}

      {/* ----------------- faixa do topo: redes | ilustração ----------------- */}
      <div className="relative z-20 flex w-full items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-1 shrink-0"
        >
          <SocialLinks />
        </motion.div>

        {hasAvatar && (
          <motion.div
            className="relative -mr-5 w-[min(68vw,540px)] shrink-0 sm:-mr-9"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: [0, -9, 0] }}
            transition={{
              opacity: { duration: 1, ease: [0.2, 0.8, 0.2, 1] },
              y: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
            }}
          >
            <div className="relative" ref={smokeRef}>
              <div className="absolute inset-0 z-0">
                <SmokeCloud field={smokeField} />
              </div>

              <picture>
                <source srcSet={site.avatarWebp} type="image/webp" />
                <img
                  src={site.avatar}
                  alt={site.avatarAlt}
                  onError={() => setHasAvatar(false)}
                  className="relative z-10 block w-full select-none transition-[filter] duration-500 ease-out"
                  style={{ ...portraitMask, filter: glow ? PORTRAIT_GLOW : PORTRAIT_SHADOW }}
                />
              </picture>

              <div className="absolute inset-0 z-20">
                <SmokeCloud field={smokeField} front />
              </div>

              {/* A ilustração inteira é o link. Fica por cima da fumaça (que é
                  pointer-events-none) só para capturar o clique — é transparente. */}
              <a
                href={site.facePage.href}
                aria-label={site.facePage.label}
                onPointerEnter={() => setGlow(true)}
                onPointerLeave={() => setGlow(false)}
                onFocus={() => {
                  setGlow(true)
                  setSmokeActive(true)
                }}
                onBlur={() => {
                  setGlow(false)
                  setSmokeActive(false)
                }}
                className="group/face absolute inset-0 z-30 block cursor-pointer rounded-2xl outline-none ring-gold/60 focus-visible:ring-2"
              >
                <span className="pointer-events-none absolute left-[42%] top-[50%] -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/40 bg-void/80 px-3 py-1 text-[11px] tracking-wide text-gold opacity-0 backdrop-blur transition duration-300 group-hover/face:opacity-100 group-focus-visible/face:opacity-100">
                  {site.facePage.label} →
                </span>
              </a>
            </div>
          </motion.div>
        )}
      </div>

      {/* --------------------------- conteúdo central --------------------------- */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-24 pt-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[11px] uppercase tracking-[0.46em] text-lilac/85"
          >
            {site.eyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2 }}
            className="text-nebula mt-5 whitespace-pre-line text-[2.6rem] leading-[1.08] sm:text-6xl"
          >
            {site.headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.34 }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-mist"
          >
            {site.subline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.46 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <a
              href="#planos"
              className="group relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-medium tracking-wide text-star transition"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 12px 40px -12px #c2449d, inset 0 1px 0 #ffffff40',
              }}
            >
              <span className="relative z-10">Ver as consultas</span>
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: 'linear-gradient(100deg, #8b5cf6, #e878c4)' }}
              />
            </a>

            <a
              href="#tabela"
              className="rounded-full border border-white/20 px-7 py-3.5 text-sm tracking-wide text-mist transition hover:border-gold/50 hover:text-star"
            >
              Tabela de preços
            </a>
          </motion.div>
        </div>
      </div>

      {/* Indicador de rolagem */}
      <motion.div
        aria-hidden
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.25, 0.85, 0.25], y: [0, 9, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <svg width="22" height="34" viewBox="0 0 22 34" fill="none">
          <rect x="1" y="1" width="20" height="32" rx="10" stroke="#cbbde8" strokeOpacity="0.5" />
          <circle cx="11" cy="10" r="2.5" fill="#cbbde8" />
        </svg>
      </motion.div>
    </header>
  )
}
