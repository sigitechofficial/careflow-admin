import * as React from 'react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { EmployeeAllocationRegistryRow, EmployeeAllocationRow } from '@/features/employees/types'
import {
  useDeleteEmployeeAllocation,
  useUpdateEmployeeAllocation,
} from '@/features/employees/hooks/useEmployeeAllocations'
import type { ComboboxOption } from '@/shared/ui/combobox'
import { AllocationsTable } from '@/features/employees/components/employee-allocations/AllocationsTable'
import {
  AllocationFormDialog,
  ReturnAllocationDialog,
} from '@/features/employees/components/employee-allocations/AllocationDialogs'

type Row = EmployeeAllocationRow & Partial<Pick<EmployeeAllocationRegistryRow, 'employeeDisplayName'>>

/** Table + assign / edit / return dialogs, shared by the employee tab and the overview list. */
export function AllocationsManager({
  rows,
  loading,
  canUpdate,
  emptyText,
  employeeId,
  employeeOptions,
  assignOpen,
  onAssignOpenChange,
}: {
  rows: Row[]
  loading: boolean
  canUpdate: boolean
  emptyText: string
  /** Set on the employee tab; omitted on the overview (employee chosen in the dialog). */
  employeeId?: string
  employeeOptions?: ComboboxOption[]
  assignOpen: boolean
  onAssignOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateEmployeeAllocation()
  const deleteMutation = useDeleteEmployeeAllocation()
  const [editing, setEditing] = React.useState<Row | null>(null)
  const [returning, setReturning] = React.useState<Row | null>(null)

  const onReissue = async (row: Row) => {
    if (!window.confirm(`Mark ${row.itemType.name} as back with the employee?`)) return
    try {
      await updateMutation.mutateAsync({
        employeeId: row.employeeId,
        allocationId: row.id,
        body: { status: 'ISSUED' },
      })
      toastSuccess('Allocation updated', `${row.itemType.name} is with the employee again.`)
    } catch (e) {
      toastApiError(e, 'Update failed.')
    }
  }

  const onDelete = async (row: Row) => {
    if (!window.confirm(`Delete this ${row.itemType.name} allocation? Use "Mark returned" if it came back.`)) return
    try {
      await deleteMutation.mutateAsync({ employeeId: row.employeeId, allocationId: row.id })
      toastSuccess('Allocation deleted', `${row.itemType.name} removed.`)
    } catch (e) {
      toastApiError(e, 'Delete failed.')
    }
  }

  return (
    <>
      <AllocationsTable
        rows={rows}
        loading={loading}
        showEmployee={!employeeId}
        canUpdate={canUpdate}
        emptyText={emptyText}
        onEdit={setEditing}
        onReturn={setReturning}
        onReissue={row => void onReissue(row)}
        onDelete={row => void onDelete(row)}
      />
      <AllocationFormDialog
        open={assignOpen || Boolean(editing)}
        onOpenChange={open => {
          if (open) return
          onAssignOpenChange(false)
          setEditing(null)
        }}
        employeeId={employeeId}
        employeeOptions={employeeOptions}
        editing={editing}
      />
      <ReturnAllocationDialog row={returning} onOpenChange={open => !open && setReturning(null)} />
    </>
  )
}
