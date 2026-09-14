import type { ReactNode } from 'react'
import { socials, type SocialId } from '../data/site'

const ICONS: Record<SocialId, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.2" cy="6.8" r="1.25" fill="currentColor" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.6-2.6c.27 0 .53.04.78.12V9.75a5.7 5.7 0 1 0 4.91 5.64V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  ),
}

/**
 * Ícones das redes. Enquanto o `href` for '#', o link não navega e se anuncia
 * como "em breve" — trocando por uma URL real ele vira um link normal, que abre
 * em nova aba, sem precisar mexer aqui.
 */
export default function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      {socials.map((s) => {
        const pending = s.href === '#'
        return (
          <li key={s.id}>
            <a
              href={s.href}
              onClick={pending ? (e) => e.preventDefault() : undefined}
              aria-disabled={pending || undefined}
              target={pending ? undefined : '_blank'}
              rel={pending ? undefined : 'noreferrer'}
              aria-label={pending ? `${s.label} — em breve` : s.label}
              title={pending ? `${s.label} — em breve` : s.label}
              className="glass grid h-10 w-10 place-items-center rounded-full text-mist transition duration-300 hover:-translate-y-0.5 hover:border-gold/55 hover:text-star hover:shadow-[0_0_24px_-6px_var(--color-violet)] sm:h-11 sm:w-11"
            >
              {ICONS[s.id]}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
