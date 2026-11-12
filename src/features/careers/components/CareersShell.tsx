import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Mail, Phone } from 'lucide-react'
import { useCompanyBranding } from '@/features/settings/hooks/useCompanySettings'
import { resolveMediaUrl } from '@/shared/lib/media-url'

/** Public careers layout: the organisation's name and logo, the page, and contact details. No login, no app menu. */
export function CareersShell({ children }: { children: React.ReactNode }) {
  const branding = useCompanyBranding().data
  const name = branding?.displayName?.trim() || branding?.companyName?.trim() || 'Careers'
  const logo = resolveMediaUrl(branding?.displayLogoUrl, branding?.updatedAt)

  React.useEffect(() => {
    document.title = `Careers – ${name}`
  }, [name])

  return (
    // The app locks html/body/#root (overflow: hidden) for its own shell, so this page scrolls itself.
    <div
      id={CAREERS_SCROLL_ID}
      className="h-full overflow-y-auto overscroll-y-contain bg-muted/30 text-foreground"
    >
      <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/careers" className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-bold leading-tight">{name}</span>
              <span className="block text-xs text-muted-foreground">Careers</span>
            </span>
          </Link>
          {branding?.companyWebsite ? (
            <a
              href={branding.companyWebsite.startsWith('http') ? branding.companyWebsite : `https://${branding.companyWebsite}`}
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Visit our website
            </a>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-10">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} {name}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {branding?.email ? (
              <a href={`mailto:${branding.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="h-4 w-4" aria-hidden /> {branding.email}
              </a>
            ) : null}
            {branding?.phoneNumber ? (
              <a href={`tel:${branding.phoneNumber}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="h-4 w-4" aria-hidden /> {branding.phoneNumber}
              </a>
            ) : null}
            <Link to="/legal/privacy-policy" className="hover:text-foreground">
              Privacy policy
            </Link>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}

/** The careers page's own scroll container (see CareersShell). */
export const CAREERS_SCROLL_ID = 'careers-scroll'

export function scrollCareersToTop() {
  document.getElementById(CAREERS_SCROLL_ID)?.scrollTo({ top: 0, behavior: 'smooth' })
}
