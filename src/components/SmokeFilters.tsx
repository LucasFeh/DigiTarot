/** Filters shared by the smoke on the home and about pages. Keeping these
 * definitions separate avoids loading the animation library on every route. */
const FILTERS = [
  { id: 'smoke-f1', freq: 0.05, soften: 3.2, displace: 34 },
  { id: 'smoke-f2', freq: 0.036, soften: 4, displace: 42 },
  { id: 'smoke-f3', freq: 0.066, soften: 2.6, displace: 28 },
  { id: 'smoke-f4', freq: 0.028, soften: 4.8, displace: 48 },
  { id: 'smoke-f5', freq: 0.044, soften: 3.6, displace: 38 },
  { id: 'smoke-f6', freq: 0.058, soften: 2.9, displace: 31 },
]

export default function SmokeFilters() {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden>
      <defs>
        {FILTERS.map((f, i) => (
          <filter
            key={f.id}
            id={f.id}
            x="-90%"
            y="-90%"
            width="280%"
            height="280%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={f.freq}
              numOctaves={3}
              seed={7 + i * 13}
              result="noise"
            />
            <feGaussianBlur in="SourceGraphic" stdDeviation={f.soften} result="soft" />
            <feDisplacementMap
              in="soft"
              in2="noise"
              scale={f.displace}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  )
}
