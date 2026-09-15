import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Vela from './Vela'
import CartaMesa, { CARTA_H, CARTA_W } from './CartaMesa'
import { SPREAD_BY_ID } from '../../data/spreads'
import { useTexturaPano, useTexturaVerso } from '../../lib/temas/useTema'
import type { TemaBaralho, TemaPano } from '../../lib/temas/tipos'
import type { CartaNaMesa } from '../../lib/backend'

/** Altura do tampo. Tudo que fica sobre a mesa parte daqui. */
const TAMPO = 0.76
/** Lado do tampo e do pano. A Cruz Celta chega a x=±1,15, então 3,7 de lado
 *  deixa folga de sobra em todos os cantos. */
const LADO = 3.7
const LADO_PANO = 3.2

/** Posição de descanso da câmera e o ponto para onde ela olha. */
const CAM_PADRAO = new THREE.Vector3(0, 2.75, 3.35)
const ALVO_PADRAO = new THREE.Vector3(0, TAMPO, 0)

/** Geometria do contorno do slot, criada UMA vez. Inline em `args`, o r3f via
 *  uma referência nova a cada render e reconstruía o edgesGeometry (com
 *  dispose na GPU) a cada mexida de mouse. */
const GEO_SLOT = new THREE.PlaneGeometry(CARTA_W + 0.04, CARTA_H + 0.04)

/** Degrau de altura por slot. A Cruz Celta tem duas cartas na MESMA
 *  coordenada de propósito ("o que atravessa" fica sobre "a situação"); com Y
 *  igual as duas faces ficavam coplanares e brigavam no depth buffer. */
const DEGRAU = 0.008

function Mesa({ panoEmbutidoId, temaPano }: { panoEmbutidoId: string; temaPano: TemaPano | null }) {
  const textura = useTexturaPano(panoEmbutidoId, temaPano)
  const matPano = useRef<THREE.MeshStandardMaterial>(null)

  // Mesmo motivo do CartaMesa: `map` de null para textura não recompila o
  // shader sozinho, e o pano ficaria na cor lisa para sempre.
  useEffect(() => {
    if (matPano.current) matPano.current.needsUpdate = true
  }, [textura])

  return (
    <group>
      {/* Tampo quadrado */}
      <mesh position={[0, TAMPO - 0.035, 0]} receiveShadow castShadow>
        <boxGeometry args={[LADO, 0.07, LADO]} />
        <meshStandardMaterial color="#3a2415" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Moldura da borda: um quadro fino um pouco maior que o tampo, que é o
          que dá a impressão de madeira torneada sem custar geometria. */}
      <mesh position={[0, TAMPO - 0.035, 0]}>
        <boxGeometry args={[LADO + 0.08, 0.045, LADO + 0.08]} />
        <meshStandardMaterial color="#4a2f1c" roughness={0.6} />
      </mesh>

      {/* O pano, logo acima do tampo */}
      <mesh position={[0, TAMPO + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[LADO_PANO, LADO_PANO]} />
        <meshStandardMaterial
          ref={matPano}
          map={textura}
          color={textura ? '#ffffff' : (temaPano?.cor ?? '#2a1050')}
          roughness={0.92}
        />
      </mesh>

      {/* Quatro pés nos cantos — mesa quadrada com pé central fica estranha. */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (LADO / 2 - 0.26), (TAMPO - 0.07) / 2, sz * (LADO / 2 - 0.26)]} castShadow>
          <boxGeometry args={[0.16, TAMPO - 0.07, 0.16]} />
          <meshStandardMaterial color="#3a2415" roughness={0.8} />
        </mesh>
      ))}

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
        <edgesGeometry args={[GEO_SLOT]} />
        <lineBasicMaterial color={ativo ? '#f2d492' : '#cbb0ff'} transparent opacity={ativo ? 1 : 0.55} />
      </lineSegments>
    </group>
  )
}

/**
 * Diz onde cada slot da mesa está NA TELA, em coordenadas de cliente.
 *
 * É o que permite largar uma carta arrastada no lugar certo: o canvas é um
 * elemento só do DOM, então o evento de soltar entrega apenas x/y da página —
 * sem projetar, não há como saber qual slot está embaixo do ponteiro.
 *
 * Projetar é mais simples e mais robusto que raycast aqui: são dez pontos, o
 * resultado já vem em pixels, e não depende de a malha do slot existir (slot
 * ocupado não desenha marcador, mas continua sendo alvo válido).
 */
function Projetor({
  slots,
  ativo,
  onProjetar,
}: {
  slots: { x: number; z: number }[]
  ativo: boolean
  onProjetar: (p: { slot: number; x: number; y: number }[]) => void
}) {
  const { camera, gl } = useThree()
  const v = useRef(new THREE.Vector3())

  useFrame(() => {
    // Só enquanto arrasta: fora disso seria um getBoundingClientRect por quadro
    // a troco de nada.
    if (!ativo) return
    const r = gl.domElement.getBoundingClientRect()
    onProjetar(
      slots.map((s, i) => {
        v.current.set(s.x, TAMPO + 0.02, s.z).project(camera)
        return {
          slot: i,
          x: r.left + ((v.current.x + 1) / 2) * r.width,
          y: r.top + ((1 - v.current.y) / 2) * r.height,
        }
      }),
    )
  })
  return null
}

