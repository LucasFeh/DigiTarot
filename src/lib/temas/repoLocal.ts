import { avisarTemas } from './canal'
import { blobEmbutido, EMBUTIDOS, EMBUTIDO_POR_ID } from './embutidos'
import { abrirDb, faixaDoTema, fim, pedirPersistencia, promessa, refImagem } from './db'
import type { Aba, ChaveArte, EntradaTema, RepositorioTemas, Tema, TipoTema } from './tipos'

/** Quantos temas uma aba devolve por padrão. */
const LIMITE = 60

function novoId() {
  return `t-${Date.now().toString(36)}-${Math.floor(Math.random() * 1679616).toString(36)}`
}

/**
 * Acervo de temas guardado no próprio navegador. O documento do tema (nome,
 * autor, quais cartas cobre) fica no store `temas`; os bytes de cada imagem
 * ficam em `imagens`, com a chave `${temaId}|${chave}`.
 *
 * Essa chave composta é a decisão que carrega o resto: apagar um tema é um
 * delete por faixa, e não existe índice paralelo de imagens que possa divergir
 * do que está realmente guardado.
 *
 * "Comunidade" aqui são os temas deste navegador — é o que dá para fazer sem
 * servidor. A interface é a mesma que o repositório do Firestore vai
 * implementar depois, então as telas não mudam quando isso virar de verdade.
 */
export class RepoLocal implements RepositorioTemas {
  readonly modo = 'local' as const

  async listar({
    tipo,
    aba,
    uid,
    limite = LIMITE,
  }: {
    tipo: TipoTema
    aba: Aba
    uid: string | null
    limite?: number
  }): Promise<Tema[]> {
    // Sem usuário só a comunidade responde: as outras duas abas são "meus" e
    // "os que eu salvei", e nenhuma das duas existe para quem não entrou.
    if (!uid && aba !== 'comunidade') return []
    const db = await abrirDb()

    // Os embutidos aparecem na comunidade (são de todo mundo) e nos favoritos
    // de quem os salvou. Nunca em "meus temas": ninguém os criou.
    const embutidos = EMBUTIDOS.filter((t) => t.tipo === tipo)

    if (aba === 'favoritos') {
      // Duas transações de propósito, e não uma só com dois stores: uma
      // transação do IndexedDB fica INATIVA assim que o controle volta ao laço
      // de eventos, e encadear `await` dentro dela é o erro clássico que passa
      // no Chrome e lança InvalidStateError no Safari.
      const ids = await promessa<{ uid: string; temaId: string }[]>(
        db
          .transaction('favoritos', 'readonly')
          .objectStore('favoritos')
          .index('porUid')
          .getAll(IDBKeyRange.only(uid)),
      )
      if (!ids.length) return []
      const soEmbutidos = ids.every((f) => EMBUTIDO_POR_ID.has(f.temaId))
      if (soEmbutidos) return embutidos.filter((t) => ids.some((f) => f.temaId === t.id)).slice(0, limite)

      const tx = db.transaction('temas', 'readonly')
      const store = tx.objectStore('temas')
      // Todos os `get` saem na MESMA volta, antes de qualquer await.
      const docs = await Promise.all(ids.map((f) => promessa<Tema | undefined>(store.get(f.temaId))))
      // Um favorito pode apontar para um tema que já foi apagado noutra aba.
      const meus = ordenar(docs.filter((t): t is Tema => t !== undefined && t.tipo === tipo))
      const embFav = embutidos.filter((t) => ids.some((f) => f.temaId === t.id))
      return [...embFav, ...meus].slice(0, limite)
    }

    const tx = db.transaction('temas', 'readonly')
    const store = tx.objectStore('temas')

    if (aba === 'pessoais') {
      const docs = await promessa<Tema[]>(
        store.index('porTipoAutor').getAll(IDBKeyRange.only([tipo, uid])),
      )
      return ordenar(docs).slice(0, limite)
    }

    // Comunidade: todos do tipo, do mais novo para o mais velho. A faixa é
    // aberta na segunda coluna do índice porque a data é uma string ISO.
    const docs = await promessa<Tema[]>(
      store.index('porTipoData').getAll(IDBKeyRange.bound([tipo, ''], [tipo, '￿'])),
    )
    // Embutidos primeiro: com o acervo vazio, é o que a pessoa vê — e é o que
    // faz a mesa ter arte de verdade sem ninguém precisar criar nada.
    return [...embutidos, ...ordenar(docs)].slice(0, limite)
  }

