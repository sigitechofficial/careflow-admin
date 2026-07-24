import { useRouterState } from '@tanstack/react-router'
import { ClipboardCheck } from 'lucide-react'
import { BillingSectionLayout } from '@/features/billing/components/BillingSectionLayout'
import { BillingVisitReconciliationPanel } from '@/features/billing/components/BillingVisitReconciliationPanel'

export default function VisitReconciliationPage() {
  const search = useRouterState({
    select: s =>
      s.location.search as { employeeId?: string; serviceUserId?: string },
  })

  return (
    <BillingSectionLayout
      title="Visit reconciliation"
      description="Review completed visits, resolve exceptions, and approve payable and billable time before payroll or invoicing."
      testId="billing-visit-reconciliation-page"
      icon={
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <ClipboardCheck className="h-4 w-4" aria-hidden />
        </span>
      }
    >
      <BillingVisitReconciliationPanel
        initialEmployeeId={search.employeeId}
        initialServiceUserId={search.serviceUserId}
      />
    </BillingSectionLayout>
  )
}
