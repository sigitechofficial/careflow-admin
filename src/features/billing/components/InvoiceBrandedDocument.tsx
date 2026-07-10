import * as React from 'react'
import type { InvoiceOrganisation } from '@/features/billing/hooks/useInvoiceOrganisation'

export function InvoiceBrandedHeader({ org }: { org: InvoiceOrganisation }) {
  return (
    <div className="relative bg-primary px-6 pb-5 pt-4 text-primary-foreground">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-2xl font-bold tracking-tight">Invoice</p>
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt=""
              className="h-8 max-w-36 rounded border border-primary-foreground/35 bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-8 w-36 items-center justify-center rounded border border-primary-foreground/35 bg-primary-foreground/10 text-[10px] font-medium uppercase tracking-wide">
              Company logo
            </div>
          )}
        </div>
        <div className="min-w-[200px] text-right text-xs leading-snug">
          <p className="text-sm font-bold">{org.companyName || '—'}</p>
          {org.phone ? <p className="mt-1">{org.phone}</p> : null}
          {org.email ? <p>{org.email}</p> : null}
          {org.website ? <p>{org.website}</p> : null}
          {org.vatNumber ? (
            <p className="text-primary-foreground/85">VAT {org.vatNumber}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function InvoiceBrandedFooter({ org }: { org: InvoiceOrganisation }) {
  return (
    <div className="flex h-10 items-center justify-end bg-primary px-6 text-xs font-medium text-primary-foreground">
      {org.companyName || '—'}
    </div>
  )
}

export function InvoiceDocumentShell({
  org,
  children,
}: {
  org: InvoiceOrganisation
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-sm">
      <InvoiceBrandedHeader org={org} />
      {children}
      <InvoiceBrandedFooter org={org} />
    </div>
  )
}
