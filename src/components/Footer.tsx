import { site } from '../data/site'
import SocialLinks from './SocialLinks'

const CONTACT = [
  { label: 'WhatsApp', href: site.contact.whatsapp },
  { label: 'E-mail', href: site.contact.email },
]

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 px-5 py-14">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
        <p className="font-display text-2xl tracking-[0.2em] text-star">
          <span aria-hidden className="text-gold">
            ✦
          </span>{' '}
          {site.brand}{' '}
          <span aria-hidden className="text-gold">
            ✦
          </span>
        </p>

        <SocialLinks />

        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {CONTACT.map((l) => {
            const pending = l.href === '#'
            return (
              <a
                key={l.label}
                href={l.href}
                onClick={pending ? (e) => e.preventDefault() : undefined}
                aria-disabled={pending || undefined}
                title={pending ? `${l.label} — em breve` : l.label}
                className="text-[15px] tracking-wide text-mist transition hover:text-gold"
              >
                {l.label}
              </a>
            )
          })}
        </nav>

        <a href="#/armazenamento" className="text-[14px] text-mist/80 underline underline-offset-4 transition hover:text-gold">
          Cookies e armazenamento
        </a>

        <p className="max-w-md text-[13px] leading-relaxed text-mist/55">{site.footerNote}</p>
      </div>
    </footer>
  )
}
