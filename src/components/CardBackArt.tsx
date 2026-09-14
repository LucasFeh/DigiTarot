/** Ornamento do verso da carta: sol/estrela dourado com raios, estilo baralho clássico. */
export default function CardBackArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="none">
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
      <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 16
        const long = i % 2 === 0
        const r1 = 30
        const r2 = long ? 42 : 36
        return (
          <line
            key={i}
            x1={50 + Math.cos(a) * r1}
            y1={50 + Math.sin(a) * r1}
            x2={50 + Math.cos(a) * r2}
            y2={50 + Math.sin(a) * r2}
            stroke="currentColor"
            strokeWidth={long ? 0.9 : 0.5}
            opacity={long ? 0.6 : 0.35}
          />
        )
      })}
      {/* Estrela de oito pontas no centro */}
      <path
        d="M50 28 L54 46 L72 50 L54 54 L50 72 L46 54 L28 50 L46 46 Z"
        fill="currentColor"
        opacity="0.75"
      />
      <path
        d="M50 38 L52 48 L62 50 L52 52 L50 62 L48 52 L38 50 L48 48 Z"
        fill="currentColor"
        opacity="0.35"
      />
      {/* Crescente discreto */}
      <path d="M50 14 a6 6 0 1 0 0.01 0 a4.5 4.5 0 1 1 -0.01 0" fill="currentColor" opacity="0.5" />
      <path d="M50 86 a6 6 0 1 0 0.01 0 a4.5 4.5 0 1 1 -0.01 0" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
