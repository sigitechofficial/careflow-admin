import { useParams } from '@tanstack/react-router'
import AddEmployeePage from '@/features/employees/pages/AddEmployeePage'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'

/** Route: `/employee/$employeeId/edit` — reuses the add-employee wizard in edit mode. */
export default function EditEmployeePage() {
  const params = useParams({ strict: false }) as { employeeId?: string }
  const employeeId = params.employeeId ?? ''
  if (!employeeId) {
    return (
      <div
        className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground"
        data-testid="employee-edit-missing-id"
        role="alert"
      >
        Missing employee id in the URL.
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <PolicyContextPanel moduleType="EMPLOYEE" recordId={employeeId} />
      <AddEmployeePage editEmployeeId={employeeId} />
    </div>
  )
}
