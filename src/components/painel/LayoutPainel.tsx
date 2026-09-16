import type { ReactNode } from 'react'

export type ItemMenu<T extends string> = {
  id: T
  rotulo: string
  icone: string
  /** Número ao lado do rótulo — some quando zero. */
  contagem?: number
}

/**
 * A casca de painel com menu à esquerda, usada pela tiragem digital e pelo
 * perfil.
 *
 * Nasceu de um copiar-e-colar entre as duas telas. A segunda cópia já tinha
 * divergido na altura do avatar e no comportamento em celular, o que é o
 * começo de duas interfaces que deveriam ser uma.
 */
export default function LayoutPainel<T extends string>({
  titulo,
  subtitulo,
  avatar,
  itens,
  atual,
  aoEscolher,
  children,
}: {
  titulo: string
  subtitulo: string
  /** Foto, inicial, o que a tela quiser pôr no topo do menu. */
  avatar: ReactNode
  itens: ItemMenu<T>[]
  atual: T
  aoEscolher: (id: T) => void
  children: ReactNode
}) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <nav
        data-painel
        className="w-full shrink-0 border-white/10 bg-void/35 backdrop-blur-xl md:w-[300px] md:border-r"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          {avatar}
          <span className="min-w-0">
            <span className="block truncate text-[16px] text-star">{titulo}</span>
            <span className="block truncate text-[12px] uppercase tracking-[0.14em] text-mist/55">
              {subtitulo}
            </span>
          </span>
        </div>

        {/* Em celular o menu vira uma faixa rolável no topo: empilhar seis itens
            antes do conteúdo empurraria a tela inteira para baixo da dobra. */}
        <div className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
          {itens.map((i) => {
            const on = i.id === atual
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => aoEscolher(i.id)}
                aria-current={on ? 'page' : undefined}
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-3 text-left text-[15px] transition md:shrink"
                style={{
                  color: on ? '#fff' : '#cbbde8',
                  background: on ? '#ffffff14' : 'transparent',
                  boxShadow: on ? 'inset 2px 0 0 var(--color-gold)' : 'none',
                }}
              >
                <span aria-hidden className="text-lilac">
                  {i.icone}
                </span>
                {i.rotulo}
                {Boolean(i.contagem) && (
                  <span className="ml-auto rounded-full bg-gold/20 px-2 py-0.5 text-[12px] text-gold">
                    {i.contagem}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <section className="min-w-0 flex-1 px-5 py-8 md:px-10 md:py-10">{children}</section>
    </main>
  )
}
