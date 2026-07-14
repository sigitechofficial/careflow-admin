import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingInvoiceRunsPanel } from '@/features/billing/components/BillingInvoiceRunsPanel'

export default function InvoiceRunsPage() {
  return (
    <BillingSectionLayout
      title="Invoice runs"
      description="Batch approved billable visits into funder invoices — calculate, approve, lock, and send."
      testId="billing-invoice-runs-page"
    >
      <BillingInvoiceRunsPanel />
    </BillingSectionLayout>
  )
}
