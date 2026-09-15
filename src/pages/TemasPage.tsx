import { useState } from 'react'
import AcervoTemas from '../components/temas/AcervoTemas'
import type { Aba, TipoTema } from '../lib/temas/tipos'

/** Aba inicial vinda da rota: `#/temas/pessoais` abre direto em "Meus temas". */
export default function TemasPage({ abaInicial = 'comunidade' }: { abaInicial?: Aba }) {
  const [tipo, setTipo] = useState<TipoTema>('baralho')
  const [aba, setAba] = useState<Aba>(abaInicial)

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="font-display text-2xl text-nebula">Temas</h1>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-mist/80">
            Baralhos e panos criados por quem usa o site. Escolha um para a sua mesa, salve os que
            gostar — ou monte o seu com as suas imagens.
          </p>
        </div>
        <a
          href="#/temas/novo"
          className="rounded-full px-5 py-2.5 text-[15px] font-medium text-star transition"
          style={{
            background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
            boxShadow: '0 10px 30px -12px #c2449d',
          }}
        >
          ✦ Criar um tema
        </a>
      </header>

      <div className="mb-4 flex gap-2">
        {(['baralho', 'pano'] as TipoTema[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className="rounded-full px-4 py-2 text-[15px] tracking-wide transition"
            style={{
              color: tipo === t ? '#fff' : '#cbbde8',
              background: tipo === t ? '#ffffff14' : 'transparent',
              boxShadow: tipo === t ? '0 0 22px -8px var(--color-violet)' : 'none',
            }}
          >
            {t === 'baralho' ? 'Baralhos' : 'Panos'}
          </button>
        ))}
      </div>

      <div className="min-h-[60vh]">
        <AcervoTemas tipo={tipo} aba={aba} onAba={setAba} />
      </div>
    </main>
  )
}
