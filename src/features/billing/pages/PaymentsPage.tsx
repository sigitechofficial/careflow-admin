import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingPaymentsPanel } from '@/features/billing/components/BillingPaymentsPanel'

export default function PaymentsPage() {
  return (
    <BillingSectionLayout
      title="Payments"
      description="Record remittances and match them to locked invoice runs for credit control."
      testId="billing-payments-page"
    >
      <BillingPaymentsPanel />
    </BillingSectionLayout>
  )
}
