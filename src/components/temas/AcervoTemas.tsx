import { useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import { repoTemas } from '../../lib/temas'
import { useCatalogo, useFavoritos } from '../../lib/temas/useAcervo'
import CardTema from './CardTema'
import type { Aba, Tema, TipoTema } from '../../lib/temas/tipos'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'favoritos', rotulo: 'Meu conjunto' },
  { id: 'pessoais', rotulo: 'Criados por mim' },
  { id: 'comunidade', rotulo: 'Comunidade' },
]

/**
 * A grade das três abas. Serve tanto à página `#/temas` quanto ao painel
 * dentro da sala — daí o modo compacto, que só aperta o espaçamento e a grade.
 */
export default function AcervoTemas({
  tipo,
  aba,
  onAba,
  compacto = false,
  abas,
  selecionado,
  onEscolher,
}: {
  tipo: TipoTema
  aba: Aba
  onAba: (a: Aba) => void
  compacto?: boolean
  /**
   * Quais abas mostrar. Dentro da sala só valem o conjunto pessoal e o que a
   * pessoa criou — navegar a comunidade inteira no meio de uma leitura não é o
   * momento, e foi assim que o recurso foi pedido.
   */
  abas?: Aba[]
  /** Quando dado, o card vira botão de escolha em vez de link para a prévia. */
  selecionado?: string | null
  onEscolher?: (tema: Tema) => void
}) {
  const { usuario } = useAuth()
  const { temas, carregando, erro, recarregar } = useCatalogo(tipo, aba)
  const { ids, alternar, podeFavoritar } = useFavoritos()
  const [apagando, setApagando] = useState<string | null>(null)

  const apagar = async (t: Tema) => {
    if (!usuario) return
    setApagando(t.id)
    try {
      // Quem derruba as texturas do tema é o próprio registro, que escuta o
      // canal — esta tela não importa o three nem precisa saber que ele existe.
      await repoTemas().apagar(t.id, usuario.uid)
      recarregar()
    } finally {
      setApagando(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-white/10 pb-2">
        {ABAS.filter((a) => !abas || abas.includes(a.id)).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAba(a.id)}
            aria-current={aba === a.id ? 'true' : undefined}
            className="rounded-full px-3 py-1.5 text-[14px] tracking-wide transition"
            style={{
              color: aba === a.id ? '#fff' : '#cbbde8',
              background: aba === a.id ? '#ffffff14' : 'transparent',
              boxShadow: aba === a.id ? '0 0 20px -8px var(--color-violet)' : 'none',
            }}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        {carregando && <p className="px-1 py-6 text-center text-[14px] text-mist/70">Abrindo o acervo…</p>}

        {erro && <p className="px-1 py-6 text-center text-[14px] text-rose/80">{erro}</p>}

        {!carregando && !erro && temas.length === 0 && (
          <div className="px-2 py-8 text-center">
            <p className="text-[15px] text-mist/80">
              {aba === 'pessoais'
                ? 'Você ainda não criou nenhum tema.'
                : aba === 'favoritos'
                  ? 'Seu conjunto está vazio — use o marcador no canto do tema para guardar o que quiser levar para a mesa.'
                  : 'O acervo está vazio por enquanto.'}
            </p>
            <a
              href={aba === 'favoritos' ? '#/perfil' : '#/temas/novo'}
              className="mt-4 inline-block rounded-full border border-white/25 px-5 py-2 text-[14px] text-star transition hover:border-gold/60"
            >
              {aba === 'favoritos' ? 'Ver a comunidade no perfil' : 'Criar um tema'}
            </a>
          </div>
        )}

        {/* Mais colunas do que antes: o tema virou um maço pequeno, então cabe
            mais por linha e a pessoa compara vários de uma olhada. */}
        <div
          className={`grid gap-3 ${
            compacto ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
          }`}
        >
          {temas.map((t) => {
            const meu = t.autorUid === usuario?.uid
            const card = (
              <CardTema
                tema={t}
                favorito={ids.has(t.id)}
                podeFavoritar={podeFavoritar && !meu}
                meu={meu}
                semLink={Boolean(onEscolher)}
                onFavoritar={() => alternar(t.id)}
                onApagar={meu ? () => void apagar(t) : undefined}
              />
            )
            if (!onEscolher) return <div key={t.id}>{card}</div>
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onEscolher(t)}
                className="rounded-2xl text-left outline-none transition focus-visible:ring-2 focus-visible:ring-gold/60"
                style={{
                  boxShadow: selecionado === t.id ? '0 0 0 2px var(--color-gold)' : 'none',
                  opacity: apagando === t.id ? 0.4 : 1,
                }}
              >
                {card}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
