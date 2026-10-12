import { Banknote } from 'lucide-react'
import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingEmployeePayoutsPanel } from '@/features/billing/components/BillingEmployeePayoutsPanel'

export default function EmployeePayoutsPage() {
  return (
    <BillingSectionLayout
      title="Employee payouts"
      description="Bank payout of UK Payroll net pay. Create a batch from a closed UK run; a different user approves it; then record the bank payment once the money has left the account. On the 4th a draft batch is proposed for last month's closed runs. Nothing is approved or marked paid automatically."
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
