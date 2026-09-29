import type { Agendamento } from './backend'

export type FaturamentoMes = {
  chave: string
  valor: number
  atendimentos: number
}

export type HistoricoFaturamento = {
  meses: FaturamentoMes[]
  primeiro: FaturamentoMes | null
  atual: FaturamentoMes | null
  total: number
  registrosSemDataDeConfirmacao: number
}

function chaveMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

function mesDoAgendamento(atendimento: Agendamento): { chave: string; estimado: boolean } | null {
  // A confirmação marca quando o pagamento foi conferido, independentemente
  // do dia em que a consulta acontecerá.
  const confirmacao = atendimento.confirmadoEm ? new Date(atendimento.confirmadoEm) : null
  if (confirmacao && Number.isFinite(confirmacao.getTime())) {
    return { chave: chaveMes(confirmacao), estimado: false }
  }

  // Registros antigos e o modo local não têm confirmadoEm. A criação da
  // reserva é a melhor referência disponível; a interface informa a ressalva.
  const criacao = atendimento.criadoEm ? new Date(atendimento.criadoEm) : null
  if (criacao && Number.isFinite(criacao.getTime())) {
    return { chave: chaveMes(criacao), estimado: true }
  }
  if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(atendimento.data)) {
    return { chave: atendimento.data.slice(0, 7), estimado: true }
  }
  return null
}

export function calcularFaturamento(agendamentos: Agendamento[], hoje = new Date()): HistoricoFaturamento {
  const mesAtual = chaveMes(hoje)
  const mapa = new Map<string, FaturamentoMes>()
  let registrosSemDataDeConfirmacao = 0

  for (const atendimento of agendamentos) {
    if (atendimento.status !== 'confirmado' || !Number.isFinite(atendimento.preco) || atendimento.preco <= 0) continue
    const referencia = mesDoAgendamento(atendimento)
    if (!referencia || referencia.chave > mesAtual) continue
    const mes = mapa.get(referencia.chave) ?? { chave: referencia.chave, valor: 0, atendimentos: 0 }
    mes.valor += atendimento.preco
    mes.atendimentos += 1
    mapa.set(referencia.chave, mes)
    if (referencia.estimado) registrosSemDataDeConfirmacao += 1
  }

  const primeiraChave = [...mapa.keys()].sort()[0]
  if (!primeiraChave) return { meses: [], primeiro: null, atual: null, total: 0, registrosSemDataDeConfirmacao }

  const [ano, mes] = primeiraChave.split('-').map(Number)
  const cursor = new Date(ano, mes - 1, 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const meses: FaturamentoMes[] = []
  while (cursor <= fim) {
    const chave = chaveMes(cursor)
    meses.push(mapa.get(chave) ?? { chave, valor: 0, atendimentos: 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return {
    meses,
    primeiro: meses[0],
    atual: meses[meses.length - 1],
    total: meses.reduce((soma, item) => soma + item.valor, 0),
    registrosSemDataDeConfirmacao,
  }
}
