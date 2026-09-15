/**
 * Confere, de fora, se o Firebase deste projeto está pronto para receber
 * cliente — e diz exatamente o que falta.
 *
 *     node scripts/verificar-firebase.mjs
 *
 * Existe porque metade dos passos da configuração são cliques num console que
 * não devolve recibo: você marca uma caixa, fecha a aba e fica sem saber se
 * pegou. O caso mais caro é o das regras do Firestore — publicadas ou não, uma
 * leitura sem login é negada dos dois jeitos, então o teste óbvio não distingue.
 * Aqui a diferença aparece: o script entra com um usuário descartável, tenta ler
 * o que as NOSSAS regras liberam, e apaga o usuário em seguida.
 *
 * Não escreve nada no banco e não toca em dado de ninguém.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Lê o `.env` sem depender de pacote nenhum. */
function lerEnv() {
  try {
    const texto = readFileSync(join(raiz, '.env'), 'utf8')
    const env = {}
    for (const linha of texto.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha)
      if (m) env[m[1]] = m[2].trim()
    }
    return env
  } catch {
    return {}
  }
}

const env = lerEnv()
const CHAVE = env.VITE_FIREBASE_API_KEY
const PROJETO = env.VITE_FIREBASE_PROJECT_ID

if (!CHAVE || !PROJETO) {
  console.error('Faltam VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID no .env.')
  process.exit(1)
}

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1'
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`

const post = async (caminho, corpo) => {
  const r = await fetch(`${IDENTITY}/${caminho}?key=${CHAVE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  return r.json()
}
const erroDe = (r) => r?.error?.message ?? ''

const linhas = []
let pendencias = 0
const anotar = (ok, titulo, detalhe) => {
  linhas.push({ ok, titulo, detalhe })
  if (!ok) pendencias++
}

// ------------------------------------------------------ e-mail e senha
{
  const r = await post('accounts:signUp', { email: 'sonda@invalido.invalid', password: 'x' })
  const e = erroDe(r)
  if (e.startsWith('CONFIGURATION_NOT_FOUND')) {
    anotar(false, 'Authentication', 'nunca foi ativado — Authentication › Get started')
  } else if (e.startsWith('OPERATION_NOT_ALLOWED')) {
    anotar(false, 'Entrar com e-mail e senha', 'provedor desligado — Sign-in method')
  } else {
    anotar(true, 'Entrar com e-mail e senha', 'habilitado')
  }
}

// ------------------------------------------------------------ telefone
{
  const r = await post('accounts:sendVerificationCode', { phoneNumber: '+5531900000000' })
  const e = erroDe(r)
  if (e.includes('BILLING_NOT_ENABLED')) {
    anotar(false, 'Entrar por SMS', 'exige o plano Blaze (opcional — o site funciona sem)')
  } else if (e.includes('region enabled')) {
    anotar(false, 'Entrar por SMS', 'região do Brasil bloqueada — Authentication › Settings › SMS region policy')
  } else if (e.startsWith('OPERATION_NOT_ALLOWED')) {
    anotar(false, 'Entrar por SMS', 'provedor Telefone desligado — Sign-in method')
  } else {
    anotar(true, 'Entrar por SMS', 'habilitado')
  }
}

// ----------------------------------------------------------- firestore
let bancoExiste = false
{
  const r = await fetch(`${FIRESTORE}/horarios?pageSize=1`).then((x) => x.json())
  const msg = r?.error?.message ?? ''
  if (msg.includes('has not been used') || msg.includes('does not exist')) {
    anotar(false, 'Banco Firestore', 'não foi criado — Firestore Database › Criar banco de dados')
  } else {
    bancoExiste = true
    anotar(true, 'Banco Firestore', 'criado')
  }
}

// ------------------------------------------------------------- regras
// O teste que importa: entra com um usuário descartável e tenta o que só as
// nossas regras permitem. Sem login, regra publicada e regra padrão devolvem
// a mesma negativa — é por isso que este passo precisa de uma conta.
if (bancoExiste) {
  const email = `verificacao.${Date.now().toString(36)}@exemplo-teste.invalid`
  const conta = await post('accounts:signUp', {
    email,
    password: 'verificacao-temporaria-123',
    returnSecureToken: true,
  })

  if (!conta.idToken) {
    anotar(false, 'Regras do Firestore', `não deu para testar (${erroDe(conta) || 'sem token'})`)
  } else {
    const cabecalho = { Authorization: `Bearer ${conta.idToken}` }

    const horarios = await fetch(`${FIRESTORE}/horarios?pageSize=1`, { headers: cabecalho }).then((x) => x.json())
    const podeLerHorarios = !horarios?.error

    const alheios = await fetch(`${FIRESTORE}/agendamentos?pageSize=1`, { headers: cabecalho }).then((x) => x.json())
    const podeLerAlheios = !alheios?.error

    if (!podeLerHorarios) {
      anotar(false, 'Regras do Firestore', 'ainda são as padrão (negar tudo) — cole firestore.rules e PUBLIQUE')
    } else if (podeLerAlheios) {
      anotar(false, 'Regras do Firestore', 'PERIGO: qualquer pessoa logada lê os agendamentos de todos')
    } else {
      anotar(true, 'Regras do Firestore', 'publicadas e funcionando')
    }

    // Some com o usuário de verificação, aconteça o que acontecer acima.
    await post('accounts:delete', { idToken: conta.idToken })
  }
}

// -------------------------------------------------------------- pix
{
  const temPix = Boolean(env.VITE_PIX_CHAVE)
  anotar(temPix, 'Chave Pix', temPix ? env.VITE_PIX_CHAVE : 'VITE_PIX_CHAVE vazia no .env')
}

// ------------------------------------------------------------ relatório
const VERDE = '\x1b[32m'
const VERMELHO = '\x1b[31m'
const CINZA = '\x1b[90m'
const FIM = '\x1b[0m'

console.log(`\n  Projeto: ${PROJETO}\n`)
for (const l of linhas) {
  const marca = l.ok ? `${VERDE}ok  ${FIM}` : `${VERMELHO}falta${FIM}`
  console.log(`  ${marca} ${l.titulo.padEnd(26)} ${CINZA}${l.detalhe}${FIM}`)
}

console.log(
  pendencias === 0
    ? `\n  ${VERDE}Tudo pronto.${FIM} O site pode receber cliente de verdade.\n`
    : `\n  ${VERMELHO}${pendencias} pendência(s).${FIM} O site só recebe consulta quando as regras estiverem publicadas.\n`,
)
