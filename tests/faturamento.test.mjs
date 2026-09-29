import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calcularFaturamento } from '../src/lib/faturamento.ts'

const hoje = new Date(2026, 8, 29)

function reserva(patch) {
  return {
    status: 'confirmado',
    preco: 35,
    data: '2026-10-10',
    criadoEm: '2026-02-01T15:00:00Z',
    ...patch,
  }
}

test('agrupa o valor confirmado pelo mês da confirmação, mesmo com consulta futura', () => {
  const historico = calcularFaturamento([
    reserva({ preco: 35, confirmadoEm: '2026-02-05T15:00:00Z' }),
    reserva({ preco: 65, confirmadoEm: '2026-02-06T15:00:00Z' }),
    reserva({ preco: 50, criadoEm: '2026-03-15T15:00:00Z' }),
    reserva({ preco: 90, confirmadoEm: '2026-09-01T15:00:00Z' }),
    reserva({ status: 'pago', preco: 999, confirmadoEm: '2026-09-10T15:00:00Z' }),
    reserva({ preco: 200, confirmadoEm: '2026-10-01T15:00:00Z' }),
  ], hoje)

  assert.deepEqual(historico.primeiro, { chave: '2026-02', valor: 100, atendimentos: 2 })
  assert.deepEqual(historico.atual, { chave: '2026-09', valor: 90, atendimentos: 1 })
  assert.equal(historico.total, 240)
  assert.equal(historico.meses.length, 8)
  assert.deepEqual(historico.meses[2], { chave: '2026-04', valor: 0, atendimentos: 0 })
  assert.equal(historico.registrosSemDataDeConfirmacao, 1)
})

test('não inventa faturamento quando não há pagamento confirmado', () => {
  const historico = calcularFaturamento([reserva({ status: 'aguardando' })], hoje)
  assert.deepEqual(historico.meses, [])
  assert.equal(historico.primeiro, null)
  assert.equal(historico.atual, null)
  assert.equal(historico.total, 0)
})
