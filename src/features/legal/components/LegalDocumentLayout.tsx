import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CompanyBrandingPublicBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { CompanyBrandMark } from '@/components/company/CompanyBrandMark'
import { useCompanyStore } from '@/store/company.store'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'

type Props = {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export function LegalDocumentLayout({ title, lastUpdated, children }: Props) {
  const displayName = useCompanyStore(s => s.branding?.displayName?.trim() || 'CareAdmin')

  return (
    <div className="h-dvh overflow-y-auto overscroll-y-contain bg-muted/30">
      <CompanyBrandingPublicBootstrap />
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <CompanyBrandMark />
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/auth/login">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Sign in
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <ContentCard className="space-y-8">
          <div className="space-y-2 border-b border-border pb-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Legal
            </p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated} · {displayName}
            </p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-foreground/90">{children}</div>
        </ContentCard>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {displayName}. All rights reserved.
        </p>
      </main>
    </div>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  )
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
