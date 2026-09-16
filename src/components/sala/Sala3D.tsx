import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Vela from './Vela'
import CartaMesa, { CARTA_H, CARTA_W } from './CartaMesa'
import { SPREAD_BY_ID } from '../../data/spreads'
import { limitarAfastamento } from '../../lib/afastamento'
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

/**
 * Os dois níveis da cena.
 *
 * A conta que manda aqui é a de PASSES de renderização. Uma luz de ponto com
 * sombra é um mapa cúbico — seis passes da cena inteira por quadro, cada um
 * redesenhando até setenta objetos (cada carta é uma caixa com seis materiais,
 * e o three emite um desenho por material). Duas velas com sombra, que é o que
 * o modo completo faz, são doze passes contra UM de imagem. É daí que vem a
 * maior parte do custo da sala, e é a primeira coisa que o leve corta.
 *
 * Em troca o leve liga a sombra da luz direcional o tempo todo: é ela que
 * mantém a carta POUSADA na mesa em vez de flutuando, custa um passe só, e é
 * a sombra que a pessoa realmente vê. A das velas é a que treme no pé da mesa.
 *
 * Depois disso vem o número de luzes (todo material paga o loop inteiro por
 * pixel, esteja a vela perto ou longe) e a quantidade de pixels.
 */
const QUALIDADE = {
  completo: {
    dpr: [1, 2] as [number, number],
    antialias: true,
    /** Velas que entram no loop de luzes do shader: uma a cada `passo`. */
    passoDaLuz: 1,
    velasComSombra: [0, 3],
    /**
     * Meia-extensão do frustum da sombra do sol. Aqui o CHÃO recebe sombra,
     * então ele precisa caber a sombra que o tampo projeta lá embaixo: o canto
     * mais distante do tampo de 3,7, projetado no espaço da câmera de sombra,
     * dá 2,565. Menos que isso e a sombra da mesa sai cortada em reta no chão.
     */
    ladoDaSombra: 2.8,
    /** Alcance da neblina com a luz apagada e acesa. */
    neblina: [11, 14],
    chaoGomos: 48,
    chaoRecebeSombra: true,
  },
  leve: {
    // 1,5 em vez de 2 corta 44% dos fragmentos — e como a arte da carta tem
    // 512 px de largura, acima de 1,5 quase não há detalhe real a ganhar. Não
    // descer a 1 junto com o antialias desligado: aí serrilha feio.
    dpr: [1, 1.5] as [number, number],
    antialias: false,
    passoDaLuz: 2,
    velasComSombra: [] as number[],
    // Aqui o chão NÃO recebe sombra: os receptores são o tampo e o pano, e o
    // que importa é a sombra das cartas. O pior canto da Cruz Celta cai em
    // 1,894 — daí 2, que aperta o mapa e deixa a borda mais nítida.
    ladoDaSombra: 2,
    neblina: [9, 12],
    chaoGomos: 24,
    chaoRecebeSombra: false,
  },
}

