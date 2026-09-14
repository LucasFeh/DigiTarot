import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Vela from './Vela'
import CartaMesa, { CARTA_H, CARTA_W } from './CartaMesa'
import { PANO_BY_ID, PANOS, panoDataUri } from '../../data/panos'
import { SPREAD_BY_ID } from '../../data/spreads'
import type { CartaNaMesa } from '../../lib/backend'

/** Altura do tampo. Tudo que fica sobre a mesa parte daqui. */
const TAMPO = 0.76

function Mesa({ panoId }: { panoId: string }) {
  const pano = PANO_BY_ID.get(panoId) ?? PANOS[0]

  const textura = useMemo(() => {
    const t = new THREE.TextureLoader().load(panoDataUri(pano))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [pano])

  return (
    <group>
      {/* Tampo */}
      <mesh position={[0, TAMPO - 0.03, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.85, 1.85, 0.06, 64]} />
        <meshStandardMaterial color="#3a2415" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Borda torneada */}
      <mesh position={[0, TAMPO - 0.03, 0]}>
        <torusGeometry args={[1.85, 0.035, 12, 64]} />
        <meshStandardMaterial color="#4a2f1c" roughness={0.6} />
      </mesh>

      {/* O pano, logo acima do tampo */}
      <mesh position={[0, TAMPO + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.58, 64]} />
        <meshStandardMaterial map={textura} roughness={0.92} />
      </mesh>

      {/* Pé central e base */}
      <mesh position={[0, TAMPO / 2 - 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, TAMPO - 0.1, 24]} />
        <meshStandardMaterial color="#3a2415" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.62, 0.7, 0.06, 32]} />
        <meshStandardMaterial color="#32200f" roughness={0.85} />
      </mesh>

      {/* Chão da sala */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#160a24" roughness={1} />
      </mesh>
    </group>
  )
}

/** Marca de um slot vazio do layout. */
function Slot({
  x,
  z,
  rot = 0,
  ativo,
  onClick,
}: {
  x: number
  z: number
  rot?: number
  ativo: boolean
  onClick?: () => void
}) {
  return (
    <group position={[x, TAMPO + 0.004, z]} rotation={[-Math.PI / 2, 0, (rot * Math.PI) / 180]}>
      {/* Área clicável, quase invisível */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
      >
        <planeGeometry args={[CARTA_W + 0.04, CARTA_H + 0.04]} />
        <meshBasicMaterial
          color={ativo ? '#f2d492' : '#c9a7ff'}
          transparent
          opacity={ativo ? 0.22 : 0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Contorno: é ele que faz o lugar vago ser visto sobre o pano escuro */}
      <lineSegments raycast={() => null}>
        <edgesGeometry args={[new THREE.PlaneGeometry(CARTA_W + 0.04, CARTA_H + 0.04)]} />
        <lineBasicMaterial color={ativo ? '#f2d492' : '#cbb0ff'} transparent opacity={ativo ? 1 : 0.55} />
      </lineSegments>
    </group>
  )
}

export type Sala3DProps = {
  spreadId: string
  panoId: string
  cartas: CartaNaMesa[]
  /** Tarólogo vê os slots e pode clicar neles. */
  editavel: boolean
  slotAtivo: number | null
  onSlot?: (slot: number) => void
  onCarta?: (slot: number) => void
  onHoverCarta?: (slot: number | null) => void
  /** Primeira posição do popup, vinda do próprio evento de hover. */
  onPonteiro?: (p: { x: number; y: number }) => void
}

export default function Sala3D({
  spreadId,
  panoId,
  cartas,
  editavel,
  slotAtivo,
  onSlot,
  onCarta,
  onHoverCarta,
  onPonteiro,
}: Sala3DProps) {
  const spread = SPREAD_BY_ID.get(spreadId) ?? SPREAD_BY_ID.get('tres')!
  const porSlot = useMemo(() => new Map(cartas.map((c) => [c.slot, c])), [cartas])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2.75, 3.35], fov: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0d0620']} />
      <fog attach="fog" args={['#0d0620', 4.5, 11]} />

      <Suspense fallback={null}>
        {/* Luz ambiente baixa: quem ilumina de verdade são as velas */}
        <ambientLight intensity={0.42} color="#7d6ac4" />
        <directionalLight position={[2, 4, 3]} intensity={0.5} color="#c3b2ff" />
        {/* Luz quente de cima da mesa: é ela que deixa as cartas legíveis */}
        <pointLight position={[0, 2.1, 0.4]} intensity={7} distance={5} decay={2} color="#ffd9a8" />

        <Mesa panoId={panoId} />

        <Vela posicao={[-1.28, TAMPO, 0.62]} altura={0.3} semente={0} />
        <Vela posicao={[1.28, TAMPO, 0.62]} altura={0.24} semente={2.4} />
        <Vela posicao={[-1.05, TAMPO, -0.92]} altura={0.2} semente={4.1} />
        <Vela posicao={[1.05, TAMPO, -0.92]} altura={0.27} semente={5.8} />

        {/* Slots do layout: só o tarólogo os enxerga */}
        {editavel &&
          spread.slots.map((s, i) =>
            porSlot.has(i) ? null : (
              <Slot key={i} x={s.x} z={s.z} rot={s.rot} ativo={slotAtivo === i} onClick={() => onSlot?.(i)} />
            ),
          )}

        {/* Cartas na mesa */}
        {spread.slots.map((s, i) => {
          const c = porSlot.get(i)
          if (!c) return null
          return (
            <CartaMesa
              key={`${i}-${c.cardId}`}
              cardId={c.cardId}
              posicao={[s.x, TAMPO + 0.012, s.z]}
              giro={s.rot ?? 0}
              invertida={c.invertida}
              revelada={c.revelada}
              selecionada={editavel && slotAtivo === i}
              onPointerOver={(e) => {
                onPonteiro?.({ x: e.clientX, y: e.clientY })
                onHoverCarta?.(i)
              }}
              onPointerOut={() => onHoverCarta?.(null)}
              onClick={() => onCarta?.(i)}
            />
          )
        })}

        <OrbitControls
          target={[0, TAMPO, 0]}
          enablePan={false}
          minDistance={2.1}
          maxDistance={5.4}
          // Trava abaixo da horizontal: por baixo da mesa não há nada para ver.
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2 - 0.12}
          enableDamping
          dampingFactor={0.08}
        />
      </Suspense>
    </Canvas>
  )
}