/**
 * Câmera guiada. Só entra em cena quando não há OrbitControls — os dois
 * disputariam a mesma matriz e a imagem tremeria.
 *
 * Ao focar uma carta a câmera desce quase a pino sobre ela: é a vista de cima
 * que o pedido descreve, e é ela que faz a carta ocupar o centro da tela sem
 * precisar mover a carta de lugar.
 */
function CameraGuiada({ foco }: { foco: [number, number] | null }) {
  const { camera } = useThree()
  const alvo = useRef(ALVO_PADRAO.clone())
  // Alocados uma vez: criar Vector3 dentro do useFrame é lixo a 60fps.
  const destino = useRef(new THREE.Vector3())
  const destinoAlvo = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    if (foco) {
      // Um pouco atrás e bem acima: a pino puro deixaria a carta sem volume.
      destino.current.set(foco[0], TAMPO + 1.28, foco[1] + 0.62)
      destinoAlvo.current.set(foco[0], TAMPO, foco[1])
    } else {
      destino.current.copy(CAM_PADRAO)
      destinoAlvo.current.copy(ALVO_PADRAO)
    }
    // Amortecimento exponencial: independe da taxa de quadros, ao contrário de
    // um lerp com fator fixo, que fica mais rápido em monitor de 144Hz.
    const k = 1 - Math.exp(-dt * 3.6)
    camera.position.lerp(destino.current, k)
    alvo.current.lerp(destinoAlvo.current, k)
    camera.lookAt(alvo.current)
  })
  return null
}

/** Uma vela solta no ar: sobe e desce e pende, cada uma no seu tempo. */
function VelaFlutuante({
  x,
  z,
  base,
  altura,
  semente,
  sombra,
}: {
  x: number
  z: number
  /** Altura de repouso; o balanço acontece em volta dela. */
  base: number
  altura: number
  semente: number
  sombra: boolean
}) {
  const g = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const grupo = g.current
    if (!grupo) return
    // Períodos diferentes e primos entre si em cada eixo: o conjunto nunca
    // volta à mesma pose, que é o que impede o anel de parecer uma engrenagem.
    grupo.position.y = base + Math.sin(t * 0.62 + semente) * 0.12
    grupo.rotation.z = Math.sin(t * 0.47 + semente) * 0.06
    grupo.rotation.x = Math.cos(t * 0.39 + semente * 1.7) * 0.05
  })

  return (
    <group ref={g} position={[x, base, z]}>
      <Vela posicao={[0, 0, 0]} altura={altura} semente={semente} sombra={sombra} />
    </group>
  )
}

/**
 * As velas em volta da mesa, flutuando e girando devagar.
 *
 * O raio é maior que a meia-diagonal do tampo (1,85 × √2 ≈ 2,62), senão as
 * velas atravessariam os cantos da mesa quadrada ao passar por eles.
 */
function VelasFlutuantes({ quantidade = 6, raio = 2.85 }: { quantidade?: number; raio?: number }) {
  const anel = useRef<THREE.Group>(null)

  useFrame((state) => {
    // Lento de propósito: rápido vira carrossel e cansa em vez de acalmar.
    if (anel.current) anel.current.rotation.y = state.clock.elapsedTime * 0.052
  })

  return (
    <group ref={anel}>
      {Array.from({ length: quantidade }, (_, i) => {
        const a = (i / quantidade) * Math.PI * 2
        return (
          <VelaFlutuante
            key={i}
            x={Math.cos(a) * raio}
            z={Math.sin(a) * raio}
            // Alturas alternadas: um anel todo na mesma cota lê como anel de
            // luminária, não como velas soltas.
            base={TAMPO + 0.62 + (i % 3) * 0.28}
            altura={0.2 + (i % 4) * 0.035}
            semente={i * 1.9}
            // Só duas projetam sombra — ver o comentário em Vela.tsx.
            sombra={i === 0 || i === 3}
          />
        )
      })}
    </group>
  )
}

