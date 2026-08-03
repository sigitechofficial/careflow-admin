import { Banknote } from 'lucide-react'
import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingEmployeePayoutsPanel } from '@/features/billing/components/BillingEmployeePayoutsPanel'

export default function EmployeePayoutsPage() {
  return (
    <BillingSectionLayout
      title="Employee payouts"
      description="Bank payout of UK Payroll net (after W1/M1 PAYE/NI). Create from a statutory-calculated or closed UK run, approve, then mark paid. Auto-runs on the 4th when a matching UK run exists."
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
