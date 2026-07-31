import { Banknote } from 'lucide-react'
import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingEmployeePayoutsPanel } from '@/features/billing/components/BillingEmployeePayoutsPanel'

export default function EmployeePayoutsPage() {
  return (
    <BillingSectionLayout
      title="Employee payouts"
      description="Bank payout batches for visit-pay net — create, approve, mark paid, and review full history. Auto-runs on the 4th of each month for the previous month."
      testId="billing-employee-payouts-page"
      icon={
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <Banknote className="h-4 w-4" aria-hidden />
        </span>
      }
    >
      <BillingEmployeePayoutsPanel />
    </BillingSectionLayout>
  )
}
