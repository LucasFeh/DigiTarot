import Starfield from './Starfield'
import { useMobileLayout } from '../lib/useMobileLayout'

/**
 * Fundo fixo do site: nuvens de nebulosa em gradientes radiais sobrepostos,
 * campo de estrelas em canvas e um grão sutil por cima — reproduzindo a
 * textura de referência (preto-espaço, azul-violeta, roxo e magenta).
 */
export default function NebulaBackdrop() {
  const mobile = useMobileLayout()
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      {/* Nuvem azul-violeta — canto superior esquerdo */}
      <div
        className="nebula-cloud absolute -left-[15%] -top-[20%] h-[85vh] w-[75vw] rounded-full blur-[90px] opacity-55"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #4b2fd0 0%, #2c1a8a 35%, #150a4d 60%, transparent 76%)',
          animation: 'drift 34s ease-in-out infinite',
        }}
      />

      {/* Nuvem magenta — lateral direita */}
      <div
        className="nebula-cloud absolute -right-[18%] top-[6%] h-[80vh] w-[70vw] rounded-full blur-[100px] opacity-50"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #d8479f 0%, #8f2f90 38%, #3d1263 64%, transparent 78%)',
          animation: 'drift 41s ease-in-out infinite reverse',
        }}
      />

      {/* Núcleo roxo central, mais denso */}
      <div
        className="nebula-cloud absolute left-[28%] top-[38%] h-[70vh] w-[60vw] rounded-full blur-[110px] opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #7b4fd6 0%, #3a1f96 42%, transparent 72%)',
          animation: 'drift 52s ease-in-out infinite',
        }}
      />

      {/* Brilho azul frio — base */}
      <div
        className="nebula-cloud absolute -bottom-[25%] left-[5%] h-[70vh] w-[80vw] rounded-full blur-[120px] opacity-38"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #3352d8 0%, #1b1160 45%, transparent 74%)',
          animation: 'drift 46s ease-in-out infinite reverse',
        }}
      />

      {/* Estrelas */}
      {!mobile && <div className="absolute inset-0"><Starfield /></div>}

      {/* Vinheta: escurece as bordas como no céu profundo da textura */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 110% 80% at 50% 42%, transparent 18%, #05010f99 55%, #05010fe6 80%, #05010f 100%)',
        }}
      />

      {/* Grão fino para tirar o aspecto "liso" dos gradientes */}
      {!mobile && <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />}
    </div>
  )
}
