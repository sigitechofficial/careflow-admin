import { useRouterState } from '@tanstack/react-router'
import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingInvoiceAuditTrailPanel } from '@/features/billing/components/BillingInvoiceAuditTrailPanel'

function invoiceRunIdFromSearch(search: unknown): string | undefined {
  if (!search || typeof search !== 'object') return undefined
  const value = (search as { invoiceRunId?: unknown }).invoiceRunId
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export default function InvoiceAuditTrailPage() {
  const search = useRouterState({ select: s => s.location.search })
  const invoiceRunId = invoiceRunIdFromSearch(search)

  return (
    <BillingSectionLayout
      title="Invoice audit trail"
      description="Complete who / what / when history for invoice runs — create, calculate, approve, lock, send, email, export, and payments."
      testId="billing-invoice-audit-trail-page"
    >
      <BillingInvoiceAuditTrailPanel initialInvoiceRunId={invoiceRunId} />
    </BillingSectionLayout>
  )
}
