import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CARTA_H, CARTA_W } from '../sala/CartaMesa'
import { cartaEm, estadoDaCarta, totalDoDesfile } from '../../lib/temas/coreografia'
import { useTexturaCarta, useTexturaVerso } from '../../lib/temas/useTema'
import type { TemaBaralho } from '../../lib/temas/tipos'

const PAPEL = '#e8dcc0'

/** Uma carta do desfile. Lê a coreografia por quadro e aplica. */
function CartaDesfile({
  cardId,
  indice,
  tema,
  verso,
  relogio,
}: {
  cardId: string
  indice: number
  tema: TemaBaralho | null
  verso: THREE.Texture | null
  relogio: { t: number }
}) {
  const grupo = useRef<THREE.Group>(null)
  const luz = useRef<THREE.PointLight>(null)
  const frente = useTexturaCarta(cardId, tema)
  const mats = useRef<THREE.MeshStandardMaterial[]>([])

  // `map` de null para textura não recompila o shader sozinho — ver o comentário
  // longo em CartaMesa.tsx. Sem isto o desfile inteiro sai em papel creme.
  useEffect(() => {
    if (mats.current[5]) mats.current[5].needsUpdate = true
  }, [frente])
  useEffect(() => {
    if (mats.current[4]) mats.current[4].needsUpdate = true
  }, [verso])

  useFrame(() => {
    const g = grupo.current
    if (!g) return
    const e = estadoDaCarta(relogio.t, indice)
    if (!e) {
      g.visible = false
      return
    }
    g.visible = true
    g.position.set(e.pos[0], e.pos[1], e.pos[2])
    g.rotation.x = e.giroX
    g.scale.setScalar(e.escala)
    for (const m of mats.current) {
      if (!m) continue
      m.opacity = e.opacidade
      m.transparent = e.opacidade < 0.999
    }
    if (luz.current) {
      // O clarão da virada: some sozinho, e é o "efeito de magia" barato que
      // não custa nem partícula nem shader.
      luz.current.intensity = e.magia * 6
      luz.current.position.set(e.pos[0], e.pos[1] + 0.1, e.pos[2] + 0.45)
    }
  })

  return (
    <group ref={grupo}>
      <mesh castShadow>
        <boxGeometry args={[CARTA_W * 2.4, CARTA_H * 2.4, 0.014]} />
        {/* Ordem das faces: +x, -x, +y, -y, +z, -z. Em pé, a face +z olha para
            a câmera — então ela leva o VERSO, e a virada de π traz a frente. */}
        {[0, 1, 2, 3].map((i) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            ref={(m: THREE.MeshStandardMaterial) => {
              if (m) mats.current[i] = m
            }}
            color={PAPEL}
            roughness={0.8}
          />
        ))}
        <meshStandardMaterial
          attach="material-4"
          ref={(m: THREE.MeshStandardMaterial) => {
            if (m) mats.current[4] = m
          }}
          map={verso}
          color={verso ? '#ffffff' : PAPEL}
          roughness={0.6}
        />
        <meshStandardMaterial
          attach="material-5"
          ref={(m: THREE.MeshStandardMaterial) => {
            if (m) mats.current[5] = m
          }}
          map={frente}
          color={frente ? '#ffffff' : PAPEL}
          roughness={0.6}
        />
      </mesh>
      <pointLight ref={luz} color="#c9a7ff" distance={2.6} decay={2} intensity={0} />
    </group>
  )
}

function Palco({
  cartas,
  tema,
  relogio,
  indice,
}: {
  cartas: string[]
  tema: TemaBaralho | null
  relogio: { t: number }
  /** Carta no centro da cena. Vem do PAI, que re-renderiza a cada troca. */
  indice: number
}) {
  const verso = useTexturaVerso(tema)
  // Só as vizinhas imediatas entram na árvore: montar 78 grupos de uma vez
  // seguraria 78 texturas vivas e estouraria o teto do registro.
  //
  // A dependência é `indice`, e NÃO `relogio.t`: o relógio é um objeto mutável
  // que anda dentro do useFrame, e ler a propriedade dele aqui daria um valor
  // congelado no último render — o memo pareceria funcionar por acidente.
  const vizinhas = useMemo(
    () => cartas.map((c, i) => ({ c, i })).filter(({ i }) => Math.abs(i - indice) <= 1),
    [cartas, indice],
  )

  return (
    <>
      <ambientLight intensity={0.55} color="#8f7ad0" />
      <directionalLight position={[1.5, 2.5, 3]} intensity={1.1} color="#e8dcff" />
      <pointLight position={[0, 0.4, 2.2]} intensity={5} distance={7} decay={2} color="#ffd9a8" />
      {vizinhas.map(({ c, i }) => (
        <CartaDesfile key={`${i}-${c}`} cardId={c} indice={i} tema={tema} verso={verso} relogio={relogio} />
      ))}
    </>
  )
}

/** Avança o relógio e avisa o pai quando a carta em cena muda. */
function Relogio({
  relogio,
  rodando,
  total,
  onCarta,
  onFim,
}: {
  relogio: { t: number }
  rodando: boolean
  total: number
  onCarta: (i: number) => void
  onFim: () => void
}) {
  const ultima = useRef(-1)
  useFrame((_, dt) => {
    if (rodando) relogio.t = Math.min(total, relogio.t + dt)
    const i = cartaEm(relogio.t)
    if (i !== ultima.current) {
      ultima.current = i
      onCarta(i)
    }
    if (rodando && relogio.t >= total) onFim()
  })
  return null
}

export default function DesfileCartas({
  cartas,
  tema,
  relogio,
  rodando,
  indice,
  onCarta,
  onFim,
}: {
  cartas: string[]
  tema: TemaBaralho | null
  /** Relógio compartilhado com a página: ela arrasta a barra, a cena anda. */
  relogio: { t: number }
  rodando: boolean
  indice: number
  onCarta: (i: number) => void
  onFim: () => void
}) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.1, 2.9], fov: 42 }} gl={{ antialias: true }}>
      <color attach="background" args={['#0b0520']} />
      <fog attach="fog" args={['#0b0520', 3.4, 7]} />
      <Palco cartas={cartas} tema={tema} relogio={relogio} indice={indice} />
      <Relogio
        relogio={relogio}
        rodando={rodando}
        total={totalDoDesfile(cartas.length)}
        // `cartaEm` não tem teto e a linha do tempo passa de n*PASSO no fim
        // (DUR > PASSO): sem aparar, o contador terminava em "79/78".
        onCarta={(i) => onCarta(Math.min(cartas.length - 1, i))}
        onFim={onFim}
      />
    </Canvas>
  )
}
