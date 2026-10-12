import * as React from 'react'
import { Plus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeAllocations } from '@/features/employees/hooks/useEmployeeAllocations'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { AllocationsManager } from '@/features/employees/components/employee-allocations/AllocationsManager'

/** Employee record → Allocation: equipment, PPE and uniform issued to this employee. */
export function EmployeeEditAllocationsPanel({ employeeId }: { employeeId: string }) {
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const query = useEmployeeAllocations(employeeId)
  const [view, setView] = React.useState<'current' | 'all'>('current')
  const [assignOpen, setAssignOpen] = React.useState(false)

  const all = query.data ?? []
  const current = all.filter(r => r.status === 'ISSUED')
  const returnableOut = current.filter(r => r.itemType.returnable).length
  const rows = view === 'current' ? current : all
  const error =
    query.error instanceof ApiError ? query.error.message : query.error ? 'Could not load allocations.' : null

  return (
    <div className="space-y-4" data-testid="employee-edit-allocations-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Allocation</h2>
          <p className="text-xs text-muted-foreground">
            Equipment, PPE and uniform issued to this employee.{' '}
            {query.isLoading
              ? ''
              : `${current.length} item${current.length === 1 ? '' : 's'} with the employee` +
                (returnableOut ? ` · ${returnableOut} to be returned when they leave` : '')}
          </p>
        </div>
        {canUpdate ? (
          <Button type="button" size="sm" onClick={() => setAssignOpen(true)} data-testid="allocation-assign">
            <Plus className="mr-1 h-4 w-4" />
            Assign item
          </Button>
        ) : null}
      </div>

      <div className="inline-flex rounded-md border border-border p-0.5 text-sm" role="tablist">
        {(
          [
            ['current', `With employee (${current.length})`],
            ['all', `All history (${all.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={cn(
              'rounded px-3 py-1',
              view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AllocationsManager
        rows={rows}
        loading={query.isLoading}
        canUpdate={canUpdate}
        emptyText={view === 'current' ? 'Nothing is allocated to this employee.' : 'No allocations yet.'}
        employeeId={employeeId}
        assignOpen={assignOpen}
        onAssignOpenChange={setAssignOpen}
      />
    </div>
  )
}
