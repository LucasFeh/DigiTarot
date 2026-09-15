import type { ChaveArte } from './tipos'

/**
 * Abertura do IndexedDB dos temas e os poucos helpers de promessa que o resto
 * da camada usa.
 *
 * Por que IndexedDB e não o localStorage do LocalBackend: o backend guarda JSON
 * pequeno (a mesa), e a cota de localStorage é de ~5MB por origem. Um tema de
 * baralho são 78 imagens; só os bytes já passam disso muitas vezes, e
 * `JSON.stringify` de base64 ainda inflaria 33%. Imagem vai para IndexedDB, que
 * guarda `Blob` nativo, sem transcodificar.
 */

export const NOME_DB = 'tarot-temas'
export const VERSAO_DB = 1

/** Cota estourada. É o `onabort` da transação que a revela, não o `put`. */
export class ErroDeCota extends Error {
  constructor(mensagem = 'Não há espaço neste navegador para guardar mais temas.') {
    super(mensagem)
    this.name = 'ErroDeCota'
  }
}

/**
 * Chave de uma imagem. O tema faz parte da chave de propósito: apagar um tema
 * vira um delete por FAIXA, e não existe índice paralelo para divergir do que
 * está guardado.
 */
export function refImagem(temaId: string, chave: ChaveArte): string {
  return `${temaId}|${chave}`
}

/** Todas as imagens de um tema: de `id|` até `id|￿`. */
export function faixaDoTema(temaId: string): IDBKeyRange {
  return IDBKeyRange.bound(`${temaId}|`, `${temaId}|￿`)
}

let aberto: Promise<IDBDatabase> | null = null

export function abrirDb(): Promise<IDBDatabase> {
  if (aberto) return aberto
  aberto = new Promise<IDBDatabase>((resolve, reject) => {
    // Em navegador com dados de site bloqueados, só tocar em `indexedDB` já
    // lança — mesmo motivo do try/catch do LocalBackend.
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(NOME_DB, VERSAO_DB)
    } catch (e) {
      reject(e)
      return
    }

    req.onupgradeneeded = (ev) => {
      const db = req.result
      // `if (oldVersion < n)` em vez de switch com fall-through: o projeto liga
      // `noFallthroughCasesInSwitch`, e a forma encadeada roda igual vindo de
      // qualquer versão anterior.
      if (ev.oldVersion < 1) {
        const temas = db.createObjectStore('temas', { keyPath: 'id' })
        // Os dois índices existem para virar query do Firestore sem mudar tela.
        temas.createIndex('porTipoData', ['tipo', 'criadoEm'])
        temas.createIndex('porTipoAutor', ['tipo', 'autorUid'])

        db.createObjectStore('imagens', { keyPath: 'id' })

        const fav = db.createObjectStore('favoritos', { keyPath: ['uid', 'temaId'] })
        fav.createIndex('porUid', 'uid')
      }
    }

    req.onsuccess = () => {
      const db = req.result
      // Outra aba pediu upgrade: soltar a conexão, senão ela trava lá.
      db.onversionchange = () => {
        db.close()
        aberto = null
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('Banco de temas bloqueado por outra aba.'))
  }).catch((e) => {
    // Não guardar a promessa rejeitada: a próxima tentativa merece um open novo.
    aberto = null
    throw e
  })
  return aberto
}

export function promessa<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Espera o COMMIT, não o último `put`. É em `onabort` que a cota aparece — um
 * `put` individual resolve com sucesso e a transação inteira aborta depois.
 */
export function fim(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => {
      const err = tx.error
      reject(err?.name === 'QuotaExceededError' ? new ErroDeCota() : (err ?? new Error('Transação abortada.')))
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Pede ao navegador para não despejar o banco sob pressão de disco. Chamada UMA
 * vez, depois do primeiro tema salvo: na carga da página o Chrome nega sem
 * perguntar e o Firefox mostra um pedido de permissão do nada.
 */
let jaPediu = false
export async function pedirPersistencia(): Promise<void> {
  if (jaPediu) return
  jaPediu = true
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* sem suporte, ou negado: o banco segue, só sem garantia contra despejo */
  }
}
