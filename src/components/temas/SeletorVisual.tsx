import { useState } from 'react'
import { PREFIXO_TEMA } from '../../lib/temas/visibilidade'
import AcervoTemas from './AcervoTemas'
import MiniBaralho from './MiniBaralho'
import { useTema } from '../../lib/temas/useTema'
import type { Visual } from '../../lib/temas/useVisual'
import type { Aba, TemaBaralho, TipoTema } from '../../lib/temas/tipos'

/**
 * A aba Visual do painel do tarólogo: o tema dele, mais o interruptor que
 * espelha a mesa do cliente.
 *
 * Espelhar não muda nada do que está gravado — a escolha do tarólogo fica
 * intacta na sessão o tempo todo, e desmarcar devolve a mesa dele
 * instantaneamente. O cliente também não recebe aviso nenhum: o interruptor
 * mora em sessionStorage, não na sessão.
 */
export default function SeletorVisual({ visual }: { visual: Visual }) {
  const [tipo, setTipo] = useState<TipoTema>('baralho')
  const [aba, setAba] = useState<Aba>('favoritos')
  const baralho = useTema<TemaBaralho>(visual.visivel.baralhoId, 'baralho')

  const atual = tipo === 'baralho' ? visual.minha.baralhoId : visual.minha.panoId
  const escolher = (valor: string | null) =>
    visual.escolher(tipo === 'baralho' ? { baralhoId: valor } : { panoId: valor })

  return (
    <div className="flex h-full flex-col gap-3">
      {/* O baralho em uso, como baralho — dá para reconhecê-lo de relance, o
          que uma grade de miniaturas não permite. */}
      <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/12 bg-white/5 p-2.5">
        <MiniBaralho tema={baralho.tema} largura={66} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-star">
            {baralho.tema?.nome ?? 'Arte do site'}
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-mist/60">
            Vale só nesta leitura. O seu padrão fica no perfil.
          </span>
          <a
            href="#/perfil"
            className="mt-1 inline-block text-[12px] text-lilac transition hover:text-star"
          >
            Abrir o perfil →
          </a>
        </span>
      </div>

      <label
        className="flex shrink-0 cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition"
        style={{
          borderColor: visual.espelhando ? '#f2d49277' : '#ffffff18',
          background: visual.espelhando ? '#f2d4921a' : '#ffffff08',
          opacity: visual.podeEspelhar ? 1 : 0.5,
        }}
      >
        <input
          type="checkbox"
          checked={visual.espelhando}
          disabled={!visual.podeEspelhar}
          onChange={(e) => visual.espelhar(e.target.checked)}
          className="mt-0.5 accent-gold"
        />
        <span>
          <span className="block text-[14px] text-star">Ver o tema do cliente</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-mist/70">
            {visual.podeEspelhar
              ? 'Mostra a mesa como ele está vendo. A sua escolha não se perde.'
              : 'Ninguém entrou na sala ainda.'}
          </span>
        </span>
      </label>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {(['baralho', 'pano'] as TipoTema[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className="rounded-full px-3 py-1 text-[13px] transition"
            style={{
              color: tipo === t ? '#fff' : '#cbbde8',
              background: tipo === t ? '#ffffff14' : 'transparent',
            }}
          >
            {t === 'baralho' ? 'Cartas' : 'Pano'}
          </button>
        ))}
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
  )
}
