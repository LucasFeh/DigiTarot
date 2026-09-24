import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { site } from '../data/site'
import { useAuth } from '../lib/useAuth'

const LINKS = [
  { href: '#/', rotulo: 'Home', combina: (c: string) => c === '/', preparar: () => import('../pages/HomePage') },
  { href: '#/tarologos', rotulo: 'Tarólogos', combina: (c: string) => c.startsWith('/tarologos'), preparar: () => import('../pages/TarologosPage') },
  { href: '#/mesa-digital', rotulo: 'Tiragem digital', combina: (c: string) => c.startsWith('/mesa-digital'), preparar: () => import('../pages/MesaDigitalDemoPage') },
]

function prepararRota(carregar: () => Promise<unknown>) {
  void carregar().catch(() => {
    // A navegação normal ainda poderá tentar carregar a página de novo.
  })
}

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
  const [posicaoMenu, setPosicaoMenu] = useState({ top: 64, left: 8 })
  const caixa = useRef<HTMLDivElement>(null)
  const painelMenu = useRef<HTMLDivElement>(null)

  function atualizarPosicaoMenu() {
    if (!caixa.current) return
    const ancora = caixa.current.getBoundingClientRect()
    setPosicaoMenu({
      top: ancora.bottom + 8,
      left: Math.max(8, Math.min(ancora.right - 224, window.innerWidth - 232)),
    })
  }

  // Fecha o menu ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!menu) return
    const fora = (e: PointerEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)
        && !painelMenu.current?.contains(e.target as Node)) setMenu(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', atualizarPosicaoMenu)
    window.addEventListener('scroll', atualizarPosicaoMenu, true)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', atualizarPosicaoMenu)
      window.removeEventListener('scroll', atualizarPosicaoMenu, true)
    }
  }, [menu])

  return (
    <header className="sticky top-0 z-[70] border-b border-white/10 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:flex-nowrap sm:px-5 sm:py-0">
        <a
          href="#/"
          onClick={(e) => irParaTopo(e, '#/')}
          onPointerEnter={() => prepararRota(LINKS[0].preparar)}
          onFocus={() => prepararRota(LINKS[0].preparar)}
          className="font-display text-lg tracking-[0.18em] text-star transition hover:text-gold"
        >
          <span aria-hidden className="mr-1.5 text-gold">
            ✦
          </span>
          {site.brand}
        </a>

        <nav className="site-main-nav flex w-full items-center justify-between gap-0 overflow-x-auto sm:w-auto sm:gap-2" aria-label="Navegação principal">
          {LINKS.map((l) => {
            const ativo = l.combina(caminho)
            return (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => irParaTopo(e, l.href)}
                onPointerEnter={() => prepararRota(l.preparar)}
                onFocus={() => prepararRota(l.preparar)}
                aria-current={ativo ? 'page' : undefined}
                className="shrink-0 rounded-full px-2 py-2 text-[12px] tracking-wide transition sm:px-4 sm:text-[15px]"
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
                onClick={() => {
                  atualizarPosicaoMenu()
                  setMenu((v) => !v)
                }}
                aria-expanded={menu}
                aria-haspopup="menu"
                className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[15px] text-mist transition hover:text-star"
              >
                <Avatar nome={usuario.nome} foto={usuario.foto} />
                <span className="hidden max-w-[10ch] truncate sm:inline">{usuario.nome}</span>
              </button>

              {menu && createPortal(
                <div
                  role="menu"
                  ref={painelMenu}
                  style={{ top: posicaoMenu.top, left: posicaoMenu.left }}
                  className="glass fixed z-[100] max-h-[calc(100dvh-7rem)] w-56 overflow-y-auto rounded-2xl py-1.5 text-[15px] shadow-2xl"
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
                    onPointerEnter={() => prepararRota(() => import('../pages/PerfilPage'))}
                    onFocus={() => prepararRota(() => import('../pages/PerfilPage'))}
                    onClick={() => setMenu(false)}
                    className="block px-4 py-2.5 text-mist transition hover:bg-white/5 hover:text-star"
                  >
                    Meu perfil
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
                </div>, document.body,
              )}
            </div>
          ) : (
            <a
              href="#/tiragem"
              onPointerEnter={() => prepararRota(() => import('../pages/TiragemPage'))}
              onFocus={() => prepararRota(() => import('../pages/TiragemPage'))}
              className="ml-1 shrink-0 rounded-full px-3 py-2 text-[12px] font-medium tracking-wide text-star transition sm:px-4 sm:text-[15px]"
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
