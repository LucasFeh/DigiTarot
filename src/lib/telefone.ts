/**
 * O Firebase só aceita telefone no formato E.164 — `+5531982676254`, sem
 * espaço, traço ou parêntese. Ninguém digita assim: as pessoas escrevem
 * "(31) 98267-6254", que é o formato do país delas e o único que elas
 * reconhecem como o próprio número.
 *
 * Então o site aceita a forma humana e converte aqui. Exigir E.164 na tela
 * seria empurrar para o visitante um detalhe de protocolo — e a conta de quem
 * digitasse errado seria não conseguir entrar.
 */

/** O DDI assumido quando a pessoa não escreve nenhum. */
const DDI_PADRAO = '55'

/**
 * Converte o que foi digitado em E.164, ou devolve `null` quando não dá para
 * ter certeza. `null` é melhor que um palpite: um número quase certo consome
 * o SMS, cobra do projeto e não chega a ninguém.
 */
export function paraE164(bruto: string): string | null {
  const texto = bruto.trim()

  // Já veio com DDI explícito: respeita o que a pessoa escreveu e só limpa.
  if (texto.startsWith('+')) {
    const digitos = texto.slice(1).replace(/\D/g, '')
    return digitos.length >= 10 && digitos.length <= 15 ? `+${digitos}` : null
  }

  const d = texto.replace(/\D/g, '')

  // DDD + número, com ou sem o 9 dos celulares: 31 98267-6254 / 31 3267-6254.
  if (d.length === 10 || d.length === 11) return `+${DDI_PADRAO}${d}`

  // Já traz o 55 na frente, mas sem o '+'.
  if ((d.length === 12 || d.length === 13) && d.startsWith(DDI_PADRAO)) return `+${d}`

  return null
}

/** `+5531982676254` → `+55 (31) 98267-6254`. Só para leitura na tela. */
export function formatarE164(e164: string): string {
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164)
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : e164
}

/** Máscara progressiva enquanto a pessoa digita, sem atrapalhar quem apaga. */
export function mascararBR(bruto: string): string {
  if (bruto.trim().startsWith('+')) return bruto
  const d = bruto.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
