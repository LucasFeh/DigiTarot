import { useAuth } from '../lib/useAuth'

/**
 * O aviso que impede o pior desfecho possível deste site.
 *
 * Sem as chaves do Firebase, tudo funciona — catálogo, agenda, QR Code do Pix —
 * só que dentro do `localStorage` de quem está olhando. Num site publicado isso
 * significa que um visitante de verdade pode marcar uma consulta, ler uma tela
 * que diz "reservado", **pagar um Pix que é real** e o Rodrigo nunca ficar
 * sabendo: a reserva não saiu do navegador dele.
 *
 * O site parece pronto exatamente no momento em que é mais perigoso. Então,
 * enquanto rodar sem backend, ele diz isso em voz alta na cara de quem estiver
 * prestes a pagar.
 */
export default function AvisoModoLocal() {
  const { backend } = useAuth()
  if (backend?.modo !== 'local') return null

  return (
    <div
      role="status"
      className="mb-6 rounded-2xl border border-rose/45 bg-rose/10 px-5 py-4"
    >
      <p className="font-display text-[16px] text-rose">Site em preparação — não pague nada</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-mist">
        Esta versão roda sem servidor: a reserva fica só neste navegador e{' '}
        <strong className="font-medium text-star">não chega ao tarólogo</strong>. Use para conhecer
        o site à vontade, mas não faça nenhum pagamento — ele não seria identificado.
      </p>
    </div>
  )
}