  async obter(id: string): Promise<Tema | null> {
    const embutido = EMBUTIDO_POR_ID.get(id)
    if (embutido) return embutido
    const db = await abrirDb()
    const doc = await promessa<Tema | undefined>(db.transaction('temas', 'readonly').objectStore('temas').get(id))
    return doc ?? null
  }

  async salvar(e: EntradaTema): Promise<Tema> {
    const db = await abrirDb()
    const id = novoId()

    // Primeiro os BYTES, numa transação só. Se a cota estourar, ela aborta
    // inteira e o documento nunca chega a existir — não nasce tema quebrado
    // apontando para imagens que não foram gravadas.
    const txImg = db.transaction('imagens', 'readwrite')
    const lojaImg = txImg.objectStore('imagens')
    let bytes = 0
    for (const [chave, img] of e.imagens) {
      bytes += img.bytes
      lojaImg.put({ ...img, id: refImagem(id, chave) })
    }
    await fim(txImg)

    const base = {
      id,
      nome: e.nome.trim().slice(0, 40),
      autorUid: e.autor.uid,
      autorNome: e.autor.nome,
      criadoEm: new Date().toISOString(),
      bytes,
    }
    const doc: Tema =
      e.tipo === 'baralho'
        ? {
            ...base,
            tipo: 'baralho',
            // `mini` e `verso` são arte do tema, não cartas do baralho.
            cartas: [...e.imagens.keys()].filter((k) => k !== 'mini' && k !== 'verso'),
            temVerso: e.imagens.has('verso'),
          }
        : { ...base, tipo: 'pano', cor: e.cor ?? '#2a1050' }

    const txDoc = db.transaction('temas', 'readwrite')
    txDoc.objectStore('temas').put(doc)
    await fim(txDoc)

    avisarTemas()
    // Só agora: na carga da página este pedido é negado sem perguntar.
    void pedirPersistencia()
    return doc
  }

  async apagar(id: string, uid: string): Promise<void> {
    if (EMBUTIDO_POR_ID.has(id)) throw new Error('Temas que vêm com o site não podem ser apagados.')
    const db = await abrirDb()
    const doc = await this.obter(id)
    if (!doc) return
    // Sem dono, sem apagar. No modo local isso é boa-fé; no Firestore a mesma
    // condição vira regra de segurança.
    if (doc.autorUid !== uid) throw new Error('Só quem criou o tema pode apagá-lo.')

    // Ordem INVERSA da gravação: o documento sai primeiro. Se a limpeza dos
    // bytes falhar no meio, sobra lixo invisível — e não um tema listado cujas
    // imagens já não existem.
    const tx = db.transaction(['temas', 'imagens', 'favoritos'], 'readwrite')
    tx.objectStore('temas').delete(id)
    tx.objectStore('imagens').delete(faixaDoTema(id))

    const favs = tx.objectStore('favoritos')
    await new Promise<void>((resolve, reject) => {
      const req = favs.openCursor()
      req.onsuccess = () => {
        const cur = req.result
        if (!cur) {
          resolve()
          return
        }
        if ((cur.value as { temaId: string }).temaId === id) cur.delete()
        cur.continue()
      }
      req.onerror = () => reject(req.error)
    })

    await fim(tx)
    avisarTemas(id)
  }

  async imagem(temaId: string, chave: ChaveArte): Promise<Blob | null> {
    const embutido = EMBUTIDO_POR_ID.get(temaId)
    // Tema que vem com o site: arquivo estático (baralho) ou SVG gerado
    // (pano). Nos dois casos não há nada no IndexedDB para procurar.
    if (embutido) return blobEmbutido(embutido, chave)
    const db = await abrirDb()
    const reg = await promessa<{ blob: Blob } | undefined>(
      db.transaction('imagens', 'readonly').objectStore('imagens').get(refImagem(temaId, chave)),
    )
    return reg?.blob ?? null
  }

  async favoritos(uid: string): Promise<ReadonlySet<string>> {
    const db = await abrirDb()
    const linhas = await promessa<{ temaId: string }[]>(
      db.transaction('favoritos', 'readonly').objectStore('favoritos').index('porUid').getAll(IDBKeyRange.only(uid)),
    )
    return new Set(linhas.map((l) => l.temaId))
  }

  async favoritar(uid: string, temaId: string, on: boolean): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction('favoritos', 'readwrite')
    const loja = tx.objectStore('favoritos')
    if (on) loja.put({ uid, temaId, em: new Date().toISOString() })
    else loja.delete([uid, temaId])
    await fim(tx)
    avisarTemas()
  }
}

/** Mais novo primeiro. A data é ISO, então comparar string basta. */
function ordenar(ts: Tema[]): Tema[] {
  return [...ts].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0))
}
