import type { StatusAgendamento } from '../../lib/backend'

/**
 * Como cada estado do agendamento se apresenta. O texto é escrito do ponto de
 * vista de quem espera algo acontecer, não do banco de dados — "aguardando
 * pagamento" diz o que falta, "aguardando" não diria.
 */
export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  aguardando: 'aguardando pagamento',
  pago: 'pagamento em conferência',
  confirmado: 'confirmada',
  cancelado: 'cancelada',
}

const CORES: Record<StatusAgendamento, { borda: string; texto: string; fundo: string }> = {
  aguardando: { borda: '#f2d49255', texto: '#f2d492', fundo: '#f2d4921a' },
  pago: { borda: '#5ec8e855', texto: '#5ec8e8', fundo: '#5ec8e81a' },
  confirmado: { borda: '#7ddba455', texto: '#7ddba4', fundo: '#7ddba41a' },
  cancelado: { borda: '#ffffff22', texto: '#cbbde8', fundo: '#ffffff0d' },
}

export default function SeloStatus({ status }: { status: StatusAgendamento }) {
  const c = CORES[status]
  return (
    <span
      className="shrink-0 rounded-full border px-3 py-1 text-[12px] uppercase tracking-[0.12em]"
      style={{ borderColor: c.borda, color: c.texto, background: c.fundo }}
    >
      {ROTULO_STATUS[status]}
    </span>
  )
}
