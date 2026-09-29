import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'

const ADMIN = 'rodriv.l680@gmail.com'
const PRO = 'pro@example.com'
const PIX = { chave: '1', nome: 'PROFISSIONAL', cidade: 'SAO PAULO' }
const TOKEN = randomBytes(16).toString('hex')
const PLANOS = [
  'avulsa-1', 'avulsa-2', 'avulsa-3', 'avulsa-5',
  'tema-amor', 'tema-complexa', 'tema-sentimentos', 'tema-futuro',
  'tema-trabalho', 'tema-financas', 'tema-espiritual', 'tema-auto', 'tema-caminhos',
  'tempo-express', 'tempo-completa', 'tempo-profunda', 'tempo-premium',
  'esp-cruz', 'esp-mandala', 'esp-ano', 'esp-mes', 'esp-3meses', 'esp-6meses', 'esp-proposito',
]
let env

const conta = (uid, email, email_verified = true) =>
  env.authenticatedContext(uid, { email, email_verified }).firestore()

const perfilPublico = (email = PRO) => ({
  uid: email, email, nome: 'Profissional', foto: '', personagem: '',
  cartaoPublicado: false, bio: '', avaliacao: { media: 5, total: 0 },
  modalidades: {}, ativo: true,
})

async function prepararProfissional() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'tarologos', PRO), perfilPublico())
    await setDoc(doc(ctx.firestore(), 'pixTarologos', PRO), PIX)
  })
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-digitarot-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
beforeEach(async () => env.clearFirestore())
after(async () => env?.cleanup())

test('somente o administrador com e-mail verificado cadastra tarólogo', async () => {
  const caminho = (db) => doc(db, 'tarologos', PRO)
  await assertFails(setDoc(caminho(env.unauthenticatedContext().firestore()), perfilPublico()))
  await assertFails(setDoc(caminho(conta('impostor', ADMIN, false)), perfilPublico()))
  await assertFails(setDoc(caminho(conta('pro-uid', PRO)), perfilPublico()))
  await assertSucceeds(setDoc(caminho(conta('admin-uid', ADMIN)), perfilPublico()))
  await assertFails(updateDoc(caminho(conta('admin-uid', ADMIN)), { modalidades: { 'avulsa-1': 35 } }))
  await assertSucceeds(updateDoc(caminho(conta('admin-uid', ADMIN)), { nome: 'Nome corrigido' }))
})

test('tarólogo altera próprios preços e Pix sem editar nome ou avaliações', async () => {
  await prepararProfissional()
  const pro = conta('pro-uid', PRO)
  const outro = conta('outro-uid', 'outro@example.com')
  await assertSucceeds(updateDoc(doc(pro, 'tarologos', PRO), { modalidades: { 'avulsa-1': 35 } }))
  await assertSucceeds(updateDoc(doc(pro, 'tarologos', PRO), { modalidades: Object.fromEntries(PLANOS.map((id) => [id, 50])) }))
  await assertFails(updateDoc(doc(pro, 'tarologos', PRO), { modalidades: { 'plano-inventado': 0.01 } }))
  await assertFails(updateDoc(doc(pro, 'tarologos', PRO), { avaliacao: { media: 5, total: 999 } }))
  await assertFails(updateDoc(doc(pro, 'tarologos', PRO), { nome: 'Outro nome' }))
  await assertFails(updateDoc(doc(outro, 'tarologos', PRO), { modalidades: { 'avulsa-1': 1 } }))
  await assertSucceeds(updateDoc(doc(pro, 'pixTarologos', PRO), { cidade: 'RECIFE' }))
  await assertFails(getDoc(doc(outro, 'pixTarologos', PRO)))
  await assertFails(getDocs(collection(outro, 'pixTarologos')))
})