export type Sala3DProps = {
  spreadId: string
  /** Pano embutido a usar quando `temaPano` é null. Já resolvido para quem olha. */
  panoEmbutidoId: string
  /** JÁ resolvido e JÁ carregado. null = pano embutido. */
  temaPano: TemaPano | null
  /** JÁ resolvido e JÁ carregado. null = as cartas desenhadas. */
  temaBaralho: TemaBaralho | null
  cartas: CartaNaMesa[]
  /** Tarólogo vê os slots, pode clicar neles e pode girar a mesa. */
  editavel: boolean
  slotAtivo: number | null
  /** Luz acesa deixa o ambiente claro; apagada, só as velas. */
  luzAcesa?: boolean
  /** Slot que a câmera está enquadrando. Só vale para quem não edita. */
  focoSlot?: number | null
  /** Há uma carta sendo arrastada: mostra TODOS os alvos, não só os vazios. */
  arrastando?: boolean
  /** Posição de cada slot na tela, atualizada enquanto se arrasta. */
  onProjetar?: (p: { slot: number; x: number; y: number }[]) => void
  onSlot?: (slot: number) => void
  onCarta?: (slot: number) => void
  onHoverCarta?: (slot: number | null) => void
  /** Primeira posição do popup, vinda do próprio evento de hover. */
  onPonteiro?: (p: { x: number; y: number }) => void
  /** Clique no vazio: é como o cliente sai do foco de uma carta. */
  onFundo?: () => void
}

/** Conteúdo da cena. Separado para os hooks de textura rodarem dentro do Canvas
 *  sem que o próprio Canvas remonte a cada mudança de tema. */
function Cena({
  spreadId,
  panoEmbutidoId,
  temaPano,
  temaBaralho,
  cartas,
  editavel,
  slotAtivo,
  luzAcesa,
  focoSlot,
  arrastando,
  onSlot,
  onCarta,
  onHoverCarta,
  onPonteiro,
  onProjetar,
}: Sala3DProps) {
  const spread = SPREAD_BY_ID.get(spreadId) ?? SPREAD_BY_ID.get('tres')!
  const porSlot = useMemo(() => new Map(cartas.map((c) => [c.slot, c])), [cartas])
  // Um empréstimo do verso para a mesa inteira.
  const verso = useTexturaVerso(temaBaralho)

  const foco =
    !editavel && focoSlot !== null && focoSlot !== undefined && spread.slots[focoSlot]
      ? ([spread.slots[focoSlot].x, spread.slots[focoSlot].z] as [number, number])
      : null

  return (
    <>
      {/* Luz apagada é o clima de sempre: quem ilumina são as velas. Acesa, uma
          luz de teto entra e o ambiente inteiro sobe de nível. */}
      <ambientLight intensity={luzAcesa ? 1.05 : 0.42} color={luzAcesa ? '#c9bcff' : '#7d6ac4'} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={luzAcesa ? 1.5 : 0.5}
        color={luzAcesa ? '#ffffff' : '#c3b2ff'}
        castShadow={luzAcesa}
      />
      <pointLight
        position={[0, 2.1, 0.4]}
        intensity={luzAcesa ? 12 : 7}
        distance={luzAcesa ? 8 : 5}
        decay={2}
        color="#ffd9a8"
      />

      <Mesa panoEmbutidoId={panoEmbutidoId} temaPano={temaPano} />

      <VelasFlutuantes />

      {/* Slots do layout: só o tarólogo os enxerga. Arrastando uma carta,
          TODOS aparecem — inclusive os ocupados, que são alvo válido (soltar
          ali troca a carta). */}
      {editavel &&
        spread.slots.map((s, i) =>
          porSlot.has(i) && !arrastando ? null : (
            <Slot key={i} x={s.x} z={s.z} rot={s.rot} ativo={slotAtivo === i} onClick={() => onSlot?.(i)} />
          ),
        )}

      {editavel && onProjetar && (
        <Projetor slots={spread.slots} ativo={Boolean(arrastando)} onProjetar={onProjetar} />
      )}

      {/* Cartas na mesa */}
      {spread.slots.map((s, i) => {
        const c = porSlot.get(i)
        if (!c) return null
        return (
          <CartaMesa
            key={`${i}-${c.cardId}`}
            cardId={c.cardId}
            tema={temaBaralho}
            verso={verso}
            posicao={[s.x, TAMPO + 0.012 + i * DEGRAU, s.z]}
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

      {/* O tarólogo gira a mesa; o cliente não movimenta a visão — ele só
          clica numa carta e a câmera faz o resto. */}
      {editavel ? (
        <OrbitControls
          target={[0, TAMPO, 0]}
          enablePan={false}
          minDistance={2.1}
          maxDistance={5.4}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2 - 0.12}
          enableDamping
          dampingFactor={0.08}
        />
      ) : (
        <CameraGuiada foco={foco} />
      )}
    </>
  )
}

export default function Sala3D(props: Sala3DProps) {
  const { luzAcesa, onFundo } = props
  const fundo = luzAcesa ? '#1d1440' : '#0d0620'

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2.75, 3.35], fov: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // Clique no vazio sai do foco. `onPointerMissed` é do r3f e só dispara
      // quando o raio não acertou nenhum objeto.
      onPointerMissed={() => onFundo?.()}
    >
      <color attach="background" args={[fundo]} />
      <fog attach="fog" args={[fundo, luzAcesa ? 6 : 4.5, luzAcesa ? 14 : 11]} />
      <Suspense fallback={null}>
        <Cena {...props} />
      </Suspense>
    </Canvas>
  )
}
