/**
 * Gera o "copia e cola" do Pix — o BR Code do padrão EMV® QRCPS-MPM adotado
 * pelo Banco Central.
 *
 * É um Pix ESTÁTICO: a string é montada aqui, no navegador, a partir da chave
 * do recebedor. Não há chamada a banco nem a gateway, e por isso também não há
 * confirmação automática — quem dá baixa é o tarólogo, no painel, depois de ver
 * o dinheiro cair. O valor vai embutido no código justamente para o cliente não
 * poder digitar outro por engano.
 *
 * O formato é uma sequência de campos `IDTAMANHOVALOR`, onde ID e TAMANHO têm
 * dois dígitos cada. Campos podem conter outros campos (o 26 e o 62 contêm).
 */

/** `05` + `03` + `abc` → `0503abc`. O tamanho conta CARACTERES, não bytes. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`
}

/**
 * CRC16/CCITT-FALSE: polinômio 0x1021, registrador inicial 0xFFFF, sem inversão
 * final. É o que o manual do BCB especifica; qualquer outra variante de CRC16
 * produz um código que o aplicativo do banco recusa como inválido.
 */
export function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * O BR Code só aceita um subconjunto ASCII. Nome e cidade com acento —
 * "São Paulo", "Rodrigo Nogueira Gonçalves" — quebram a leitura em parte dos
 * aplicativos, então acento vira letra simples e o que sobrar fora da faixa é
 * descartado.
 */
function ascii(texto: string, limite: number): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9 .,\-/]/g, '')
      .trim()
      .slice(0, limite)
      // O segundo trim é o que importa: cortar no limite pode parar em cima de
      // um espaço, e o campo terminaria com um branco pendurado — que conta no
      // tamanho declarado e aparece no aplicativo de quem paga.
      .trim()
  )
}

/** O txid do Pix aceita só letras e números, e no máximo 25 deles. */
export function txidLimpo(texto: string): string {
  const limpo = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 25)
  return limpo || '***'
}

export type CobrancaPix = {
  chave: string
  /** Nome de quem recebe, como aparece no aplicativo do pagador. Até 25. */
  nome: string
  /** Cidade do recebedor. Até 15. */
  cidade: string
  valor: number
  /** Identificador da cobrança — é por ele que o pagamento é conciliado. */
  txid: string
}

/** A string do copia e cola. É a mesma coisa que vira o QR Code. */
export function payloadPix({ chave, nome, cidade, valor, txid }: CobrancaPix): string {
  const conta =
    campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim())

  const sem =
    campo('00', '01') +
    // 12 = uso único. O valor está fixo no código; reaproveitá-lo para outra
    // consulta cobraria o preço errado.
    campo('01', '12') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', ascii(nome, 25) || 'RECEBEDOR') +
    campo('60', ascii(cidade, 15) || 'BRASIL') +
    campo('62', campo('05', txidLimpo(txid))) +
    // O CRC é calculado sobre a string JÁ COM o '6304' no fim — o cabeçalho do
    // próprio campo entra no cálculo.
    '6304'

  return sem + crc16(sem)
}

export type DadosPix = { chave: string; nome: string; cidade: string; configurado: boolean }

/**
 * Os dados do recebedor vêm do `.env`. Enquanto a chave estiver em branco, a
 * tela de pagamento diz isso em voz alta em vez de gerar um QR Code que leva o
 * dinheiro a lugar nenhum.
 */
export function dadosPix(): DadosPix {
  const env = import.meta.env
  const chave = (env.VITE_PIX_CHAVE ?? '').trim()
  return {
    chave,
    nome: (env.VITE_PIX_NOME ?? '').trim(),
    cidade: (env.VITE_PIX_CIDADE ?? '').trim(),
    configurado: chave.length > 0,
  }
}