test('tarólogo lista só os próprios atendimentos; apenas Rodrigo lista a equipe', async () => {
  await prepararProfissional()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'agendamentos', 'do-pro'), { clienteUid: 'alice', tarologoUid: PRO, preco: 35 })
    await setDoc(doc(ctx.firestore(), 'agendamentos', 'do-rodrigo'), { clienteUid: 'bob', tarologoUid: ADMIN, preco: 90 })
  })
  const pro = conta('pro-uid', PRO)
  const admin = conta('admin-uid', ADMIN)
  const cliente = conta('alice', 'alice@example.com')
  const propria = await assertSucceeds(getDocs(query(collection(pro, 'agendamentos'), where('tarologoUid', '==', PRO))))
  if (propria.size !== 1 || propria.docs[0].id !== 'do-pro') throw new Error('A consulta do profissional retornou dados de outra pessoa')
  await assertFails(getDocs(collection(pro, 'agendamentos')))
  await assertFails(getDocs(query(collection(pro, 'agendamentos'), where('tarologoUid', '==', ADMIN))))
  await assertFails(getDocs(collection(cliente, 'agendamentos')))
  const equipe = await assertSucceeds(getDocs(collection(admin, 'agendamentos')))
  if (equipe.size !== 2) throw new Error('Rodrigo não recebeu todos os atendimentos')
})

test('perfil privado rejeita acesso cruzado e campos extras', async () => {
  const alice = conta('alice', 'alice@example.com')
  const bob = conta('bob', 'bob@example.com')
  const ref = doc(alice, 'perfis', 'alice')
  await assertSucceeds(setDoc(ref, { nome: 'Alice', foto: '' }))
  await assertFails(getDoc(doc(bob, 'perfis', 'alice')))
  await assertFails(setDoc(doc(bob, 'perfis', 'alice'), { nome: 'Bob' }))
  await assertFails(updateDoc(ref, { papel: 'admin' }))
  await assertFails(updateDoc(ref, { foto: 'javascript:alert(1)' }))
  await assertSucceeds(updateDoc(ref, { contato: '+5511999999999' }))
  await assertSucceeds(updateDoc(ref, {
    foto: 'https://lh3.googleusercontent.com/a/teste',
    padrao: { baralhoId: null, panoId: 'lua' },
    configuracaoMesa: {
      cameraPosicao: { x: 31, y: 20 }, cameraTamanho: 34,
      chatLado: 'esquerda', painelLado: 'direita', barraLado: 'esquerda',
    },
  }))
})

test('convite é legível pelo link, mas preço e Pix ficam imutáveis', async () => {
  await prepararProfissional()
  const pro = conta('pro-uid', PRO)
  const anon = env.unauthenticatedContext().firestore()
  const convite = {
    token: TOKEN, tarologoUid: 'pro-uid', tarologoNome: 'Profissional',
    tarologoPerfilId: PRO,
    titulo: 'Leitura', descricao: '', preco: 50, pix: PIX,
    convidadoNome: '', status: 'aguardando', codigo: 'DIGI123', criadoEm: new Date().toISOString(),
  }
  await assertFails(setDoc(doc(pro, 'convites', 'curto'), { ...convite, token: 'curto' }))
  await assertFails(setDoc(doc(pro, 'convites', TOKEN), { ...convite, pix: { ...PIX, chave: 'outra' } }))
  await assertFails(setDoc(doc(pro, 'convites', TOKEN), { ...convite, tarologoPerfilId: 'outro@example.com' }))
  await assertSucceeds(setDoc(doc(pro, 'convites', TOKEN), convite))
  await assertSucceeds(getDoc(doc(anon, 'convites', TOKEN)))
  await assertFails(getDocs(collection(anon, 'convites')))
  const meus = await assertSucceeds(getDocs(query(collection(pro, 'convites'), where('tarologoUid', '==', 'pro-uid'))))
  if (meus.size !== 1) throw new Error('O profissional não recebeu o próprio convite')
  await assertFails(getDocs(collection(pro, 'convites')))
  const equipe = await assertSucceeds(getDocs(collection(conta('admin-uid', ADMIN), 'convites')))
  if (equipe.size !== 1) throw new Error('Rodrigo não recebeu o convite da equipe')
  await assertFails(updateDoc(doc(anon, 'convites', TOKEN), { preco: 1 }))
  await assertFails(updateDoc(doc(anon, 'convites', TOKEN), { pix: { ...PIX, chave: 'outra' } }))
  await assertSucceeds(updateDoc(doc(anon, 'convites', TOKEN), { convidadoNome: 'Convidado' }))
  await assertSucceeds(updateDoc(doc(anon, 'convites', TOKEN), { status: 'pago' }))
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'sessoes', 'mesa-convite'), { tarologoUid: 'pro-uid', conviteToken: TOKEN })
  })
  await assertFails(updateDoc(doc(pro, 'convites', TOKEN), { status: 'confirmado', sessaoId: 'mesa-convite', tarologoPerfilId: 'outro@example.com' }))
  await assertSucceeds(updateDoc(doc(pro, 'convites', TOKEN), { status: 'confirmado', sessaoId: 'mesa-convite', confirmadoEm: '2026-09-29T12:00:00.000Z' }))
})

