import { motion } from 'framer-motion'
import { noise } from '../lib/fan'

/** Estouro de partículas mágicas — dispara quando a carta chega ao centro. */
export default function Sparkles({ count = 18, accent }: { count?: number; accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + noise(i) * 0.6
        const dist = 130 + noise(i + 31) * 190
        const size = 3 + noise(i + 57) * 6
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: i % 3 === 0 ? '#f2d492' : i % 3 === 1 ? accent : '#ffffff',
              boxShadow: `0 0 ${size * 3}px ${i % 3 === 0 ? '#f2d492' : accent}`,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
            animate={{
              x: Math.cos(a) * dist,
              y: Math.sin(a) * dist,
              opacity: [0, 1, 0],
              scale: [0.2, 1, 0.3],
            }}
            transition={{ duration: 0.9 + noise(i + 11) * 0.5, ease: 'easeOut', delay: noise(i + 3) * 0.12 }}
          />
        )
      })}
    </div>
  )
}
