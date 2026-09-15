import { useEffect, useState } from 'react'
import { PREFIXO_TEMA } from '../../lib/temas/visibilidade'
import AcervoTemas from './AcervoTemas'
import type { Visual } from '../../lib/temas/useVisual'
import type { Aba, TipoTema } from '../../lib/temas/tipos'

/**
 * A escolha de tema de quem está na sala. É a ÚNICA coisa que o cliente pode
 * mudar, então ela abre em cima da mesa e some depois — não vira painel fixo
 * roubando espaço da leitura.
 */
export default function SeletorTema({ visual, aoFechar }: { visual: Visual; aoFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoTema>('baralho')
  const [aba, setAba] = useState<Aba>('favoritos')

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aoFechar])

  const atual = tipo === 'baralho' ? visual.minha.baralhoId : visual.minha.panoId
  const escolher = (valor: string | null) =>
    visual.escolher(tipo === 'baralho' ? { baralhoId: valor } : { panoId: valor })

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" onClick={aoFechar} />

      <div className="glass relative flex h-[82vh] w-full max-w-4xl flex-col rounded-t-3xl p-5 sm:h-[76vh] sm:rounded-3xl">
        <div className="mb-3 flex shrink-0 items-center gap-3">
          <span className="mr-auto">
            <h2 className="font-display text-lg text-nebula">Tema da mesa</h2>
            <span className="mt-0.5 block text-[13px] text-mist/65">
              Só nesta leitura. Seu conjunto e seu padrão ficam no perfil.
            </span>
          </span>
          <a
            href="#/perfil"
            className="rounded-full border border-white/25 px-4 py-1.5 text-[14px] text-star transition hover:border-gold/60"
            title="Escolher o padrão e reunir temas da comunidade"
          >
            Meu perfil
          </a>
          <button
            type="button"
            onClick={aoFechar}
            className="grid h-8 w-8 place-items-center rounded-full text-mist transition hover:text-star"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex shrink-0 flex-wrap gap-2">
          {(['baralho', 'pano'] as TipoTema[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className="rounded-full px-4 py-1.5 text-[14px] transition"
              style={{
                color: tipo === t ? '#fff' : '#cbbde8',
                background: tipo === t ? '#ffffff14' : 'transparent',
              }}
            >
              {t === 'baralho' ? 'Cartas' : 'Pano'}
            </button>
          ))}

          <span className="ml-auto text-[13px] text-mist/60">
            Vazio? Reúna temas no seu perfil.
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <AcervoTemas
            tipo={tipo}
            aba={aba}
            onAba={setAba}
            compacto
            abas={['favoritos', 'pessoais']}
            selecionado={atual?.startsWith(PREFIXO_TEMA) ? atual.slice(PREFIXO_TEMA.length) : atual}
            onEscolher={(t) => escolher(t.tipo === 'pano' ? `${PREFIXO_TEMA}${t.id}` : t.id)}
          />
        </div>
      </div>
    </div>
  )
}
