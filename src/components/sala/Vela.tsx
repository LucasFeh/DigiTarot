import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Vela com chama e luz que tremem. A luz é `pointLight` de verdade, então ela
 * ilumina o pano e as cartas — é o que dá o clima da sala.
 */
export default function Vela({
  posicao,
  altura = 0.26,
  semente = 0,
  sombra = false,
}: {
  posicao: [number, number, number]
  altura?: number
  semente?: number
  /**
   * Luz de ponto com sombra é um mapa CÚBICO: seis passes de renderização por
   * vela, por quadro. Com várias velas em cena isso domina o custo, então só
   * um par delas projeta sombra — o resto ilumina sem projetar, e a diferença
   * é quase invisível num ambiente já escuro.
   */
  sombra?: boolean
}) {
  const chama = useRef<THREE.Mesh>(null)
  const luz = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Duas senoides de períodos incomensuráveis: o tremor nunca se repete à vista.
    const tremor = Math.sin(t * 9.3 + semente) * 0.5 + Math.sin(t * 15.7 + semente * 2.1) * 0.5
    if (chama.current) {
      chama.current.scale.set(1 + tremor * 0.08, 1 + tremor * 0.16, 1 + tremor * 0.08)
      chama.current.position.x = Math.sin(t * 4.1 + semente) * 0.004
    }
    if (luz.current) luz.current.intensity = 1.25 + tremor * 0.3
  })

  const [x, y, z] = posicao

  return (
    <group position={[x, y, z]}>
      {/* Corpo da vela */}
      <mesh position={[0, altura / 2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, altura, 16]} />
        <meshStandardMaterial color="#f3e6d2" roughness={0.75} />
      </mesh>

      {/* Cera escorrida no topo */}
      <mesh position={[0, altura, 0]}>
        <sphereGeometry args={[0.036, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fff3e0" roughness={0.6} />
      </mesh>

      {/* Pavio */}
      <mesh position={[0, altura + 0.014, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.028, 6]} />
        <meshStandardMaterial color="#2a1a12" roughness={1} />
      </mesh>

      {/* Chama: emissiva e sem luz própria, para não custar duas fontes */}
      <mesh ref={chama} position={[0, altura + 0.055, 0]}>
        <sphereGeometry args={[0.022, 14, 14]} />
        <meshBasicMaterial color="#ffd49a" transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, altura + 0.066, 0]}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshBasicMaterial color="#ff9d4a" transparent opacity={0.28} />
      </mesh>

      <pointLight
        ref={luz}
        position={[0, altura + 0.08, 0]}
        color="#ffb765"
        intensity={1.25}
        distance={3.6}
        decay={2}
        castShadow={sombra}
        shadow-mapSize={[512, 512]}
      />
    </group>
  )
}
