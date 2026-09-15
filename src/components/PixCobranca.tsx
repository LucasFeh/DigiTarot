import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { dadosPix, payloadPix } from '../lib/pix'
import { formatPriceFull } from '../data/plans'

/**
 * O QR Code e o copia e cola de uma cobrança.
 *
 * O QR fica sobre branco de propósito: leitor de celular precisa do contraste
 * claro/escuro na polaridade certa, e um QR escuro sobre o fundo violeta do
 * site simplesmente não é lido por boa parte dos aplicativos de banco.
 */
export default function PixCobranca({
  valor,
  codigo,
  descricao,
}: {
  valor: number
  codigo: string
  descricao: string
}) {
  const pix = dadosPix()
  const [copiado, setCopiado] = useState(false)

  const payload = useMemo(
    () =>
      pix.configurado
        ? payloadPix({
            chave: pix.chave,
            nome: pix.nome,
            cidade: pix.cidade,
            valor,
            txid: codigo,
          })
        : '',
    [pix.configurado, pix.chave, pix.nome, pix.cidade, valor, codigo],
  )

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Área de transferência bloqueada (http, permissão negada): o código
      // continua visível na tela para seleção manual.
      setCopiado(false)
    }
  }

  if (!pix.configurado) {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-6">
        <p className="font-display text-[17px] text-gold">Pix ainda não configurado</p>
        <p className="mt-2 text-[15px] leading-relaxed text-mist">
          A chave do recebedor não foi preenchida. Defina <code className="text-gold">VITE_PIX_CHAVE</code>,{' '}
          <code className="text-gold">VITE_PIX_NOME</code> e <code className="text-gold">VITE_PIX_CIDADE</code>{' '}
          no arquivo <code className="text-gold">.env</code> para o QR Code aparecer aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div className="shrink-0 rounded-2xl bg-white p-3">
        <QRCodeSVG value={payload} size={188} level="M" marginSize={1} fgColor="#120a22" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] uppercase tracking-[0.18em] text-mist/70">Pagar com Pix</p>
        <p className="mt-1 font-display text-2xl text-gold">{formatPriceFull(valor)}</p>
        <p className="mt-1 text-[14px] text-mist/80">{descricao}</p>
        {/* Só aparece quando há nome configurado. O aplicativo do banco mostra
            o titular verdadeiro da chave na hora de confirmar, então uma linha
            dizendo "não informado" só semearia dúvida num momento em que a
            pessoa está decidindo se confia o suficiente para pagar. */}
        {pix.nome && (
          <p className="mt-3 text-[14px] text-mist/70">
            Recebedor: <span className="text-star">{pix.nome}</span>
          </p>
        )}

        <p className="mt-4 mb-1.5 text-[13px] uppercase tracking-[0.14em] text-mist/70">
          Ou use o copia e cola
        </p>
        <p className="max-h-20 overflow-y-auto break-all rounded-xl border border-white/12 bg-white/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-mist/75">
          {payload}
        </p>

        <button
          type="button"
          onClick={() => void copiar()}
          className="mt-3 w-full rounded-full border border-white/25 px-5 py-2.5 text-[15px] text-star transition hover:border-gold/60 hover:bg-white/5 sm:w-auto"
        >
          {copiado ? 'Código copiado' : 'Copiar código Pix'}
        </button>
      </div>
    </div>
  )
}
