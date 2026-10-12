import { Link } from '@tanstack/react-router'
import { PenLine, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import type { EmployeeAllocationRegistryRow, EmployeeAllocationRow } from '@/features/employees/types'
import { Badge } from '@/shared/ui/badge'
import {
  ALLOCATION_CATEGORY_LABEL,
  ALLOCATION_STATUS_LABEL,
  allocationStatusVariant,
  isAllocationReturnOverdue,
} from '@/features/employees/components/employee-allocations/allocation-labels'

type Row = EmployeeAllocationRow & Partial<Pick<EmployeeAllocationRegistryRow, 'employeeDisplayName'>>

function IconButton({
  title,
  onClick,
  danger,
  testId,
  children,
}: {
  title: string
  onClick: () => void
  danger?: boolean
  testId?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      data-testid={testId}
      onClick={onClick}
      className={
        danger
          ? 'rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'rounded-md p-1.5 text-primary hover:bg-primary/10'
      }
    >
      {children}
    </button>
  )
}

/** Allocation rows for one employee, or across employees when `showEmployee` is set. */
export function AllocationsTable({
  rows,
  loading,
  showEmployee,
  canUpdate,
  emptyText,
  onEdit,
  onReturn,
  onReissue,
  onDelete,
}: {
  rows: Row[]
  loading: boolean
  showEmployee?: boolean
  canUpdate: boolean
  emptyText: string
  onEdit: (row: Row) => void
  onReturn: (row: Row) => void
  onReissue: (row: Row) => void
  onDelete: (row: Row) => void
}) {
  const today = operationalTodayIso()
  const headers = [
    ...(showEmployee ? ['Employee'] : []),
    'Item',
    'Qty',
    'Size',
    'Serial / asset no.',
    'Issued',
    'Return due',
    'Status',
    'Notes',
    ...(canUpdate ? ['Actions'] : []),
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" data-testid="allocations-table">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map(h => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-muted-foreground">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map(row => {
              const overdue = isAllocationReturnOverdue(row, today)
              return (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                  data-testid="allocation-row"
                  data-status={row.status}
                >
                  {showEmployee ? (
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link
                        to="/employee/$employeeId/edit"
                        params={{ employeeId: row.employeeId }}
                        search={{ tab: 'allocation' }}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.employeeDisplayName ?? '—'}
                      </Link>
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{row.itemType.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ALLOCATION_CATEGORY_LABEL[row.itemType.category]}
                      {row.itemType.returnable ? ' · returnable' : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.quantity}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.size ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.serialNumber ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    <div>{formatOrganisationDateTime(row.issuedAt)}</div>
                    {row.issuedByName ? <div className="text-xs">by {row.issuedByName}</div> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {row.expectedReturnAt ? formatOrganisationDate(row.expectedReturnAt, { utc: true }) : '—'}
                    {overdue ? (
                      <Badge size="sm" variant="warning" className="ml-1.5">
                        Overdue
                      </Badge>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Badge size="sm" variant={allocationStatusVariant(row.status)}>
                      {ALLOCATION_STATUS_LABEL[row.status]}
                    </Badge>
                    {row.returnedAt ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatOrganisationDateTime(row.returnedAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-3 py-2.5 text-muted-foreground">
                    {row.notes ? <div className="whitespace-pre-wrap">{row.notes}</div> : null}
                    {row.returnNotes ? (
                      <div className="whitespace-pre-wrap text-xs">Return: {row.returnNotes}</div>
                    ) : null}
                    {!row.notes && !row.returnNotes ? '—' : null}
                  </td>
                  {canUpdate ? (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {row.status === 'ISSUED' ? (
                          <IconButton title="Mark returned" onClick={() => onReturn(row)} testId="allocation-return">
                            <Undo2 className="h-4 w-4" />
                          </IconButton>
                        ) : (
                          <IconButton title="Back with employee" onClick={() => onReissue(row)} testId="allocation-reissue">
                            <RotateCcw className="h-4 w-4" />
                          </IconButton>
                        )}
                        <IconButton title="Edit" onClick={() => onEdit(row)} testId="allocation-edit">
                          <PenLine className="h-4 w-4" />
                        </IconButton>
                        <IconButton title="Delete" danger onClick={() => onDelete(row)} testId="allocation-delete">
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  ) : null}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
