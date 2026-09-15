import { PANOS } from '../../data/panos'
import type { EscolhaVisual, Sessao } from '../backend'

/**
 * Quem vê o tema de quem. Puro: sem React, sem storage, sem backend — é o
 * único arquivo desta parte que dá para conferir de cabeça, e a tabela-verdade
 * no fim do arquivo é o contrato inteiro.
 */

/**
 * Sentinela antiga: "quero a arte desenhada, mesmo que o outro esteja num
 * tema". Saiu da interface, mas continua sendo entendida na leitura — sessões
 * gravadas antes podem tê-la, e uma delas nunca deve virar id de tema.
 *
 * @deprecated Não ofereça isto em tela nova.
 */
export const PADRAO = 'padrao'

export const SEM_ESCOLHA: EscolhaVisual = { baralhoId: null, panoId: null }

/**
 * Qual tema ESTA pessoa vê, num canal (baralho OU pano).
 *
 * A regra em uma frase: cada um vê o seu; quem não escolheu nada herda do
 * tarólogo; e o tarólogo pode espiar a mesa do cliente sem perder a sua.
 *
 * `souTarologo` é o papel NESTA sessão (`sessao.tarologoUid === usuario.uid`),
 * NUNCA `usuario.papel`: um tarólogo que entra na sala de outro tarólogo é
 * cliente ali, e passar o papel da conta faria a mesa resolver pelo ramo
 * errado. O parâmetro é booleano, e não `Papel`, exatamente para tornar
 * impossível escrever `resolverTema(usuario.papel, …)` e ainda compilar.
 *
 * Devolve `null` para "arte desenhada": tanto quando ninguém escolheu quanto
 * quando alguém escolheu PADRAO. Quem consome não precisa saber a diferença.
 */
export function resolverTema(
  souTarologo: boolean,
  minha: string | null,
  doOutro: string | null,
  verDoOutro: boolean,
): string | null {
  let bruto: string | null
  if (!souTarologo) {
    // `??` e não `||`: string vazia jamais deveria chegar aqui, mas se chegar é
    // um id inválido, não um "não escolhi" — e falhar visível é melhor.
    bruto = minha ?? doOutro
  } else if (verDoOutro && doOutro) {
    bruto = doOutro
  } else {
    bruto = minha
  }
  return !bruto || bruto === PADRAO ? null : bruto
}

/**
 * Os dois canais de uma vez. Hoje o interruptor é um só e vale para os dois;
 * como a função é POR CANAL, separar depois em "ver o baralho dele" e "ver o
 * pano dele" é trocar um argumento por dois — a lógica não muda.
 */
export function resolverVisual(
  souTarologo: boolean,
  minha: EscolhaVisual,
  doOutro: EscolhaVisual,
  verDoOutro: boolean,
): EscolhaVisual {
  return {
    baralhoId: resolverTema(souTarologo, minha.baralhoId, doOutro.baralhoId, verDoOutro),
    panoId: resolverTema(souTarologo, minha.panoId, doOutro.panoId, verDoOutro),
  }
}

/**
 * As escolhas gravadas na sessão, normalizadas. Sessão criada antes dos temas
 * só tem `panoId`, que era o pano de todo mundo: ele vira a escolha do
 * TARÓLOGO — que é o que sempre significou — e o cliente segue herdando,
 * exatamente como era. Zero migração, nenhuma mesa antiga fica cinza.
 */
export function escolhasDaSessao(s: Sessao): { tarologo: EscolhaVisual; cliente: EscolhaVisual } {
  return {
    tarologo: s.visualTarologo ?? { baralhoId: null, panoId: s.panoId ?? null },
    cliente: s.visualCliente ?? SEM_ESCOLHA,
  }
}

/** Prefixo que distingue um tema do acervo de um pano embutido. */
export const PREFIXO_TEMA = 'tema:'

/** `tema:<id>` -> `<id>`; qualquer outra coisa -> null. */
export function idDoTemaPano(ref: string | null): string | null {
  return ref?.startsWith(PREFIXO_TEMA) ? ref.slice(PREFIXO_TEMA.length) : null
}

