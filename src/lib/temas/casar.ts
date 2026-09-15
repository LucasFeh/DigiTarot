import { CARDS } from '../../data/cards'
import { APELIDOS_MAIOR, ARTIGOS, MARCA_VERSO, NAIPES, RANKS, ROMANOS, RUIDO } from './apelidos'
import type { Alvo, ItemImportado } from './tipos'

/**
 * Casamento de nome de arquivo para carta.
 *
 * São quatro portões, em ordem de confiança. Os três primeiros produzem
 * casamento EXATO (aplicado sozinho); o quarto só produz SUGESTÃO, que precisa
 * de um clique. Essa separação é o ponto: preferir deixar o arquivo na bandeja
 * a atribuí-lo à carta errada — desfazer um palpite errado custa mais atenção
 * do que arrastar um arquivo que ficou de fora.
 */

/**
 * Normaliza um texto em palavras comparáveis.
 *
 * O NFD é obrigatório: o macOS entrega nomes de arquivo em NFD e o Windows em
 * NFC, então "Força" chega das duas formas e só a decomposição seguida da
 * remoção dos combinantes iguala as duas.
 */
export function normalizar(texto: string): string {
  return (
    texto
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .normalize('NFD')
      // A faixa dos diacríticos combinantes, escrita por código: colada como
      // caractere ela some em qualquer editor e o arquivo vira um mistério.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      // Separa letra de dígito: baralhos reais nomeiam os menores com o naipe
      // COLADO no número (`Cups01`, `Pents14`, `Wands11`). Sem esta linha o
      // token inteiro não é nem naipe nem número, e as 56 cartas menores de um
      // baralho inteiro caem na bandeja.
      .replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-z])/g, '$1 $2')
      .trim()
  )
}

/** Tira ruído e artigos, e devolve as palavras que sobraram. */
function palavras(n: string): string[] {
  return n.split(' ').filter((p) => p && !RUIDO.has(p) && !ARTIGOS.has(p))
}

/**
 * As duas leituras de um caminho: só o arquivo, e a pasta-pai mais o arquivo.
 *
 * São duas porque a pasta tanto pode ser a pista que falta (`Copas/04.jpg`)
 * quanto puro estorvo — em baralho baixado a pasta costuma ser a resolução
 * (`720px/`, `full/`), e aí misturá-la sempre transforma `00_Fool.jpg` em
 * "720 px 00 fool", que não casa com nada. O arquivo sozinho vem primeiro; a
 * pasta só entra se ele não bastar.
 */
function leituras(caminho: string): [string, string] {
  const partes = caminho.split(/[\\/]+/).filter(Boolean)
  const arquivo = partes[partes.length - 1] ?? ''
  const pasta = partes.length > 1 ? partes[partes.length - 2] : ''
  return [normalizar(arquivo), normalizar(`${pasta} ${arquivo}`)]
}

/** Índice de apelido exato -> cardId, montado uma vez. */
const ALIAS: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>()
  const por = (chave: string, id: string) => {
    const k = normalizar(chave)
    // Quem chegou primeiro manda: o nome canônico é registrado antes dos
    // apelidos, então um apelido ambíguo nunca rouba uma carta.
    if (k && !m.has(k)) m.set(k, id)
    // E também SEM os artigos, porque é assim que a consulta chega: o nome do
    // arquivo passa por `palavras()` antes de procurar aqui. Sem esta segunda
    // forma, `10_Wheel_of_Fortune` viraria a consulta `wheel fortune` e não
    // acharia a chave `wheel of fortune`.
    const s = palavras(k).join(' ')
    if (s && !m.has(s)) m.set(s, id)
  }

  for (const c of CARDS) {
    por(c.nome, c.id)
    // O mesmo nome sem o artigo — "louco" além de "o louco".
    por(palavras(normalizar(c.nome)).join(' '), c.id)
  }
  for (const [num, lista] of Object.entries(APELIDOS_MAIOR)) {
    for (const a of lista) por(a, `maior-${num}`)
  }
  // Numeração dos arcanos maiores por algarismo romano e por número.
  for (const [rom, num] of ROMANOS) {
    por(rom, `maior-${num}`)
    por(`arcano ${rom}`, `maior-${num}`)
  }
  // As formas numeradas do arcano maior. Em quatro palavras porque baralhos
  // baixados usam todas, e nas DUAS grafias do número: `major_00.jpg` é comum,
  // e sem a forma com zero à esquerda os 22 maiores de um baralho inteiro
  // caem na bandeja enquanto os 56 menores casam — que é exatamente o que
  // acontecia.
  for (let n = 0; n <= 21; n++) {
    for (const palavra of ['maior', 'major', 'arcano', 'trump']) {
      por(`${palavra} ${n}`, `maior-${n}`)
      por(`${palavra} ${String(n).padStart(2, '0')}`, `maior-${n}`)
    }
  }
  return m
})()

