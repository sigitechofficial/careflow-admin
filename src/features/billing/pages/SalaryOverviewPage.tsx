import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingSalaryOverviewPanel } from '@/features/billing/components/BillingSalaryOverviewPanel'

export default function SalaryOverviewPage() {
  return (
    <BillingSectionLayout
      title="Salary"
      description="Employee salary for the current period — visit pay, amounts already paid, rejected visits, fines, and penalties."
      testId="billing-salary-page"
    >
      <BillingSalaryOverviewPanel />
    </BillingSectionLayout>
  )
}
