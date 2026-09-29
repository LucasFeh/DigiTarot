import type { Agendamento, Convite, Usuario } from './backend/types'

export type RegistroGestao = {
  id: string
  origem: 'agenda' | 'particular'
  data: string
  hora: string
  clienteNome: string
  titulo: string
  tarologoNome: string
  tarologoPerfilId: string
  preco: number
  status: Agendamento['status']
  codigo: string
  atendidoEm?: string
}

function dataHora(iso: string): { data: string; hora: string } {
  const instante = new Date(iso)
  if (Number.isNaN(instante.getTime())) return { data: '', hora: '' }
  return {
    data: `${instante.getFullYear()}-${String(instante.getMonth() + 1).padStart(2, '0')}-${String(instante.getDate()).padStart(2, '0')}`,
    hora: `${String(instante.getHours()).padStart(2, '0')}:${String(instante.getMinutes()).padStart(2, '0')}`,
  }
}

/** O preço é o combinado na época da consulta, nunca o preço atual da carta. */
export function registrosGestao(agendamentos: Agendamento[], convites: Convite[], usuario: Pick<Usuario, 'uid' | 'email' | 'admin'>): RegistroGestao[] {
  const email = usuario.email.trim().toLowerCase()
  const agenda = agendamentos
    .filter((item) => usuario.admin || item.tarologoUid === email)
    .map((item) => ({
      id: `agenda:${item.id}`,
      origem: 'agenda' as const,
      data: item.data,
      hora: item.hora,
      clienteNome: item.clienteNome || 'Cliente',
      titulo: item.planoTitulo || item.categoriaTitulo,
      tarologoNome: item.tarologoNome,
      // Reservas antigas sem tarólogo pertenciam ao administrador inicial.
      tarologoPerfilId: item.tarologoUid || (usuario.admin ? email : ''),
      preco: item.preco,
      status: item.status,
      codigo: item.codigo,
      atendidoEm: item.atendidoEm,
    }))
  const particulares = convites
    .filter((item) => usuario.admin || item.tarologoUid === usuario.uid)
    .map((item) => {
      // Confirmações antigas não tinham data própria. Depois da migração,
      // `confirmadoEm` usa a criação da mesa como referência histórica.
      const momento = item.status === 'confirmado' ? item.confirmadoEm || item.criadoEm : item.criadoEm
      const { data, hora } = dataHora(momento)
      return {
        id: `particular:${item.token}`,
        origem: 'particular' as const,
        data,
        hora,
        clienteNome: item.convidadoNome || 'Convidado',
        titulo: item.titulo,
        tarologoNome: item.tarologoNome,
        tarologoPerfilId: item.tarologoPerfilId || (item.tarologoUid === usuario.uid ? email : ''),
        preco: item.preco,
        status: item.status,
        codigo: item.codigo,
      }
    })
  return [...agenda, ...particulares]
}

/** A remoção afeta somente o painel financeiro; os registros operacionais continuam intactos. */
export function registrosVisiveisNoFaturamento(registros: RegistroGestao[], idsRemovidos: string[], idsAtivos: string[]): RegistroGestao[] {
  const removidos = new Set(idsRemovidos)
  const ativos = new Set(idsAtivos)
  return registros.filter((item) => !removidos.has(item.tarologoPerfilId) || ativos.has(item.tarologoPerfilId))
}

/** Leva um pagamento pendente à ficha exata onde seu responsável pode conferi-lo. */
export function destinoConferencia(registro: RegistroGestao, usuario: Pick<Usuario, 'uid' | 'email' | 'admin'>): string | null {
  if (registro.status !== 'aguardando' && registro.status !== 'pago') return null
  const [origem, id] = registro.id.split(':', 2)
  if (!id) return null
  if (registro.origem === 'agenda' && origem === 'agenda') {
    return `#/perfil/tiragem/agenda/${encodeURIComponent(id)}`
  }
  if (registro.origem === 'particular' && origem === 'particular'
    && registro.tarologoPerfilId === usuario.email.trim().toLowerCase()) {
    return `#/perfil/tiragem/particular/${encodeURIComponent(id)}`
  }
  return null
}

export function resumoGestao(registros: RegistroGestao[], inicio: string, fim: string) {
  const semana = registros.filter((item) => item.data >= inicio && item.data <= fim)
  const totais = {
    agendados: 0, agendadosAgenda: 0, confirmados: 0, concluidos: 0, valor: 0,
    aguardando: 0, pagosInformados: 0, particularesConfirmadas: 0, valorParticulares: 0,
    valorReservado: 0,
  }
  for (const item of semana) {
    const preco = Number.isFinite(item.preco) && item.preco > 0 ? item.preco : 0
    if (item.status !== 'cancelado') {
      totais.agendados += 1
      if (item.origem === 'agenda') totais.agendadosAgenda += 1
      totais.valorReservado += preco
    }
    if (item.atendidoEm) totais.concluidos += 1
    // A origem do pagamento não entra nesta conta: uma futura confirmação
    // automática só precisa atualizar o status e a data do registro.
    if (item.status === 'confirmado') {
      totais.confirmados += 1
      totais.valor += preco
      if (item.origem === 'particular') {
        totais.particularesConfirmadas += 1
        totais.valorParticulares += preco
      }
    } else if (item.status === 'pago') {
      totais.pagosInformados += 1
    } else if (item.status === 'aguardando') {
      totais.aguardando += 1
    }
  }
  return { semana, totais }
}