/** Bigramas de uma string, como multiconjunto. */
function bigramas(s: string): string[] {
  const t = s.replace(/ /g, '')
  const out: string[] = []
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2))
  return out
}

/** Coeficiente de Dice sobre multiconjunto de bigramas: 0 a 1. */
function dice(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const conta = new Map<string, number>()
  for (const g of a) conta.set(g, (conta.get(g) ?? 0) + 1)
  let comuns = 0
  for (const g of b) {
    const n = conta.get(g) ?? 0
    if (n > 0) {
      comuns++
      conta.set(g, n - 1)
    }
  }
  return (2 * comuns) / (a.length + b.length)
}

/**
 * Chaves canônicas para a comparação por semelhança. Dice é O(n) por par e são
 * 78 pares por arquivo — num lote de 78 arquivos dá ~6 mil comparações de
 * strings curtas, que roda numa fração de quadro. Não vale índice invertido.
 */
const CANONICAS: readonly { id: string; grams: string[] }[] = CARDS.map((c) => ({
  id: c.id,
  grams: bigramas(palavras(normalizar(c.nome)).join(' ')),
}))

/** Abaixo disto nem palpite vira. */
const PISO_PALPITE = 0.45

export function casarArquivo(caminho: string): { alvo: Alvo | null; exato: boolean; palpites: Alvo[] } {
  const [so, comPasta] = leituras(caminho)
  // Os três portões exatos rodam primeiro sobre o arquivo sozinho; se ele não
  // decidir, rodam de novo com a pasta junto.
  const exato = exatos(so) ?? (comPasta !== so ? exatos(comPasta) : null)
  if (exato) return { alvo: exato, exato: true, palpites: [] }

  // Semelhança: nunca vira casamento sozinho. Prefere o arquivo puro, porque a
  // pasta só adiciona bigramas que não são da carta.
  const palpites = parecidas(so)
  return { alvo: null, exato: false, palpites: palpites.length ? palpites : parecidas(comPasta) }
}

