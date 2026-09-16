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
  luz = true,
  leve = false,
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
  /**
   * Vela acesa mas SEM luz de ponto própria. A chama é `meshBasicMaterial`,
   * então ela continua brilhando de graça; o que sai é a contribuição desta
   * vela no loop de luzes do shader, que todo material da sala paga por
   * pixel. É assim que o modo leve corta um terço do miolo do shader sem
   * apagar nenhuma vela da mesa.
   */
  luz?: boolean
  /**
   * Menos gomos nas geometrias — a 2,85 de distância ninguém conta as
   * arestas — e a vela fora do passe de profundidade.
   */
  leve?: boolean
}) {
  const chama = useRef<THREE.Mesh>(null)
  const luzRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Duas senoides de períodos incomensuráveis: o tremor nunca se repete à vista.
    const tremor = Math.sin(t * 9.3 + semente) * 0.5 + Math.sin(t * 15.7 + semente * 2.1) * 0.5
    if (chama.current) {
      chama.current.scale.set(1 + tremor * 0.08, 1 + tremor * 0.16, 1 + tremor * 0.08)
      chama.current.position.x = Math.sin(t * 4.1 + semente) * 0.004
    }
    // No leve as velas acesas são menos, então cada uma carrega um pouco mais
    // de luz — senão o pano escureceria junto com a economia.
    if (luzRef.current) luzRef.current.intensity = (leve ? 1.8 : 1.25) + tremor * 0.3
  })

  const [x, y, z] = posicao

  return (
    <group position={[x, y, z]}>
      {/* Corpo da vela. No leve o `castShadow` SAI: lá a única sombra da cena
          é a da luz direcional, e o que a vela projetaria nela é uma mancha
          rastejando pelo pano enquanto o anel gira — justamente o movimento
          que o modo promete tirar. No completo ele fica, porque é ele que dá
          o tremor no pé da mesa nos mapas cúbicos das velas 0 e 3. */}
      <mesh position={[0, altura / 2, 0]} castShadow={!leve}>
        <cylinderGeometry args={[0.035, 0.04, altura, leve ? 10 : 16]} />
        <meshStandardMaterial color="#f3e6d2" roughness={0.75} />
      </mesh>

      {/* Cera escorrida no topo */}
      <mesh position={[0, altura, 0]}>
        <sphereGeometry args={[0.036, leve ? 8 : 14, leve ? 6 : 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fff3e0" roughness={0.6} />
      </mesh>

      {/* Pavio */}
      <mesh position={[0, altura + 0.014, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.028, leve ? 4 : 6]} />
        <meshStandardMaterial color="#2a1a12" roughness={1} />
      </mesh>

      {/* Chama: emissiva e sem luz própria, para não custar duas fontes */}
      <mesh ref={chama} position={[0, altura + 0.055, 0]}>
        <sphereGeometry args={[0.022, leve ? 8 : 14, leve ? 8 : 14]} />
        <meshBasicMaterial color="#ffd49a" transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, altura + 0.066, 0]}>
        <sphereGeometry args={[0.038, leve ? 8 : 12, leve ? 8 : 12]} />
        <meshBasicMaterial color="#ff9d4a" transparent opacity={0.28} />
      </mesh>

      {luz && (
        <pointLight
          ref={luzRef}
          position={[0, altura + 0.08, 0]}
          color="#ffb765"
          intensity={leve ? 1.8 : 1.25}
          // Alcance maior no leve para cobrir o vão das velas que ficaram sem
          // luz. Isto NÃO custa shader: o corte por distância é aritmético
          // dentro do loop, não um desvio que pule a conta.
          distance={leve ? 4.2 : 3.6}
          decay={2}
          castShadow={sombra}
          shadow-mapSize={[512, 512]}
        />
      )}
    </group>
  )
}
