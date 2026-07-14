import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingPayrollRunsPanel } from '@/features/billing/components/BillingPayrollRunsPanel'

export default function PayrollRunsPage() {
  return (
    <BillingSectionLayout
      title="Payroll runs"
      description="Create and process carer payroll for a billing period — calculate, review, approve, lock, and export."
      testId="billing-payroll-runs-page"
    >
      <BillingPayrollRunsPanel />
    </BillingSectionLayout>
  )
}
