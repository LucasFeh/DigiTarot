/**
 * A agenda do Rodrigo. Atende todos os dias da semana, das 16h às 21h, de hora
 * em hora — seis encaixes por dia.
 *
 * Tudo aqui é data LOCAL, nunca UTC. `new Date('2026-09-20')` é meia-noite em
 * UTC, que no fuso de Brasília cai no dia 19 às 21h: um dia escolhido no
 * calendário virava o dia anterior ao ser exibido de volta. Por isso o dia
 * trafega como a string `YYYY-MM-DD` e só vira `Date` por `diaParaData`, que
 * monta o objeto campo a campo.
 */

export const HORARIOS = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'] as const

/** Quantos dias o calendário mostra à frente. Quatro semanas cheias. */
export const DIAS_VISIVEIS = 28

/**
 * Antecedência mínima, em minutos. Sem isso alguém reservaria as 16h às 15h58 e
 * o Rodrigo descobriria a consulta dois minutos antes dela.
 */
export const ANTECEDENCIA_MIN = 90

const P2 = (n: number) => String(n).padStart(2, '0')

/** `Date` → `YYYY-MM-DD` no fuso de quem está olhando. */
export function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${P2(d.getMonth() + 1)}-${P2(d.getDate())}`
}

/** `YYYY-MM-DD` → `Date` local à meia-noite. */
export function diaParaData(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** `YYYY-MM-DD` + `HH:MM` → o instante exato, local. */
export function momentoDe(dia: string, hora: string): Date {
  const d = diaParaData(dia)
  const [h, min] = hora.split(':').map(Number)
  d.setHours(h, min, 0, 0)
  return d
}

/**
 * Identidade de um encaixe: `2026-09-20T16:00`. É o id do documento que reserva
 * o horário — dois clientes tentando o mesmo minuto escrevem no mesmo id, e o
 * segundo é recusado pela regra do Firestore. A trava contra reserva dupla é
 * essa, e não uma verificação na tela.
 */
export function slotId(dia: string, hora: string): string {
  return `${dia}T${hora}`
}

export function partesDoSlot(id: string): { dia: string; hora: string } {
  const [dia, hora] = id.split('T')
  return { dia, hora: hora ?? '' }
}

/** Os próximos `DIAS_VISIVEIS` dias, hoje incluído. */
export function diasDisponiveis(agora = new Date()): string[] {
  const dias: string[] = []
  for (let i = 0; i < DIAS_VISIVEIS; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i)
    dias.push(chaveDia(d))
  }
  return dias
}

/** Horário cedo demais para ser reservado agora. */
export function cedoDemais(dia: string, hora: string, agora = new Date()): boolean {
  return momentoDe(dia, hora).getTime() - agora.getTime() < ANTECEDENCIA_MIN * 60_000
}

/** Um dia é escolhível enquanto sobrar ao menos um horário livre nele. */
export function diaTemVaga(dia: string, ocupados: Set<string>, agora = new Date()): boolean {
  return HORARIOS.some((h) => !ocupados.has(slotId(dia, h)) && !cedoDemais(dia, h, agora))
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Rótulo curto do botão do calendário. */
export function rotuloDia(dia: string) {
  const d = diaParaData(dia)
  return {
    semana: SEMANA[d.getDay()],
    numero: d.getDate(),
    mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  }
}

/** Por extenso: "sábado, 20 de setembro de 2026". */
export function rotuloCompleto(dia: string): string {
  return diaParaData(dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Quanto antes do horário marcado a mesa pode ser aberta, e por quanto tempo
 * depois ela continua podendo. A janela existe para o botão "Abrir mesa" não
 * ficar aceso o mês inteiro no painel do tarólogo: ele acende perto da hora da
 * consulta daquele cliente e apaga quando o encaixe já passou faz tempo.
 */
export const ANTES_DE_ABRIR = 15
export const DEPOIS_DE_ABRIR = 180

/** A consulta está na hora — é agora que o tarólogo abre a mesa. */
export function naJanela(dia: string, hora: string, agora = new Date()): boolean {
  const delta = agora.getTime() - momentoDe(dia, hora).getTime()
  return delta >= -ANTES_DE_ABRIR * 60_000 && delta <= DEPOIS_DE_ABRIR * 60_000
}

/** O encaixe ficou para trás sem que ninguém abrisse a mesa. */
export function jaPassou(dia: string, hora: string, agora = new Date()): boolean {
  return agora.getTime() - momentoDe(dia, hora).getTime() > DEPOIS_DE_ABRIR * 60_000
}

/**
 * Quanto falta, em texto curto: "em 2 dias", "em 3 h", "agora". Serve tanto ao
 * cartão do cliente quanto à agenda do tarólogo.
 */
export function faltam(dia: string, hora: string, agora = new Date()): string {
  const ms = momentoDe(dia, hora).getTime() - agora.getTime()
  if (ms <= 0) return 'agora'
  const min = Math.round(ms / 60_000)
  if (min < 60) return `em ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `em ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'amanhã' : `em ${d} dias`
}

/** "20 de set, 16:00" — a forma curta usada nas listas. */
export function rotuloCurto(dia: string, hora: string): string {
  const d = diaParaData(dia)
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}, ${hora}`
}
