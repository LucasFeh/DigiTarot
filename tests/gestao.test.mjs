import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registrosGestao, resumoGestao } from '../src/lib/gestao.ts'

const rodrigo = { uid: 'uid-rodrigo', email: 'rodriv.l680@gmail.com', admin: true }
const luna = { uid: 'uid-luna', email: 'luna@example.com', admin: false }
const agendamento = (id, tarologoUid, preco, status = 'confirmado') => ({
  id, tarologoUid, tarologoNome: tarologoUid, clienteNome: id,
  planoTitulo: 'Leitura', categoriaTitulo: 'Tarot', preco, status,
  data: '2026-09-29', hora: '16:00', codigo: id,
})
const convite = (token, tarologoUid, tarologoPerfilId, preco, status = 'confirmado') => ({
  token, tarologoUid, tarologoPerfilId, tarologoNome: token,
  convidadoNome: token, titulo: 'Sessão combinada', preco, status, codigo: token,
  criadoEm: '2026-09-20T12:00:00.000Z', confirmadoEm: '2026-09-29T12:00:00.000Z',
})

test('faturamento soma agendamento e sessão particular confirmados pelo valor combinado', () => {
  const registros = registrosGestao(
    [agendamento('agenda-rodrigo', rodrigo.email, 90), agendamento('agenda-luna', luna.email, 35)],
    [convite('particular-rodrigo', rodrigo.uid, rodrigo.email, 180), convite('particular-luna', luna.uid, luna.email, 75)],
    rodrigo,
  )
  const { semana, totais } = resumoGestao(registros, '2026-09-28', '2026-10-04')
  assert.equal(semana.length, 4)
  assert.equal(totais.valor, 380)
  assert.equal(totais.confirmados, 4)
  assert.equal(totais.particularesConfirmadas, 2)
  assert.equal(totais.valorParticulares, 255)
  assert.equal(registros.find((item) => item.id === 'particular:particular-luna')?.tarologoPerfilId, luna.email)
})

test('tarólogo só vê seus registros e não conta pagamento informado como faturamento', () => {
  const registros = registrosGestao(
    [agendamento('do-rodrigo', rodrigo.email, 90), agendamento('da-luna', luna.email, 35)],
    [convite('do-rodrigo', rodrigo.uid, rodrigo.email, 180), convite('da-luna', luna.uid, luna.email, 75), convite('a-conferir', luna.uid, luna.email, 50, 'pago')],
    luna,
  )
  const { totais } = resumoGestao(registros, '2026-09-28', '2026-10-04')
  assert.equal(registros.length, 3)
  assert.equal(totais.valor, 110)
  assert.equal(totais.pagosInformados, 0)
  // O convite ainda em conferência fica na semana em que foi criado.
  const semanaCriacao = resumoGestao(registros, '2026-09-14', '2026-09-20')
  assert.equal(semanaCriacao.totais.pagosInformados, 1)
  assert.equal(semanaCriacao.totais.valor, 0)
})

test('convites antigos sem data de confirmação usam a data de criação até a migração', () => {
  const antigo = convite('antigo', rodrigo.uid, undefined, 120)
  delete antigo.confirmadoEm
  const registros = registrosGestao([], [antigo], rodrigo)
  assert.equal(registros[0].tarologoPerfilId, rodrigo.email)
  assert.equal(resumoGestao(registros, '2026-09-14', '2026-09-20').totais.valor, 120)
})
