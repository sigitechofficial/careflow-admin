import { Wallet } from 'lucide-react'
import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingSalaryOverviewPanel } from '@/features/billing/components/BillingSalaryOverviewPanel'

export default function SalaryOverviewPage() {
  return (
    <BillingSectionLayout
      title="Salary"
      description="Employee visit-pay salary for the period — net after fines/penalties, visit-pay runs, and bank payouts. Automatic payout executes on the 4th of each month for the previous month."
      testId="billing-salary-page"
      icon={
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Wallet className="h-4 w-4" aria-hidden />
        </span>
      }
    >
      <BillingSalaryOverviewPanel />
    </BillingSectionLayout>
  )
}
