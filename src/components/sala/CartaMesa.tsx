import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD_BY_ID } from '../../data/cards'

export const CARTA_W = 0.4
export const CARTA_H = 0.68

/** Verso das cartas: desenhado uma vez e compartilhado por todas. */
function texturaVerso(): THREE.Texture {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="840" viewBox="0 0 256 420">
    <rect width="256" height="420" rx="14" fill="#1b0d42"/>
    <rect x="9" y="9" width="238" height="402" rx="9" fill="none" stroke="#d9b979" stroke-width="2" opacity="0.55"/>
    <g stroke="#d9b979" fill="none" opacity="0.7">
      <circle cx="128" cy="210" r="62" stroke-width="1.6"/>
      <circle cx="128" cy="210" r="44" stroke-width="1"/>
    </g>
    <path d="M128 148 L136 202 L190 210 L136 218 L128 272 L120 218 L66 210 L120 202 Z" fill="#d9b979" opacity="0.85"/>
    <path d="M128 96a15 15 0 1 0 .1 0 11 11 0 1 1-.1 0" fill="#d9b979" opacity="0.6"/>
    <path d="M128 324a15 15 0 1 0 .1 0 11 11 0 1 1-.1 0" fill="#d9b979" opacity="0.6"/>
  </svg>`
  const tex = new THREE.TextureLoader().load(`data:image/svg+xml,${encodeURIComponent(svg)}`)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/**
 * Frente da carta, desenhada a partir dos dados dela. Não há arte por carta —
 * o que identifica é o nome, o número e o símbolo do naipe, num layout de
 * baralho clássico.
 */
function texturaFrente(cardId: string): THREE.Texture {
  const c = CARD_BY_ID.get(cardId)
  const nome = c?.nome ?? '—'
  const simbolo = { maior: '✦', paus: '♣', copas: '♥', espadas: '♠', ouros: '♦' }[c?.naipe ?? 'maior']
  const romano = c?.naipe === 'maior' ? ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][c.numero] ?? '' : `${c?.numero ?? ''}`
  // Quebra o nome em duas linhas quando não cabe.
  const palavras = nome.split(' ')
  const meio = Math.ceil(palavras.length / 2)
  const linhas = nome.length > 14 ? [palavras.slice(0, meio).join(' '), palavras.slice(meio).join(' ')] : [nome]

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="840" viewBox="0 0 256 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdf6e6"/><stop offset="100%" stop-color="#efe0c4"/>
    </linearGradient></defs>
    <rect width="256" height="420" rx="14" fill="url(#g)"/>
    <rect x="9" y="9" width="238" height="402" rx="9" fill="none" stroke="#7a5a25" stroke-width="2"/>
    <text x="128" y="52" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#7a5a25">${romano}</text>
    <text x="128" y="212" text-anchor="middle" font-size="96" fill="#6d3fd4" opacity="0.72">${simbolo}</text>
    ${linhas
      .map(
        (l, i) =>
          `<text x="128" y="${330 + i * 30}" text-anchor="middle" font-family="Georgia,serif" font-size="23" fill="#3b2a12">${l}</text>`,
      )
      .join('')}
  </svg>`
  const tex = new THREE.TextureLoader().load(`data:image/svg+xml,${encodeURIComponent(svg)}`)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  // Revelar é virar a carta 180° sobre o eixo horizontal, o que deixaria o
  // texto de cabeça para baixo. Girar a própria textura devolve a leitura certa.
  tex.center.set(0.5, 0.5)
  tex.rotation = Math.PI
  return tex
}

export default function CartaMesa({
  cardId,
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

  const verso = useMemo(() => texturaVerso(), [])
  const frente = useMemo(() => texturaFrente(cardId), [cardId])

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
          <meshStandardMaterial attach="material-0" color="#e8dcc0" roughness={0.8} />
          <meshStandardMaterial attach="material-1" color="#e8dcc0" roughness={0.8} />
          <meshStandardMaterial attach="material-2" color="#e8dcc0" roughness={0.8} />
          <meshStandardMaterial attach="material-3" color="#e8dcc0" roughness={0.8} />
          <meshStandardMaterial attach="material-4" map={verso} roughness={0.62} />
          <meshStandardMaterial attach="material-5" map={frente} roughness={0.62} />
        </mesh>

        {/* Realce de seleção do tarólogo */}
        {selecionada && (
          <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[CARTA_W + 0.07, CARTA_H + 0.07]} />
            <meshBasicMaterial color="#f2d492" transparent opacity={0.28} />
          </mesh>
        )}
      </group>
    </group>
  )
}
