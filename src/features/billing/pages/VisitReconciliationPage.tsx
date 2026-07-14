import { useRouterState } from '@tanstack/react-router'
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
    >
      <BillingVisitReconciliationPanel
        initialEmployeeId={search.employeeId}
        initialServiceUserId={search.serviceUserId}
      />
    </BillingSectionLayout>
  )
}
