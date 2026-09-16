import { useEffect, useState } from 'react'

/**
 * O convite para virar o celular, sobre a mesa em pé.
 *
 * A cena 3D é larga: um leque de dez cartas numa tela de 390px em retrato vira
 * um amontoado, e a pessoa nem sabe que existe uma posição melhor. Deitar o
 * aparelho resolve, e é o tipo de coisa que ninguém tenta sozinho.
 *
 * É dica, não barreira: dá para dispensar e seguir em pé. Travar a mesa até o
 * aparelho girar puniria quem está num tablet preso a um suporte, ou com a
 * rotação bloqueada no sistema — e quem está deitado na cama, onde girar a tela
 * não gira o que os olhos veem.
 */
export default function DicaGirar() {
  const [mostrar, setMostrar] = useState(false)
  const [dispensado, setDispensado] = useState(false)

  useEffect(() => {
    // Toque grosso + tela estreita + em pé. As três condições juntas, porque
    // cada uma sozinha erra: um monitor estreito não é um celular, e um tablet
    // deitado já está na posição certa.
    const conferir = () => {
      const toque = window.matchMedia('(pointer: coarse)').matches
      const estreita = window.innerWidth < 820
      const emPe = window.innerHeight > window.innerWidth
      setMostrar(toque && estreita && emPe)
    }
    conferir()
    window.addEventListener('resize', conferir)
    window.addEventListener('orientationchange', conferir)
    return () => {
      window.removeEventListener('resize', conferir)
      window.removeEventListener('orientationchange', conferir)
    }
  }, [])

  if (!mostrar || dispensado) return null

  return (
    <div
      role="status"
      className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center px-8 text-center"
      style={{ background: 'rgba(5, 1, 15, 0.82)', backdropFilter: 'blur(6px)' }}
    >
      <div className="flex flex-col items-center gap-5">
        <span aria-hidden className="text-[64px] leading-none" style={{ animation: 'girar 2.4s ease-in-out infinite' }}>
          📱
        </span>

        <div>
          <p className="font-display text-[20px] text-star">Gire o telefone</p>
          <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-mist">
            Na horizontal a mesa cabe inteira na tela, e as cartas ficam do tamanho de cartas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDispensado(true)}
          className="rounded-full border border-white/25 px-6 py-2.5 text-[15px] text-mist transition hover:border-gold/60 hover:text-star"
        >
          Continuar assim mesmo
        </button>
      </div>

      {/* A animação vive aqui porque só esta tela a usa — no CSS global ela
          seria mais uma regra que ninguém sabe de onde veio. */}
      <style>{`
        @keyframes girar {
          0%, 45%   { transform: rotate(0deg); }
          60%, 100% { transform: rotate(90deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="girar"] { animation: none !important; transform: rotate(90deg); }
        }
      `}</style>
    </div>
  )
}
