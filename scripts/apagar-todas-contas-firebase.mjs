/**
 * Limpeza administrativa do Firebase Authentication.
 * Primeiro execute apenas com --projeto para conferir a contagem. A exclusão
 * exige --apagar, a contagem exata e a frase de confirmação do projeto.
 * O arquivo de credenciais fica em .firebase-admin/ (ignorado pelo Git).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const pastaPrivada = join(raiz, '.firebase-admin')
const caminhoCredenciais = join(pastaPrivada, 'credenciais.json')
const args = process.argv.slice(2)
const valor = (nome) => args[args.indexOf(nome) + 1]

if (args.includes('--ajuda') || !args.includes('--projeto')) {
  console.log('Uso: node scripts/apagar-todas-contas-firebase.mjs --projeto ID_DO_PROJETO')
  console.log('Exclusão: acrescente --apagar --esperado QUANTIDADE --confirmar APAGAR-TODAS-ID_DO_PROJETO')
  process.exit(args.includes('--ajuda') ? 0 : 1)
}

const projeto = valor('--projeto')
if (!projeto || projeto.startsWith('--')) throw new Error('Informe o ID exato do projeto Firebase.')
if (!existsSync(caminhoCredenciais)) {
  throw new Error('Coloque a chave de serviço em .firebase-admin/credenciais.json. Nunca a envie por chat nem ao GitHub.')
}

const credenciais = JSON.parse(readFileSync(caminhoCredenciais, 'utf8'))
if (credenciais.project_id !== projeto) {
  throw new Error('O ID informado não corresponde ao projeto da chave de serviço. Nenhuma conta foi apagada.')
}

const auth = getAuth(initializeApp({ credential: cert(credenciais), projectId: projeto }))
const usuarios = []
let proximaPagina
do {
  const pagina = await auth.listUsers(1000, proximaPagina)
  usuarios.push(...pagina.users)
  proximaPagina = pagina.pageToken
} while (proximaPagina)

console.log(`Projeto: ${projeto}`)
console.log(`Contas no Authentication: ${usuarios.length}`)
console.log(`E-mails verificados: ${usuarios.filter((u) => u.emailVerified).length}`)
console.log(`Contas @peni.com: ${usuarios.filter((u) => u.email?.toLowerCase().endsWith('@peni.com')).length}`)

if (!args.includes('--apagar')) {
  console.log('Simulação concluída. Nenhuma conta foi apagada.')
  process.exit(0)
}

const esperado = Number(valor('--esperado'))
const confirmacao = valor('--confirmar')
if (!Number.isInteger(esperado) || esperado !== usuarios.length || confirmacao !== `APAGAR-TODAS-${projeto}`) {
  throw new Error('A quantidade ou a frase de confirmação não confere. Nenhuma conta foi apagada.')
}

mkdirSync(pastaPrivada, { recursive: true })
const inventario = join(pastaPrivada, `inventario-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(inventario, JSON.stringify(usuarios.map((u) => ({
  uid: u.uid,
  email: u.email ?? null,
  emailVerificado: u.emailVerified,
  criadoEm: u.metadata.creationTime,
})), null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
console.log(`Inventário de identificação salvo em ${inventario}. Ele não é um backup das senhas.`)

let apagadas = 0
const falhas = []
for (let i = 0; i < usuarios.length; i += 1000) {
  const lote = usuarios.slice(i, i + 1000)
  const resultado = await auth.deleteUsers(lote.map((u) => u.uid))
  apagadas += resultado.successCount
  for (const falha of resultado.errors) falhas.push(lote[falha.index].uid)
  console.log(`Lote ${Math.floor(i / 1000) + 1}: ${resultado.successCount} apagadas, ${resultado.failureCount} falhas.`)
}

console.log(`Resultado: ${apagadas} apagadas; ${falhas.length} falhas.`)
if (falhas.length) {
  console.error(`UIDs não apagados: ${falhas.join(', ')}`)
  process.exitCode = 1
}
