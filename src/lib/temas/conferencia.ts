import { CARDS } from '../../data/cards'
import type {
  AcaoConferencia,
  Alvo,
  Conferencia,
  EntradaTema,
  ImagemGuardada,
  ItemImportado,
  TipoTema,
} from './tipos'
import type { Usuario } from '../backend'

/**
 * O estado da tela de conferência, como reducer puro. Só mexe com ids — nenhum
 * `File` e nenhum `Blob` entram aqui, o que deixa o comportamento inteiro
 * testável sem navegador.
 */

/** A ordem canônica dos alvos: as 78 cartas e o verso no fim. */
export const ALVOS: readonly Alvo[] = [...CARDS.map((c) => c.id), 'verso']

export function iniciarConferencia(itens: ItemImportado[]): Conferencia {
  const porAlvo = new Map<Alvo, string>()
  for (const i of itens) if (i.alvo) porAlvo.set(i.alvo, i.id)
  return { itens, porAlvo }
}

/** Fotografia para um passo de desfazer. Mais que um passo é infraestrutura
 *  para um clique que quase ninguém dá. */
function guardar(c: Conferencia): Conferencia['anterior'] {
  return { itens: c.itens.map((i) => ({ ...i })), porAlvo: new Map(c.porAlvo) }
}

export function reduzir(c: Conferencia, a: AcaoConferencia): Conferencia {
  switch (a.tipo) {
    case 'atribuir': {
      // Sem bytes não há carta. Um item ilegível virava 'casado', entrava na
      // conta de "no lugar" e depois era descartado em silêncio por
      // `montarEntrada` — a pessoa salvava um tema com buracos sem saber.
      if (c.itens.find((i) => i.id === a.itemId)?.estado === 'ilegivel') return c
      const anterior = guardar(c)
      const porAlvo = new Map(c.porAlvo)
      // Um alvo, um item: quem estava ali volta para a bandeja em vez de
      // sumir. Sem isto, arrastar por cima apagaria a imagem anterior sem
      // aviso e a pessoa só descobriria na mesa.
      const antigo = porAlvo.get(a.alvo)
      porAlvo.set(a.alvo, a.itemId)

      const itens = c.itens.map((i) => {
        if (i.id === a.itemId) {
          // Se este item já ocupava outro alvo, libera o de lá.
          if (i.alvo && i.alvo !== a.alvo) porAlvo.delete(i.alvo)
          return { ...i, estado: 'casado' as const, alvo: a.alvo, palpites: [] }
        }
        if (i.id === antigo && antigo !== a.itemId) {
          return { ...i, estado: 'solto' as const, alvo: null }
        }
        return i
      })
      return { itens, porAlvo, anterior }
    }

    case 'desatribuir': {
      const alvo = c.itens.find((i) => i.id === a.itemId)?.alvo
      if (!alvo) return c
      const anterior = guardar(c)
      const porAlvo = new Map(c.porAlvo)
      porAlvo.delete(alvo)
      return {
        itens: c.itens.map((i) => (i.id === a.itemId ? { ...i, estado: 'solto', alvo: null } : i)),
        porAlvo,
        anterior,
      }
    }

    case 'aceitarTodas': {
      const anterior = guardar(c)
      const porAlvo = new Map(c.porAlvo)
      const itens = c.itens.map((i) => {
        if (i.estado !== 'sugerido') return i
        // Só aceita o palpite se o alvo ainda estiver livre: aceitar em lote
        // não pode desalojar quem já casou por certeza.
        const livre = i.palpites.find((p) => !porAlvo.has(p))
        if (!livre) return i
        porAlvo.set(livre, i.id)
        return { ...i, estado: 'casado' as const, alvo: livre, palpites: [] }
      })
      return { itens, porAlvo, anterior }
    }

    case 'desfazer': {
      if (!c.anterior) return c
      return { itens: c.anterior.itens, porAlvo: c.anterior.porAlvo }
    }
  }
}

export function resumo(c: Conferencia) {
  let casadas = 0
  let aConfirmar = 0
  let soltas = 0
  let ilegiveis = 0
  for (const i of c.itens) {
    if (i.estado === 'casado') casadas++
    else if (i.estado === 'sugerido') aConfirmar++
    else if (i.estado === 'ilegivel') ilegiveis++
    else soltas++
  }
  return { casadas, aConfirmar, soltas, ilegiveis }
}

/**
 * Atribui os itens, na ordem em que vieram, aos alvos ainda livres na ordem
 * canônica. É o conserto de um clique para baralhos cujos arquivos são só
 * números (`00.jpg`…`77.jpg`), onde não há nome nenhum para casar — a pessoa
 * confere o resultado na grade, que é onde dá para ver se ficou certo.
 */
export function aplicarOrdemCanonica(c: Conferencia): Conferencia {
  const anterior = guardar(c)
  const porAlvo = new Map(c.porAlvo)
  // O verso não entra: numa sequência numerada ele não existe, e ocupá-lo com
  // a última carta seria errado em silêncio.
  const livres = ALVOS.filter((a) => a !== 'verso' && !porAlvo.has(a))
  let n = 0

  const itens = c.itens.map((i) => {
    if (i.estado === 'casado' || i.estado === 'ilegivel') return i
    const alvo = livres[n]
    if (!alvo) return i
    n++
    porAlvo.set(alvo, i.id)
    return { ...i, estado: 'casado' as const, alvo, palpites: [] }
  })
  return { itens, porAlvo, anterior }
}

/**
 * Monta o que vai para o repositório. Só entram itens casados e que tenham
 * imagem pronta — um item sem `cheia` é um arquivo que falhou no processamento
 * e não pode virar carta em branco na mesa.
 */
export function montarEntrada(
  c: Conferencia,
  tipo: TipoTema,
  nome: string,
  autor: Usuario,
  cor?: string,
): EntradaTema {
  const imagens = new Map<string, Omit<ImagemGuardada, 'id'>>()
  let capa: Omit<ImagemGuardada, 'id'> | undefined

  // Um pano é UMA imagem, chaveada em 'fundo' — e 'fundo' não é carta, logo
  // não está em ALVOS. Varrer ALVOS para um pano não achava nada, o tema saía
  // sem imagem nenhuma e era recusado no salvamento: não existia caminho para
  // criar um tema de pano.
  const chaves: readonly Alvo[] = tipo === 'pano' ? ['fundo'] : ALVOS

  // Na ordem canônica, para a miniatura do tema ser sempre a mesma carta
  // (a primeira que ele cobre) e não depender da ordem de envio.
  for (const alvo of chaves) {
    const id = c.porAlvo.get(alvo)
    if (!id) continue
    const item = c.itens.find((i) => i.id === id)
    if (!item?.cheia) continue
    imagens.set(alvo, item.cheia)
    if (!capa && item.mini) capa = item.mini
  }
  if (capa) imagens.set('mini', capa)

  return { tipo, nome, autor, imagens, cor }
}
