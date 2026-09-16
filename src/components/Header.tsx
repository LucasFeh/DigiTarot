import { useEffect, useRef, useState } from 'react'
import { site } from '../data/site'
import { useAuth } from '../lib/useAuth'

const LINKS = [
  { href: '#/', rotulo: 'Home', combina: (c: string) => c === '/' },
  { href: '#/tiragem', rotulo: 'Tiragem digital', combina: (c: string) => c.startsWith('/tiragem') },
]

/** Rola ao topo quando já se está na home — o `hashchange` não dispara sozinho
 *  se o hash não muda (clicar em "Home" estando em `#/`). */
function irParaTopo(e: React.MouseEvent, href: string) {
  if (href !== '#/' || window.location.hash.startsWith('#/tiragem')) return
  if (window.location.hash === '#/' || window.location.hash === '') {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function Avatar({ nome, foto }: { nome: string; foto?: string }) {
  if (foto) return <img src={foto} alt="" className="h-9 w-9 rounded-full object-cover" />
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-violet/40 text-[13px] font-semibold text-star">
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

export default function Header({ caminho }: { caminho: string }) {
  const { usuario, sair, backend } = useAuth()
  const [menu, setMenu] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  // Fecha o menu ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!menu) return
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setMenu(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  return (
    <header className="sticky top-0 z-[70] border-b border-white/10 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <a
          href="#/"
          onClick={(e) => irParaTopo(e, '#/')}
          className="font-display text-lg tracking-[0.18em] text-star transition hover:text-gold"
        >
          <span aria-hidden className="mr-1.5 text-gold">
            ✦
          </span>
          {site.brand}
        </a>

        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => {
            const ativo = l.combina(caminho)
            return (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => irParaTopo(e, l.href)}
                aria-current={ativo ? 'page' : undefined}
                className="rounded-full px-3 py-2 text-[15px] tracking-wide transition sm:px-4"
                style={{
                  color: ativo ? '#fff' : '#cbbde8',
                  background: ativo ? '#ffffff14' : 'transparent',
                  boxShadow: ativo ? '0 0 22px -8px var(--color-violet)' : 'none',
                }}
              >
                {l.rotulo}
              </a>
            )
          })}

          {usuario ? (
            <div className="relative ml-1" ref={caixa}>
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-haspopup="menu"
                className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[15px] text-mist transition hover:text-star"
              >
                <Avatar nome={usuario.nome} foto={usuario.foto} />
                <span className="hidden max-w-[10ch] truncate sm:inline">{usuario.nome}</span>
              </button>

              {menu && (
                <div
                  role="menu"
                  className="glass absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl py-1.5 text-[15px]"
                >
                  <p className="truncate px-4 py-2 text-[13px] text-mist/70">{usuario.email}</p>
                  {usuario.papel === 'tarologo' && (
                    <p className="mx-4 mb-1 rounded-full border border-gold/40 px-2 py-0.5 text-center text-[12px] uppercase tracking-[0.14em] text-gold">
                      tarólogo
                    </p>
                  )}
                  <a
                    href="#/perfil"
                    role="menuitem"
                    onClick={() => setMenu(false)}
                    className="block px-4 py-2.5 text-mist transition hover:bg-white/5 hover:text-star"
                  >
                    Perfil
                  </a>
                  <a
                    href="#/tiragem"
                    role="menuitem"
                    onClick={() => setMenu(false)}
                    className="block px-4 py-2.5 text-mist transition hover:bg-white/5 hover:text-star"
                  >
                    Tiragem digital
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false)
                      void sair()
                    }}
                    className="block w-full px-4 py-2.5 text-left text-mist transition hover:bg-white/5 hover:text-star"
                  >
                    Sair
                  </button>
                  {backend?.modo === 'local' && (
                    <p className="border-t border-white/10 px-4 py-2 text-[12px] leading-snug text-mist/50">
                      Modo local: dados só neste navegador.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <a
              href="#/tiragem"
              className="ml-1 rounded-full px-4 py-2 text-[15px] font-medium tracking-wide text-star transition"
              style={{
                background: 'linear-gradient(100deg, #6d3fd4, #c2449d)',
                boxShadow: '0 10px 30px -12px #c2449d',
              }}
            >
              Entrar
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
