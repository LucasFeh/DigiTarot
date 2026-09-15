import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexturaCarta } from '../../lib/temas/useTema'
import type { TemaBaralho } from '../../lib/temas/tipos'

export const CARTA_W = 0.4
export const CARTA_H = 0.68

/** Creme do papel: é o que aparece enquanto a textura não subiu. Nunca branco
 *  puro — branco puro numa mesa escura lê como erro de carregamento. */
const PAPEL = '#e8dcc0'

export default function CartaMesa({
  cardId,
  tema,
  verso,
  posicao,
  giro = 0,
  invertida = false,
  revelada,
  selecionada,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  cardId: string
  /** Tema já carregado, ou null para a arte desenhada. */
  tema: TemaBaralho | null
  /** Verso compartilhado, emprestado uma vez pela cena — não por carta. */
  verso: THREE.Texture | null
  posicao: [number, number, number]
  giro?: number
  invertida?: boolean
  revelada: boolean
  selecionada?: boolean
  onPointerOver?: (e: { clientX: number; clientY: number }) => void
  onPointerOut?: () => void
  onClick?: () => void
}) {
  const grupo = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  const matFrente = useRef<THREE.MeshStandardMaterial>(null)
  const matVerso = useRef<THREE.MeshStandardMaterial>(null)

  // A frente é por carta; o verso vem de cima, porque é o MESMO para todas —
  // era aqui que dez cartas na Cruz Celta criavam dez texturas idênticas.
  const frente = useTexturaCarta(cardId, tema)

  /**
   * As texturas chegam DEPOIS do primeiro render, então `map` vai de `null`
   * para textura — e isso, sozinho, não faz nada aparecer.
   *
   * `USE_MAP` é um #define do programa GLSL. O three só recompila quando
   * `material.version` muda (no WebGLRenderer, `needsProgramChange` só vira
   * true no ramo `material.version !== materialProperties.__version`), e
   * `version` só sobe pelo setter `needsUpdate`. O react-three-fiber não o
   * marca sozinho — o único `needsUpdate = true` dele é para o shadowMap.
   * Sem estas duas linhas, TODA carta com arte fica no creme do papel.
   */
  useEffect(() => {
    if (matFrente.current) matFrente.current.needsUpdate = true
  }, [frente])
  useEffect(() => {
    if (matVerso.current) matVerso.current.needsUpdate = true
  }, [verso])

  useFrame((_, delta) => {
    if (!grupo.current) return
    // Revelar é girar a carta sobre o próprio eixo, não trocar a textura.
    const alvoFlip = revelada ? Math.PI : 0
    grupo.current.rotation.x = THREE.MathUtils.damp(grupo.current.rotation.x, alvoFlip, 7, delta)
    // Levanta um pouco no hover, para o cliente ver que dá para clicar. O alvo
    // é relativo: o grupo de fora já está na posição da mesa, e somar `posicao`
    // aqui de novo faria a carta levitar a altura inteira do tampo.
    grupo.current.position.y = THREE.MathUtils.damp(grupo.current.position.y, hover ? 0.05 : 0, 9, delta)
  })

  const giroTotal = ((giro + (invertida && revelada ? 180 : 0)) * Math.PI) / 180

  return (
    <group position={posicao} rotation={[0, giroTotal, 0]}>
      <group
        ref={grupo}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          onPointerOver?.(e.nativeEvent)
        }}
        onPointerOut={() => {
          setHover(false)
          onPointerOut?.()
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
      >
        {/* A carta é uma caixa fina: frente e verso em faces opostas */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[CARTA_W, CARTA_H, 0.006]} />
          {/*
            Ordem das faces: +x, -x, +y, -y, +z, -z. Com o mesh deitado em
            -90°, é a face +z que aponta para cima — então ela leva o VERSO, e a
            carta nasce coberta. O flip de 180° traz a frente.
          */}
          <meshStandardMaterial attach="material-0" color={PAPEL} roughness={0.8} />
          <meshStandardMaterial attach="material-1" color={PAPEL} roughness={0.8} />
          <meshStandardMaterial attach="material-2" color={PAPEL} roughness={0.8} />
          <meshStandardMaterial attach="material-3" color={PAPEL} roughness={0.8} />
          <meshStandardMaterial
            ref={matVerso}
            attach="material-4"
            map={verso}
            color={verso ? '#ffffff' : PAPEL}
            roughness={0.62}
          />
          <meshStandardMaterial
            ref={matFrente}
            attach="material-5"
            map={frente}
            color={frente ? '#ffffff' : PAPEL}
            roughness={0.62}
          />
        </mesh>

      </group>

      {/* Realce de seleção do tarólogo. FORA do grupo que vira: lá dentro ele
          girava junto com a carta, a normal do plano passava a apontar para
          baixo e o `meshBasicMaterial` (FrontSide por padrão) sumia de vista
          assim que a carta era revelada. */}
      {selecionada && (
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[CARTA_W + 0.07, CARTA_H + 0.07]} />
          <meshBasicMaterial color="#f2d492" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