function Mesa({
  panoEmbutidoId,
  temaPano,
  leve,
}: {
  panoEmbutidoId: string
  temaPano: TemaPano | null
  leve: boolean
}) {
  const textura = useTexturaPano(panoEmbutidoId, temaPano)
  const matPano = useRef<THREE.MeshStandardMaterial>(null)
  const q = QUALIDADE[leve ? 'leve' : 'completo']

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

      {/* Chão da sala. No leve ele deixa de receber sombra: é um disco enorme,
          quase preto e já coberto pela neblina a partir de 4,5 — a busca no
          mapa de sombra por fragmento não compra nada ali. */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={q.chaoRecebeSombra}>
        <circleGeometry args={[7, q.chaoGomos]} />
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
 *
 * O afastamento MOVE a câmera para trás sobre o próprio eixo de visada, em vez
 * de abrir o `fov`. Abrir o fov seria o efeito Vertigo: a perspectiva muda
 * junto, e as cartas das bordas da mesa se deformam — uma carta de tarô é lida
 * como retângulo, e vê-la entortar no canto estraga a mesa. Mover a câmera
 * preserva a geometria e ainda aproveita o amortecimento que já existe aqui.
 */
function CameraGuiada({ foco, afastamento }: { foco: [number, number] | null; afastamento: number }) {
  const { camera } = useThree()
  const alvo = useRef(ALVO_PADRAO.clone())
  // Alocados uma vez: criar Vector3 dentro do useFrame é lixo a 60fps.
  const destino = useRef(new THREE.Vector3())
  const destinoAlvo = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    if (foco) {
      // Um pouco atrás e bem acima: a pino puro deixaria a carta sem volume.
      // O afastamento vale aqui também, senão a roda do mouse "não funciona"
      // justamente enquanto a pessoa está olhando uma carta.
      destinoAlvo.current.set(foco[0], TAMPO, foco[1])
      // O deslocamento é RELATIVO à carta — daí o x zerado antes do `add`.
      destino.current.set(0, 1.28 * afastamento, 0.62 * afastamento).add(destinoAlvo.current)
    } else {
      // Escala em torno do ALVO, não da origem: é o vetor alvo→câmera que
      // estica. Escalar a posição crua também subiria a câmera em relação ao
      // tampo e ela acabaria olhando o chão.
      destino.current.copy(CAM_PADRAO).sub(ALVO_PADRAO).multiplyScalar(afastamento).add(ALVO_PADRAO)
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

/**
 * Roda do mouse e pinça de dois dedos sobre a mesa, para o cliente afastar.
 *
 * Ouvinte nativo, e não o `onWheel` do JSX: o React registra `wheel`,
 * `touchstart` e `touchmove` como PASSIVOS na raiz, e dentro de um ouvinte
 * passivo o `preventDefault` não faz nada — a página rolava junto com o zoom.
 * O `onWheel` do próprio r3f em malhas 3D também é passivo, então não havia
 * caminho declarativo.
 *
 * O par disso está no `Canvas`, no `touchAction: 'none'`: o r3f 9 deixou de
 * aplicá-lo sozinho (o 8 aplicava), e sem ele o navegador fica com o gesto de
 * pinça para si e amplia a página inteira em vez de afastar a mesa.
 */
function GestosDeAfastamento({
  afastamento,
  onAfastamento,
}: {
  afastamento: number
  onAfastamento: (f: number) => void
}) {
  const canvas = useThree((s) => s.gl.domElement)
  // Em refs, e não nas dependências do efeito: assim o ouvinte é registrado na
  // montagem e só ali, sem uma janela sem handler a cada mexida no zoom.
  const atual = useRef(afastamento)
  atual.current = afastamento
  const aplicar = useRef(onAfastamento)
  aplicar.current = onAfastamento

  useEffect(() => {
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      // `deltaMode`: 0 = pixel, 1 = linha (Firefox), 2 = página. Sem
      // normalizar, o Firefox andaria dezesseis vezes menos que o Chrome.
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1
      // Geométrico e não aditivo: cada entalhe afasta a mesma FRAÇÃO, que é
      // como o olho lê distância. Dá ~7% por entalhe, cinco no curso inteiro.
      aplicar.current(limitarAfastamento(atual.current * Math.exp(e.deltaY * k * 6.8e-4)))
    }
    canvas.addEventListener('wheel', roda, { passive: false })
    return () => canvas.removeEventListener('wheel', roda)
  }, [canvas])

  useEffect(() => {
    /** Distância entre os dedos quando a pinça começou, e o zoom de então. */
    let base = 0
    let baseAfastamento = 1
    const entre = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const armar = (t: TouchList) => {
      base = entre(t)
      baseAfastamento = atual.current
    }

    const comecar = (e: TouchEvent) => {
      if (e.touches.length === 2) armar(e.touches)
    }

    /**
     * Um dedo a mais NÃO pode matar a pinça. `touches` conta a tela inteira,
     * então a palma encostando já leva a três e o gesto sai do ar — o que não
     * pode é continuar morto quando ela sai. Por isso quem manda aqui é a
     * contagem: fora de dois desarma, e o primeiro movimento de volta a dois
     * REARMA em vez de aplicar uma âncora velha, que daria um salto de zoom
     * (os dedos andaram enquanto ninguém estava olhando).
     */
    const mover = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        base = 0
        return
      }
      e.preventDefault()
      const agora = entre(e.touches)
      // Dois toques na mesma coordenada dariam divisão por zero.
      if (!agora) return
      if (!base) {
        armar(e.touches)
        return
      }
      // A razão entra INVERTIDA: dedos que se aproximam afastam a mesa.
      const bruto = baseAfastamento * (base / agora)
      const limitado = limitarAfastamento(bruto)
      // Reancorar quando o limite morde. O curso inteiro é de 1,0 a 1,4, então
      // qualquer pinça de verdade satura antes do meio; sem reancorar, todo o
      // excedente vira zona morta e a pessoa teria de desfazer o exagero
      // inteiro antes de a mesa reagir de novo — parece pinça quebrada.
      if (bruto !== limitado) {
        base = agora
        baseAfastamento = limitado
      }
      aplicar.current(limitado)
    }

    // Sobraram dois dedos? A pinça continua, com âncora nova. Menos que isso,
    // acabou — e zerar é o que impede o próximo toque de dar um salto.
    const acabar = (e: TouchEvent) => {
      if (e.touches.length === 2) armar(e.touches)
      else base = 0
    }

    canvas.addEventListener('touchstart', comecar, { passive: false })
    canvas.addEventListener('touchmove', mover, { passive: false })
    canvas.addEventListener('touchend', acabar)
    canvas.addEventListener('touchcancel', acabar)
    return () => {
      canvas.removeEventListener('touchstart', comecar)
      canvas.removeEventListener('touchmove', mover)
      canvas.removeEventListener('touchend', acabar)
      canvas.removeEventListener('touchcancel', acabar)
    }
  }, [canvas])

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
  luz,
  leve,
}: {
  x: number
  z: number
  /** Altura de repouso; o balanço acontece em volta dela. */
  base: number
  altura: number
  semente: number
  sombra: boolean
  luz: boolean
  leve: boolean
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
      <Vela posicao={[0, 0, 0]} altura={altura} semente={semente} sombra={sombra} luz={luz} leve={leve} />
    </group>
  )
}