/** Os três portões de confiança alta. Devolve o alvo, ou null. */
function exatos(bruto: string): Alvo | null {
  const ps = palavras(bruto)
  if (!ps.length) return null

  // ── 1. o verso: a marca, e nada de relevante sobrando ────────────────
  const semVerso = ps.filter((p) => !MARCA_VERSO.has(p))
  if (semVerso.length < ps.length && semVerso.every((p) => /^\d+$/.test(p))) return 'verso'

  // ── 2. estrutural: naipe + valor ─────────────────────────────────────
  let naipe: string | null = null
  let rank: number | null = null
  for (const p of ps) {
    const n = NAIPES.get(p)
    if (n && !naipe) naipe = n
    const r = RANKS.get(p)
    if (r && rank === null) rank = r
  }
  if (naipe && rank === null) {
    // Número solto junto do naipe: `Copas/04.jpg`. Só 1..14 conta.
    for (const p of ps) {
      if (!/^\d{1,2}$/.test(p)) continue
      const v = Number(p)
      if (v >= 1 && v <= 14) {
        rank = v
        break
      }
    }
  }
  if (naipe && rank !== null) return `${naipe}-${rank}`

  // ── 3. apelido exato ─────────────────────────────────────────────────
  const limpo = ps.join(' ')
  const direto = ALIAS.get(limpo) ?? ALIAS.get(bruto)
  if (direto) return direto

  // Prefixos de ordenação e de nome de baralho: `01-o-louco`, `13 a morte`,
  // `RWS_Tarot_00_Fool`. Tenta os SUFIXOS, do mais longo para o mais curto —
  // `rws 00 fool` não é apelido de nada, mas `fool` é.
  //
  // São sufixos e não qualquer subconjunto de propósito: o nome da carta vem no
  // fim do arquivo, e varrer subconjuntos abriria a porta para casar por uma
  // palavra solta no meio de um nome que não é de carta nenhuma.
  // Quem se declara verso não vira carta por sufixo. Sem isto, `verso_lua.jpg`
  // casava EXATO com A Lua — e ainda tomava o alvo do arquivo verdadeiro dela,
  // que caía na bandeja sem palpite nenhum.
  if (ps.some((p) => MARCA_VERSO.has(p))) return null

  for (let i = 1; i < ps.length; i++) {
    const sufixo = ps.slice(i).join(' ')

    // Sufixo que é só numeração não é evidência: `parte i.jpg` virava O Mago e
    // `pagina x.jpg` virava a Roda da Fortuna. Um nome que SEJA o algarismo
    // (`XIII.png`) continua casando pela busca direta acima, onde a intenção é
    // clara porque o arquivo inteiro é o número.
    if (/^[ivx]+$/.test(sufixo) || /^\d+$/.test(sufixo)) continue

    // Naipe sozinho também não: o índice guarda `copas` -> `copas-1` (porque
    // "Ás de Copas" sem artigos vira só "copas"), então `Princesa de Copas.jpg`
    // casava com o Ás. Um naipe tem catorze candidatas — isso é palpite, não
    // certeza.
    if (NAIPES.has(sufixo)) continue

    // Sufixo de UMA palavra só vale quando o que foi descartado é numeração de
    // ordenação. `rws 00 fool` passa (tem o `00`); `logo estrela` não — senão
    // qualquer imagem solta na pasta do baralho (`textura_sol`, `moldura_torre`)
    // vira carta, porque nome de arcano maior é palavra corrente em português.
    if (!sufixo.includes(' ') && !ps.slice(0, i).some((t) => /\d/.test(t))) continue

    const resto = ALIAS.get(sufixo)
    if (resto) return resto
  }

  return null
}

/** Portão 4: semelhança por bigramas. Só produz SUGESTÃO, nunca casamento. */
function parecidas(bruto: string): Alvo[] {
  const ps = palavras(bruto)
  if (!ps.length) return []
  const meus = bigramas(ps.join(' '))
  return CANONICAS.map((c) => ({ id: c.id, nota: dice(meus, c.grams) }))
    .filter((x) => x.nota >= PISO_PALPITE)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, 3)
    .map((n) => n.id)
}

/**
 * Uma passada sobre o lote inteiro. Um alvo recebe UM arquivo: quem casa
 * primeiro fica com a carta e o resto vai para a bandeja, para a pessoa
 * resolver na grade. O lote é ordenado por caminho antes, de modo que rodar as
 * mesmas imagens duas vezes produza exatamente o mesmo tema.
 */
export function casarLote(arquivos: { caminho: string; rotulo: string }[]): ItemImportado[] {
  const ordenados = [...arquivos].sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'))
  const tomados = new Set<Alvo>()

  return ordenados.map((a, i) => {
    const { alvo, exato, palpites } = casarArquivo(a.caminho)
    const livre = alvo !== null && !tomados.has(alvo)
    if (livre && alvo) tomados.add(alvo)
    return {
      id: `i-${i}`,
      caminho: a.caminho,
      rotulo: a.rotulo,
      // Perdeu a disputa pelo alvo: vai para a bandeja em vez de sobrescrever.
      estado: livre && exato ? 'casado' : palpites.length ? 'sugerido' : 'solto',
      alvo: livre && exato ? alvo : null,
      palpites: livre && exato ? [] : palpites,
    }
  })
}
