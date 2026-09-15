import { useMiniatura } from '../../lib/temas/useAcervo'
import CaixaDeck from './CaixaDeck'
import type { Tema } from '../../lib/temas/tipos'

/** Quantas das 78 o tema cobre — um tema só dos arcanos maiores é legítimo. */
function cobertura(t: Tema) {
  if (t.tipo !== 'baralho') return null
  const n = t.cartas.length
  if (n >= 78) return 'baralho completo'
  if (n >= 22) return `${n} cartas`
  return `${n} carta${n === 1 ? '' : 's'}`
}

function kb(bytes: number) {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export default function CardTema({
  tema,
  favorito,
  podeFavoritar,
  meu,
  semLink = false,
  onFavoritar,
  onApagar,
}: {
  tema: Tema
  favorito: boolean
  podeFavoritar: boolean
  meu: boolean
  /**
   * Dentro do seletor da sala o card inteiro já é um `<button>` de escolha.
   * Manter o `<a>` aqui punha uma âncora DENTRO de um botão: o clique
   * disparava os dois, e escolher um tema levava a pessoa para fora da sala.
   */
  semLink?: boolean
  onFavoritar: () => void
  onApagar?: () => void
}) {
  const mini = useMiniatura(tema)
  const Corpo = semLink ? 'div' : 'a'

  return (
    <article className="glass group relative overflow-hidden rounded-2xl transition hover:border-white/25">
      <Corpo
        {...(semLink ? {} : { href: `#/temas/ver/${tema.id}` })}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        <div
          className="relative aspect-[3/4] w-full overflow-hidden"
          // Enquanto a miniatura não chega, a cor média do tema segura o
          // lugar — em vez de um retângulo cinza que pisca.
          style={{ background: tema.tipo === 'pano' ? tema.cor : '#1b0d42' }}
        >
          {tema.tipo === 'baralho' ? (
            // Baralho aparece como maço fechado, e não como uma carta esticada
            // até a borda: é assim que se reconhece um deck de relance, e o
            // hover mostra o que tem dentro sem precisar abrir o tema.
            <span className="absolute inset-0 grid place-items-center">
              <CaixaDeck tema={tema} largura={76} />
            </span>
          ) : (
            mini && (
              <img
                src={mini}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
            )
          )}
          {/* Brilho de magia na borda de cima, no hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
            style={{
              background: 'radial-gradient(120% 60% at 50% 0%, #b98cff33, transparent 70%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{ background: 'linear-gradient(to top, #05010fdd, transparent)' }}
          />
        </div>

        <div className="p-3">
          <p className="truncate font-display text-[16px] text-star">{tema.nome}</p>
          <p className="mt-0.5 truncate text-[13px] text-mist/70">
            {tema.autorNome}
            {cobertura(tema) ? ` · ${cobertura(tema)}` : ''} · {kb(tema.bytes)}
          </p>
        </div>
      </Corpo>

      <div className="absolute right-2 top-2 flex gap-1.5">
        {podeFavoritar && (
          <button
            type="button"
            onClick={(e) => {
              // Sem isto o clique sobe até o botão de escolha que embrulha o
              // card no seletor da sala, e favoritar trocaria o tema da mesa.
              e.stopPropagation()
              onFavoritar()
            }}
            aria-pressed={favorito}
            title={favorito ? 'Tirar do meu conjunto' : 'Adicionar ao meu conjunto'}
            className="glass grid h-8 w-8 place-items-center rounded-full text-[15px] transition hover:text-star"
            style={{ color: favorito ? '#f2d492' : '#cbbde8' }}
          >
            {favorito ? '★' : '☆'}
          </button>
        )}
        {meu && onApagar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onApagar()
            }}
            title="Apagar este tema"
            className="glass grid h-8 w-8 place-items-center rounded-full text-[15px] text-mist transition hover:text-rose"
          >
            ✕
          </button>
        )}
      </div>
    </article>
  )
}