/**
 * Qual dos PANOS embutidos desenhar quando o ref resolvido não é um tema do
 * acervo. Um namespace só, escolhido assim porque o `panoId` legado já guarda o
 * id cru de PANOS — dobrar a sessão antiga não precisa de tradução nenhuma.
 */
export function panoEmbutidoDe(ref: string | null): string {
  if (ref && !ref.startsWith(PREFIXO_TEMA) && PANOS.some((p) => p.id === ref)) return ref
  return PANOS[0].id
}

// ═══════════════════════════ TABELA-VERDADE ═══════════════════════════
// T = tema escolhido pelo tarólogo · C = tema escolhido pelo cliente
// – = null ("não escolhi nada") · P = PADRAO ("quero a arte do site")
// resultado null = arte desenhada. `ver` = o interruptor, só do tarólogo.
//
// ┌───┬──────────┬──────┬──────┬─────┬──────────┬───────────────────────────┐
// │  #│ papel    │minha │outro │ ver │ resultado│ leitura                   │
// ├───┼──────────┼──────┼──────┼─────┼──────────┼───────────────────────────┤
// │  1│ cliente  │  –   │  –   │  ·  │  null    │ ninguém escolheu: padrão  │
// │  2│ cliente  │  –   │  T   │  ·  │  T       │ HERANÇA: vê o do tarólogo │
// │  3│ cliente  │  C   │  –   │  ·  │  C       │ só ele escolheu           │
// │  4│ cliente  │  C   │  T   │  ·  │  C       │ OS DOIS: cada um vê o seu │
// │ 4b│ cliente  │  P   │  T   │  ·  │  null    │ recusou o tema do tarólogo│
// ├───┼──────────┼──────┼──────┼─────┼──────────┼───────────────────────────┤
// │  5│ tarologo │  –   │  –   │ não │  null    │ padrão                    │
// │  6│ tarologo │  –   │  –   │ SIM │  null    │ espelho: o cliente também │
// │  7│ tarologo │  T   │  –   │ não │  T       │ o dele                    │
// │  8│ tarologo │  T   │  –   │ SIM │  T       │ espelho: o cliente herda T│
// │  9│ tarologo │  –   │  C   │ não │  null    │ NÃO pediu para ver: o tema│
// │   │          │      │      │     │          │ do cliente não o invade   │
// │ 10│ tarologo │  –   │  C   │ SIM │  C       │ espelho                   │
// │ 11│ tarologo │  T   │  C   │ não │  T       │ OS DOIS: cada um vê o seu │
// │ 12│ tarologo │  T   │  C   │ SIM │  C       │ espelho: vê o baralho dele│
// │12b│ tarologo │  T   │  P   │ SIM │  null    │ espelho de quem recusou   │
// └───┴──────────┴──────┴──────┴─────┴──────────┴───────────────────────────┘
//
// DESMARCAR é 12 → 11 e 10 → 9, instantâneo e sem perda, porque:
//   · o espelho NUNCA escreveu em `visualTarologo` — a escolha T ficou intacta
//     o tempo todo, guardada na sessão;
//   · o interruptor nem chega à `Sessao` (mora em sessionStorage), então o
//     cliente não recebe broadcast nenhum: a mesa dele não pisca, e ele nunca
//     soube que estava sendo espelhado.
//
// INVARIANTE, e é o modelo mental do recurso inteiro:
//   resolverTema(true, m, o, true) === resolverTema(false, o, m, false)
//   "espelhar" é literalmente calcular a visão do cliente. Por isso as linhas 6
//   e 8 não precisam de caso especial: se o cliente não escolheu nada, o que
//   ele vê JÁ é o tema do tarólogo.
//
// NÃO HÁ CICLO: a visão do cliente depende só das duas ESCOLHAS, nunca da visão
// do tarólogo. Resolve-se o cliente primeiro; o espelho é uma leitura.