test('cliente não pode falar como tarólogo no chat privado', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'sessoes', 'mesa'), {
      tarologoUid: 'pro-uid', clienteUid: 'alice', encerrada: false,
    })
  })
  const alice = conta('alice', 'alice@example.com')
  const pro = conta('pro-uid', PRO)
  const base = { nome: 'Pessoa', texto: 'Olá', em: new Date().toISOString() }
  await assertFails(setDoc(doc(alice, 'sessoes', 'mesa', 'mensagens', 'falsa'), { ...base, autor: 'tarologo' }))
  await assertSucceeds(setDoc(doc(alice, 'sessoes', 'mesa', 'mensagens', 'cliente'), { ...base, autor: 'cliente' }))
  await assertSucceeds(setDoc(doc(pro, 'sessoes', 'mesa', 'mensagens', 'profissional'), { ...base, autor: 'tarologo' }))
  await assertFails(getDocs(collection(conta('estranho', 'estranho@example.com'), 'sessoes', 'mesa', 'mensagens')))
})

test('vaga pública não expõe UID e reserva exige preço cadastrado', async () => {
  await prepararProfissional()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), 'tarologos', PRO), { modalidades: { 'avulsa-1': 35 } })
  })
  const alice = conta('alice', 'alice@example.com')
  const data = '2026-10-05'
  const hora = '16:00'
  const criar = (preco, id) => {
    const batch = writeBatch(alice)
    const horario = `${PRO}_${data}T${hora}`
    batch.set(doc(alice, 'horarios', horario), {
      tarologoUid: PRO, agendamentoId: id, criadoEm: new Date().toISOString(),
    })
    batch.set(doc(alice, 'agendamentos', id), {
      clienteUid: 'alice', clienteNome: 'Alice', clienteEmail: 'alice@example.com', contato: '+5511999999999',
      tarologoUid: PRO, tarologoNome: 'Profissional', planoId: 'avulsa-1', planoTitulo: 'Uma pergunta',
      categoriaTitulo: 'Perguntas', duracao: '', preco, data, hora, formato: 'digital',
      observacao: '', status: 'aguardando', codigo: id, criadoEm: new Date().toISOString(),
    })
    batch.set(doc(alice, 'pixAcessos', `${PRO}_alice`), {
      clienteUid: 'alice', tarologoUid: PRO, agendamentoId: id,
    })
    return batch.commit()
  }
  await assertFails(criar(1, 'reserva-ruim'))
  await assertSucceeds(criar(35, 'reserva-boa'))
  await assertSucceeds(getDoc(doc(alice, 'pixTarologos', PRO)))
  const slot = await assertSucceeds(getDoc(doc(alice, 'horarios', `${PRO}_${data}T${hora}`)))
  if ('uid' in slot.data()) throw new Error('A vaga pública ainda contém o UID do cliente')
  await assertFails(getDoc(doc(conta('bob', 'bob@example.com'), 'agendamentos', 'reserva-boa')))
  await assertFails(deleteDoc(doc(conta('bob', 'bob@example.com'), 'horarios', `${PRO}_${data}T${hora}`)))
  await assertSucceeds(updateDoc(doc(alice, 'agendamentos', 'reserva-boa'), { status: 'cancelado' }))
  await assertFails(getDoc(doc(alice, 'pixTarologos', PRO)))
})
