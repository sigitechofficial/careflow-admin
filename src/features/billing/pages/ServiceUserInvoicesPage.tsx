import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingServiceUserInvoicesPanel } from '@/features/billing/components/BillingServiceUserInvoicesPanel'

export default function ServiceUserInvoicesPage() {
  return (
    <BillingSectionLayout
      title="Service user invoices"
      description="Invoices per service user by month — how many, which are sent to funders, and which are still outstanding."
      testId="billing-service-user-invoices-page"
    >
      <BillingServiceUserInvoicesPanel />
    </BillingSectionLayout>
  )
}
