import { useCallback, useEffect, useState } from 'react'
import { usePerfil } from './perfil'
import type { ModoDesempenho, Usuario } from './backend'

export type { ModoDesempenho }

/**
 * A preferência mora no APARELHO, e não só na conta.
 *
 * Duas razões. A primeira é que a mesa particular é aberta por quem tem o
 * link, e essa pessoa não tem conta nenhuma — `usePerfil` sem uid devolve o
 * perfil vazio, então uma preferência guardada só no perfil seria, para ela,
 * silenciosamente inexistente. A segunda é que desempenho é propriedade do
 * hardware, não da pessoa: quem escolheu "leve" no celular velho não quer
 * "leve" no desktop. Por isso o aparelho ganha de quem tem conta, e o perfil
 * só semeia os aparelhos que ainda não opinaram.
 */
const CHAVE = 'tarot.desempenho'

const MODOS: ModoDesempenho[] = ['auto', 'leve', 'completo']

/** `null` = este aparelho nunca escolheu — é o que deixa o perfil semear. */
function lerAparelho(): ModoDesempenho | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return MODOS.includes(v as ModoDesempenho) ? (v as ModoDesempenho) : null
  } catch {
    // Dados de site bloqueados: a escolha simplesmente não sobrevive à aba.
    return null
  }
}

function gravarAparelho(modo: ModoDesempenho) {
  try {
    localStorage.setItem(CHAVE, modo)
  } catch {
    /* idem */
  }
}

/**
 * O palpite do "automático", por pontos — nenhum sinal sozinho decide.
 *
 * `deviceMemory` só existe no Chromium, então ausente NÃO conta: tratá-lo como
 * aparelho fraco mandaria todo Safari e todo Firefox para o modo leve sem
 * motivo. Já `hardwareConcurrency` ausente é raro o bastante para valer como
 * sinal de aparelho antigo.
 *
 * Quem pediu menos movimento ao sistema entra no leve direto: metade do que o
 * modo corta é exatamente movimento (sombra tremendo, luz pulsando).
 */
export function aparelhoModesto(): boolean {
  if (typeof window === 'undefined') return false

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true

  let pontos = 0
  const nucleos = navigator.hardwareConcurrency
  if (!nucleos || nucleos <= 4) pontos += 2
  else if (nucleos <= 6) pontos += 1

  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (memoria !== undefined && memoria <= 4) pontos += 2

  if (window.matchMedia('(pointer: coarse)').matches) pontos += 1
  if (Math.min(window.screen.width, window.screen.height) <= 480) pontos += 1
  if ((window.devicePixelRatio || 1) >= 2.5) pontos += 1

  // iPhone 13 soma 4 (6 núcleos, toque grosso, 390 px, dpr 3) e cai no leve;
  // um MacBook M1 soma 0 e fica no completo.
  return pontos >= 3
}

export type Desempenho = {
  /** O que está escolhido, incluindo o `auto`. É o que o seletor marca. */
  modo: ModoDesempenho
  /** Já resolvido: é isto que a cena recebe. */
  leve: boolean
  /**
   * Dá para confiar em `leve`? Quem monta a cena 3D deve ESPERAR por isto.
   * O preset é fixado na criação do contexto WebGL, então trocá-lo depois
   * remonta o Canvas inteiro — e sem esperar, quem tem "leve" guardado no
   * perfil mas abriu num aparelho novo veria a mesa montar no completo e
   * recomeçar um instante depois.
   */
  pronto: boolean
  definir: (m: ModoDesempenho) => void
}

/**
 * A escolha efetiva, para a sala e para o perfil.
 *
 * `aparelhoModesto` roda UMA vez por montagem, e não a cada render: ele lê
 * `matchMedia` e `screen`, e o palpite não pode mudar no meio da leitura — o
 * preset da cena só vale enquanto o Canvas não remonta.
 */
export function useDesempenho(usuario: Usuario | null): Desempenho {
  const { perfil, pronto: perfilPronto, salvar } = usePerfil(usuario)
  const [aparelho, setAparelho] = useState<ModoDesempenho | null>(lerAparelho)
  const [modesto] = useState(aparelhoModesto)
  const [prazoVencido, setPrazoVencido] = useState(false)

  // O perfil também passa pela peneira: o documento do Firestore é lido com um
  // cast cru, sem validação — um valor estranho gravado à mão não pode virar
  // um modo que nenhuma opção marca na tela.
  const doPerfil = MODOS.includes(perfil.desempenho) ? perfil.desempenho : 'auto'
  const modo = aparelho ?? doPerfil
  const leve = modo === 'leve' || (modo === 'auto' && modesto)

  // Rede de segurança: `observarPerfil` do Firebase assina só o callback de
  // sucesso, então leitura negada ou rede caída nunca chamam de volta — sem
  // prazo, a mesa ficaria em "Preparando…" para sempre. Um segundo e meio é
  // mais que o suficiente para um snapshot que quase sempre vem do cache.
  useEffect(() => {
    const t = setTimeout(() => setPrazoVencido(true), 1500)
    return () => clearTimeout(t)
  }, [])

  // Quem já opinou NESTE aparelho não espera nada: o perfil não pode mudar o
  // resultado, porque ele só entra no `??` quando o aparelho está calado.
  const pronto = aparelho !== null || !usuario || perfilPronto || prazoVencido

  const definir = useCallback(
    (m: ModoDesempenho) => {
      gravarAparelho(m)
      setAparelho(m)
      // No perfil também, para o próximo aparelho já nascer certo. Sem conta,
      // `salvar` não faz nada — e aí o localStorage é tudo que existe.
      salvar({ desempenho: m })
    },
    [salvar],
  )

  return { modo, leve, pronto, definir }
}