/**
 * As velas em volta da mesa, flutuando e girando devagar.
 *
 * O raio é maior que a meia-diagonal do tampo (1,85 × √2 ≈ 2,62), senão as
 * velas atravessariam os cantos da mesa quadrada ao passar por eles.
 */
function VelasFlutuantes({
  leve,
  quantidade = 6,
  raio = 2.85,
}: {
  leve: boolean
  quantidade?: number
  raio?: number
}) {
  const anel = useRef<THREE.Group>(null)
  const q = QUALIDADE[leve ? 'leve' : 'completo']

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
            // Só duas projetam sombra — ver o comentário em Vela.tsx. No leve,
            // nenhuma.
            sombra={q.velasComSombra.includes(i)}
            // No leve acendem uma sim, uma não. As seis continuam na mesa e
            // com chama; o que alterna é quem entra no loop de luzes.
            luz={i % q.passoDaLuz === 0}
            leve={leve}
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
  /** Quanto o cliente afastou a mesa, entre 1 e 1,4. Ver `lib/afastamento`. */
  afastamento?: number
  /** Roda do mouse e pinça pedindo outro afastamento, já dentro dos limites. */
  onAfastamento?: (f: number) => void
  /** Cena econômica: menos luz, menos sombra, menos pixel. */
  leve?: boolean
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
  afastamento = 1,
  onAfastamento,
  leve = false,
  arrastando,
  onSlot,
  onCarta,
  onHoverCarta,
  onPonteiro,
  onProjetar,
}: Sala3DProps) {
  const spread = SPREAD_BY_ID.get(spreadId) ?? SPREAD_BY_ID.get('tres')!
  const q = QUALIDADE[leve ? 'leve' : 'completo']
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
      {/* No leve esta sombra fica SEMPRE ligada: ela é a que apoia a carta na
          mesa, custa um passe só e substitui as doze faces de cubo das velas.
          De quebra, acender e apagar a luz deixa de mudar o número de sombras
          da cena — o que hoje recompila todos os shaders e dá aquele engasgo.
          O enquadramento é apertado em volta do que de fato recebe sombra (ver
          `ladoDaSombra`), e não os ±5 do padrão: com o mesmo mapa de 512 a
          borda fica duas vezes mais nítida. */}
      <directionalLight
        position={[2, 4, 3]}
        intensity={luzAcesa ? 1.5 : 0.5}
        color={luzAcesa ? '#ffffff' : '#c3b2ff'}
        castShadow={leve || luzAcesa}
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-q.ladoDaSombra}
        shadow-camera-right={q.ladoDaSombra}
        shadow-camera-top={q.ladoDaSombra}
        shadow-camera-bottom={-q.ladoDaSombra}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
      />
      <pointLight
        position={[0, 2.1, 0.4]}
        intensity={luzAcesa ? 12 : 7}
        distance={luzAcesa ? 8 : 5}
        decay={2}
        color="#ffd9a8"
      />

      <Mesa panoEmbutidoId={panoEmbutidoId} temaPano={temaPano} leve={leve} />

      <VelasFlutuantes leve={leve} />

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
      {/* O cliente não gira a mesa, mas afasta: é o suficiente para ver o
          layout inteiro numa tela estreita, e continua sem a chance de acabar
          olhando para o teto. */}
      {!editavel && onAfastamento && (
        <GestosDeAfastamento afastamento={afastamento} onAfastamento={onAfastamento} />
      )}

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
        <CameraGuiada foco={foco} afastamento={afastamento} />
      )}
    </>
  )
}

