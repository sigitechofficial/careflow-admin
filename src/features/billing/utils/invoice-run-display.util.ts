import type { InvoiceRunDetail } from '@/features/billing/api/invoice-runs.api'

export function formatUkDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

export function invoiceRunRef(
  invoiceRun: Pick<InvoiceRunDetail, 'periodEnd' | 'id'>,
  funderCode?: string | null,
): string {
  const end = invoiceRun.periodEnd.replace(/-/g, '')
  const suffix = funderCode?.trim() || invoiceRun.id.slice(0, 4).toUpperCase()
  return `INV-${end}-${suffix}`
}
