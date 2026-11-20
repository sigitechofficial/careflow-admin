import { useParams } from '@tanstack/react-router'
import { UserCheck } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { useEmployee } from '@/features/employees/hooks/useEmployees'
import { EmployeeAccountReviewCard } from '@/features/employees/components/EmployeeAccountReviewCard'

/**
 * Route: `/employee/$employeeId/review` — a carer's Care app sign-up or delete request, for the review roles
 * (Manager, Branch Admin, Admin, Super Admin). Opens with `employees.read`, so a reviewer who cannot edit staff
 * records can still approve or decline (20 Nov 2026).
 */
export default function EmployeeAccountReviewPage() {
  const params = useParams({ strict: false }) as { employeeId?: string }
  const employeeId = params.employeeId ?? ''
  const { data: employee } = useEmployee(employeeId)
  const name =
    [employee?.personalDetail?.firstName, employee?.personalDetail?.lastName].filter(Boolean).join(' ').trim() || 'Carer'

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Care app request: ${name}`}
        description="Approve or decline this carer’s Care app sign-up or account delete request."
        icon={<UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'My tasks', href: '/my-tasks' }, { label: name }]}
      />
      {employeeId ? (
        <EmployeeAccountReviewCard employeeId={employeeId} />
      ) : (
        <p className="text-sm text-muted-foreground">Missing carer id in the URL.</p>
      )}
    </div>
  )
}