export default function Sala3D(props: Sala3DProps) {
  const { leve = false, luzAcesa, onFundo } = props
  const q = QUALIDADE[leve ? 'leve' : 'completo']
  const fundo = luzAcesa ? '#1d1440' : '#0d0620'

  return (
    <Canvas
      // Trocar de qualidade REMONTA a cena, e é de propósito. `antialias` é
      // atributo de criação do contexto WebGL (mudar a prop não faz nada), e
      // mexer no número de luzes e de sombras muda `#define`s do GLSL: sem
      // remontar, a troca recompilaria todos os materiais da sala de uma vez,
      // que é um congelamento pior que o piscar de reabrir a mesa.
      key={leve ? 'leve' : 'completo'}
      shadows
      dpr={q.dpr}
      camera={{ position: [0, 2.75, 3.35], fov: 40 }}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance' }}
      // O r3f 9 deixou de pôr isto sozinho (o 8 punha). Sem `touch-action`, o
      // navegador fica com a pinça para si e amplia a página em vez da mesa.
      style={{ touchAction: 'none' }}
      // Clique no vazio sai do foco. `onPointerMissed` é do r3f e só dispara
      // quando o raio não acertou nenhum objeto.
      onPointerMissed={() => onFundo?.()}
    >
      <color attach="background" args={[fundo]} />
      {/* No leve a neblina fecha um pouco antes: esconde mais chão distante e
          é o que paga a sombra e os gomos que saíram lá atrás. */}
      <fog attach="fog" args={[fundo, luzAcesa ? 6 : 4.5, luzAcesa ? q.neblina[1] : q.neblina[0]]} />
      <Suspense fallback={null}>
        <Cena {...props} />
      </Suspense>
    </Canvas>
  )
}
