import { useEffect, useRef, useState } from 'react'
import { arteDoArcano, categories, formatPriceFull, type Category, type Plan } from '../data/plans'
import { CARD_BY_ID } from '../data/cards'

/**
 * Uma carta do catálogo: a arte do arcano ao fundo, escurecida, e o serviço por
 * cima.
 *
 * O escurecimento é a parte que decide se isto funciona. A arte do Rider-Waite
 * é clara e cheia de detalhe amarelo — texto branco direto sobre ela vira
 * ilegível justamente nas cartas mais bonitas. São três camadas: um véu geral,
 * um degradê que fecha em preto na metade de baixo, onde mora o texto, e uma
 * leve dessaturação. A arte continua reconhecível; a leitura deixa de depender
 * de sorte.
 */
function CartaPlano({
  plano,
  categoria,
  destino,
}: {
  plano: Plan
  categoria: Category
  destino: string
}) {
  const arcano = CARD_BY_ID.get(`maior-${plano.arcano}`)

  return (
    // 240px na proporção de carta dá ~408px de altura — e é o que mantém o
    // botão "Agendar" acima da dobra numa tela comum. A 270 ele caía embaixo,
    // e a ação principal do catálogo exigia rolar para ser vista.
    <li className="w-[min(72vw,240px)] shrink-0 snap-start">
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-transform duration-300 hover:-translate-y-1"
        style={{
          aspectRatio: '512 / 870',
          borderColor: `${categoria.accent}55`,
          boxShadow: `0 20px 50px -22px ${categoria.accent}`,
        }}
      >
        {/* ---------------------------- a arte ---------------------------- */}
        <img
          src={arteDoArcano(plano.arcano)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ filter: 'saturate(0.85) brightness(0.85)' }}
        />

        {/* Véu geral: tira o brilho do papel sem apagar o desenho. */}
        <div aria-hidden className="absolute inset-0 bg-void/45" />

        {/* Degradê que fecha em preto embaixo, onde o texto vive. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(5,1,15,.20) 0%, rgba(5,1,15,.55) 42%, rgba(5,1,15,.93) 72%, #05010f 100%)',
          }}
        />

        {/* Um sopro da cor da categoria, só para as quatro abas não se confundirem. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 opacity-60"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${categoria.accent}55, transparent 70%)` }}
        />

        {/* --------------------------- o conteúdo --------------------------- */}
        <div className="relative flex h-full flex-col p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold/85">
            {arcano?.nome ?? categoria.title}
          </p>

          <div className="mt-auto">
            <h3 className="font-display text-[19px] leading-tight text-star">{plano.title}</h3>

            {plano.duration && (
              <span className="mt-2 inline-block rounded-full border border-white/25 px-2.5 py-[2px] text-[11px] uppercase tracking-[0.14em] text-mist">
                {plano.duration}
              </span>
            )}

            <p className="mt-2 text-[13px] leading-relaxed text-mist/85">{plano.resumo}</p>

            <p className="mt-3 font-display text-[24px] font-semibold text-gold">
              {formatPriceFull(plano.price)}
            </p>

            <a
              href={destino}
              className="mt-3 block rounded-full py-2.5 text-center text-[15px] font-medium text-star transition"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 10px 28px -12px #c2449d',
              }}
            >
              Agendar
            </a>
          </div>
        </div>
      </article>
    </li>
  )
}

/**
 * O catálogo em carrossel: uma aba por categoria, e dentro dela as cartas
 * deslizando na horizontal.
 *
 * A rolagem é nativa, com `scroll-snap` — e não um carrossel de biblioteca com
 * transformação e índice. Nativa ela já vem com arrasto no celular, roda do
 * mouse, teclado e barra de rolagem, tudo de graça e tudo acessível. As setas
 * são um atalho para quem está no mouse, não o único jeito de andar.
 */
export default function CarrosselPlanos({ destino }: { destino: (planoId: string) => string }) {
  const [ativa, setAtiva] = useState(categories[0].id)
  const [temAntes, setTemAntes] = useState(false)
  const [temDepois, setTemDepois] = useState(false)
  const trilho = useRef<HTMLUListElement>(null)

  const categoria = categories.find((c) => c.id === ativa) ?? categories[0]

  /** Liga e desliga as setas conforme sobra conteúdo de cada lado. */
  const conferir = () => {
    const el = trilho.current
    if (!el) return
    setTemAntes(el.scrollLeft > 8)
    setTemDepois(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  // Trocar de categoria volta ao começo: continuar no meio da lista anterior
  // deixa a nova parecendo vazia.
  useEffect(() => {
    const el = trilho.current
    if (!el) return
    el.scrollTo({ left: 0 })
    conferir()
  }, [ativa])

  useEffect(() => {
    conferir()
    window.addEventListener('resize', conferir)
    return () => window.removeEventListener('resize', conferir)
  }, [])

  const andar = (dir: 1 | -1) => {
    const el = trilho.current
    if (!el) return
    // Uma "página" é quase a largura visível: avançar exatamente tudo faz a
    // carta da borda sumir sem ter sido vista.
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  const Seta = ({ dir, ligada }: { dir: 1 | -1; ligada: boolean }) => (
    <button
      type="button"
      onClick={() => andar(dir)}
      disabled={!ligada}
      aria-label={dir === 1 ? 'Ver as próximas' : 'Ver as anteriores'}
      className="glass hidden h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] text-mist transition hover:text-star disabled:opacity-25 sm:grid"
    >
      {dir === 1 ? '›' : '‹'}
    </button>
  )

  return (
    <div>
      {/* ---------------------------- categorias ---------------------------- */}
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {categories.map((c) => {
          const on = c.id === ativa
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setAtiva(c.id)}
              aria-current={on ? 'true' : undefined}
              className="relative px-4 py-3 text-[15px] tracking-wide transition"
              style={{ color: on ? '#fff' : '#cbbde8' }}
            >
              {c.title}
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-opacity"
                style={{ background: c.accent, opacity: on ? 1 : 0 }}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <p className="mr-auto text-[15px] leading-relaxed text-mist/80">{categoria.tagline}</p>
        <Seta dir={-1} ligada={temAntes} />
        <Seta dir={1} ligada={temDepois} />
      </div>

      {/* ------------------------------ o trilho ------------------------------ */}
      <ul
        ref={trilho}
        onScroll={conferir}
        role="region"
        aria-label={`Consultas de ${categoria.title}`}
        tabIndex={0}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {categoria.plans.map((p) => (
          <CartaPlano key={p.id} plano={p} categoria={categoria} destino={destino(p.id)} />
        ))}
      </ul>

      <p className="mt-2 text-[14px] leading-relaxed text-mist/60">
        Arraste para o lado para ver todas. Qualquer modalidade pode ser feita por escrito, áudio ou
        chamada — você escolhe no passo seguinte, e o pagamento é por Pix.
      </p>
    </div>
  )
}
