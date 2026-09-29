import { useEffect, useRef, useState } from 'react'
import { formatPriceFull } from '../../data/plans'
import type { HistoricoFaturamento } from '../../lib/faturamento'

function nomeMes(chave: string, curto = false): string {
  const [ano, mes] = chave.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    month: curto ? 'short' : 'long',
    year: 'numeric',
  }).format(new Date(ano, mes - 1, 1))
}

export default function GraficoFaturamento({ historico, carregando }: { historico: HistoricoFaturamento; carregando: boolean }) {
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  const rolagem = useRef<HTMLDivElement>(null)
  const { meses, primeiro, atual, total, registrosSemDataDeConfirmacao } = historico
  const selecionado = meses.find((mes) => mes.chave === mesSelecionado) ?? atual
  const maior = Math.max(1, ...meses.map((mes) => mes.valor))
  const largura = Math.max(620, meses.length * 56)
  const variacao = primeiro && atual && primeiro.chave !== atual.chave && primeiro.valor > 0
    ? ((atual.valor - primeiro.valor) / primeiro.valor) * 100
    : null

  useEffect(() => {
    if (rolagem.current) rolagem.current.scrollLeft = rolagem.current.scrollWidth
  }, [meses.length])

  return (
    <section aria-labelledby="titulo-faturamento" className="mt-7 overflow-hidden rounded-[24px] border border-gold/25 bg-[radial-gradient(ellipse_at_85%_0%,#6d3fd426,transparent_55%),linear-gradient(155deg,#1b1230,#100b1d)] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Evolução mensal</p>
          <h3 id="titulo-faturamento" className="mt-1 font-display text-2xl text-star">Faturamento confirmado</h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-mist/65">
            Soma dos preços das consultas com pagamento marcado como confirmado no site, pelo mês da confirmação.
          </p>
        </div>
        {variacao !== null && (
          <span className={`rounded-full border px-3 py-1.5 text-[12px] ${variacao >= 0 ? 'border-gold/40 bg-gold/10 text-gold' : 'border-rose/40 bg-rose/10 text-rose'}`}>
            {variacao >= 0 ? '+' : ''}{Math.round(variacao)}% desde o primeiro mês
          </span>
        )}
      </div>

      {carregando ? (
        <p className="mt-8 text-[14px] text-mist/65">Carregando histórico de atendimentos…</p>
      ) : !primeiro || !atual ? (
        <div className="mt-7 rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center">
          <p className="font-display text-lg text-star">O gráfico começa no primeiro pagamento confirmado</p>
          <p className="mt-2 text-[13px] text-mist/65">Ainda não há atendimentos confirmados no histórico.</p>
        </div>
      ) : (
        <>
          <dl className="mt-6 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-3 sm:gap-0">
            <div className="sm:pr-5">
              <dt className="text-[12px] uppercase tracking-[0.15em] text-mist/60">No primeiro mês</dt>
              <dd className="mt-1 font-display text-2xl text-star">{formatPriceFull(primeiro.valor)}</dd>
              <dd className="mt-1 text-[12px] text-mist/55">{nomeMes(primeiro.chave)}</dd>
            </div>
            <div className="sm:border-x sm:border-white/10 sm:px-5">
              <dt className="text-[12px] uppercase tracking-[0.15em] text-mist/60">Neste mês</dt>
              <dd className="mt-1 font-display text-2xl text-gold">{formatPriceFull(atual.valor)}</dd>
              <dd className="mt-1 text-[12px] text-mist/55">{nomeMes(atual.chave)} · mês em andamento</dd>
            </div>
            <div className="sm:pl-5">
              <dt className="text-[12px] uppercase tracking-[0.15em] text-mist/60">Total confirmado</dt>
              <dd className="mt-1 font-display text-2xl text-star">{formatPriceFull(total)}</dd>
              <dd className="mt-1 text-[12px] text-mist/55">Desde o primeiro registro</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
            <p className="text-[13px] text-mist/65">Selecione um mês para ver o valor.</p>
            {selecionado && (
              <p className="text-[13px] text-mist/75" aria-live="polite">
                <span>{nomeMes(selecionado.chave)}</span> · <strong className="font-medium text-star">{formatPriceFull(selecionado.valor)}</strong> · {selecionado.atendimentos} {selecionado.atendimentos === 1 ? 'consulta' : 'consultas'}
              </p>
            )}
          </div>

          <div ref={rolagem} className="mt-3 overflow-x-auto pb-2" role="region" aria-label="Gráfico mensal de faturamento; deslize para ver outros meses" tabIndex={0}>
            <div style={{ minWidth: largura }}>
              <div className="flex justify-between text-[11px] text-mist/50">
                <span>{formatPriceFull(maior)}</span>
                <span>Pico mensal</span>
              </div>
              <div className="relative mt-3 h-44">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-white/10" />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/10" />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/20" />
                <div className="relative grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))` }}>
                  {meses.map((mes) => (
                    <div key={mes.chave} className="flex min-w-0 items-end justify-center">
                      <button
                        type="button"
                        title={`${nomeMes(mes.chave)}: ${formatPriceFull(mes.valor)} em ${mes.atendimentos} consultas`}
                        aria-label={`${nomeMes(mes.chave)}: ${formatPriceFull(mes.valor)}, ${mes.atendimentos} consultas`}
                        aria-pressed={selecionado?.chave === mes.chave}
                        onClick={() => setMesSelecionado(mes.chave)}
                        className={`w-full max-w-9 rounded-t-md outline-offset-2 transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-gold ${selecionado?.chave === mes.chave ? 'ring-1 ring-gold/70' : ''}`}
                        style={{
                          height: `${Math.max(2, mes.valor / maior * 100)}%`,
                          background: mes.chave === atual.chave
                            ? 'linear-gradient(180deg, #f2d492, #c2449d)'
                            : 'linear-gradient(180deg, #a580ef, #5330a0)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 grid gap-2 text-center text-[11px] text-mist/60" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))` }}>
                {meses.map((mes) => <span key={mes.chave} className="min-w-0 whitespace-nowrap">{nomeMes(mes.chave, true)}</span>)}
              </div>
            </div>
          </div>
          {meses.length > 10 && <p className="mt-1 text-[12px] text-mist/50">Arraste o gráfico para ver os meses anteriores.</p>}
        </>
      )}

      <p className="mt-5 text-[12px] leading-relaxed text-mist/50">
        O Pix é conferido manualmente; estes valores não representam saldo bancário.
        {registrosSemDataDeConfirmacao > 0 && ` ${registrosSemDataDeConfirmacao} ${registrosSemDataDeConfirmacao === 1 ? 'registro antigo usa' : 'registros antigos usam'} o mês de criação da reserva por não ter data de confirmação.`}
      </p>
    </section>
  )
}
