import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Eye, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import { BillingExceptionBadge, VisitReconStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { VisitReconciliationDetailDialog } from '@/features/billing/components/VisitReconciliationDetailDialog'
import {
  useApproveVisitReconciliation,
  useBackfillVisitReconciliations,
  useBulkApproveVisitReconciliations,
  useClearAllVisitReconciliations,
  useRejectVisitReconciliation,
  useVisitReconciliations,
} from '@/features/billing/hooks/useVisitReconciliations'
import { useAuthStore } from '@/features/auth/store'
import {
  listBlockingExceptionCodes,
  type VisitReconciliationRow,
} from '@/features/billing/types/visit-reconciliation.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { listServiceUsers } from '@/features/service-users/api'
import { listAllEmployees } from '@/features/employees/api'

function serviceUserOptionLabel(row: {
  preferredName?: string | null
  firstName?: string | null
  lastName?: string | null
  serviceUserNumber?: string | null
}): string {
  const name =
    row.preferredName?.trim() ||
    `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() ||
    'Unnamed service user'
  return row.serviceUserNumber ? `${name} (${row.serviceUserNumber})` : name
}

function carerOptionLabel(row: {
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
}): string {
  return (
    row.fullName?.trim() ||
    `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() ||
    'Unnamed carer'
  )
}

type Props = {
  initialEmployeeId?: string
  initialServiceUserId?: string
}

export function BillingVisitReconciliationPanel({
  initialEmployeeId,
  initialServiceUserId,
}: Props = {}) {
  const canRead = useAuthStore(s => s.can('billing.visit_reconciliations.read' as never))
  const canManage = useAuthStore(s => s.can('billing.visit_reconciliations.manage' as never))
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [serviceUserId, setServiceUserId] = React.useState(initialServiceUserId ?? '')
  const [employeeId, setEmployeeId] = React.useState(initialEmployeeId ?? '')
  const [exceptionsOnly, setExceptionsOnly] = React.useState(false)

  React.useEffect(() => {
    if (initialEmployeeId) setEmployeeId(initialEmployeeId)
  }, [initialEmployeeId])

  React.useEffect(() => {
    if (initialServiceUserId) setServiceUserId(initialServiceUserId)
  }, [initialServiceUserId])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [detailRow, setDetailRow] = React.useState<VisitReconciliationRow | null>(null)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const serviceUsersQuery = useQuery({
    queryKey: ['billing', 'visit-reconciliation-service-user-options'],
    queryFn: () => listServiceUsers({ limit: 100, showInactive: false }),
    enabled: canRead,
    staleTime: 5 * 60 * 1000,
  })

  const carersQuery = useQuery({
    queryKey: ['billing', 'visit-reconciliation-carer-options'],
    queryFn: () => listAllEmployees({}),
    enabled: canRead,
    staleTime: 5 * 60 * 1000,
  })

  const serviceUserOptions = React.useMemo(
    () =>
      (serviceUsersQuery.data?.rows ?? []).map(row => ({
        value: row.id,
        label: serviceUserOptionLabel(row),
      })),
    [serviceUsersQuery.data],
  )

  const carerOptions = React.useMemo(
    () =>
      (carersQuery.data ?? []).map(row => ({
        value: row.id,
        label: carerOptionLabel(row),
      })),
    [carersQuery.data],
  )

  const query = useVisitReconciliations({
    search: debouncedSearch || undefined,
    serviceUserId: serviceUserId || undefined,
    employeeId: employeeId || undefined,
    hasExceptions: exceptionsOnly ? true : undefined,
    limit: 100,
  })
  const approveMutation = useApproveVisitReconciliation()
  const rejectMutation = useRejectVisitReconciliation()
  const bulkApproveMutation = useBulkApproveVisitReconciliations()
  const backfillMutation = useBackfillVisitReconciliations()
  const clearAllMutation = useClearAllVisitReconciliations()

  const rows = query.data?.rows ?? []
  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    bulkApproveMutation.isPending ||
    backfillMutation.isPending ||
    clearAllMutation.isPending

  const selectableIds = React.useMemo(() => rows.map(r => r.id), [rows])
  const allSelected =
    selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id))
  const someSelected = selectableIds.some(id => selectedIds.has(id))

  React.useEffect(() => {
    setSelectedIds(prev => {
      const visible = new Set(selectableIds)
      const next = new Set([...prev].filter(id => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [selectableIds])

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(selectableIds))
  }

  const handleApprove = async (id: string, managerOverride = false) => {
    await approveMutation.mutateAsync({ id, scope: 'BOTH', managerOverride })
  }

  const handleReject = async (id: string) => {
    await rejectMutation.mutateAsync({ id, scope: 'BOTH' })
  }

  const handleBulkApprove = async () => {
    const ids = selectedIds.size ? [...selectedIds] : rows.map(r => r.id)
    if (!ids.length) return
    await bulkApproveMutation.mutateAsync({ ids, scope: 'BOTH' })
    setSelectedIds(new Set())
  }

  const handleBackfill = async () => {
    try {
      const data = await backfillMutation.mutateAsync({})
      toastSuccess(
        data.count > 0
          ? `Synced ${data.count} visit reconciliation(s).`
          : 'No new completed visits to sync.',
      )
    } catch (err) {
      toastApiError(err, 'Could not sync completed visits.')
    }
  }

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      'Delete ALL visit reconciliations?\n\nThis also removes linked payroll and invoice lines for those visits. You can sync completed visits again afterwards.\n\nThis cannot be undone.',
    )
    if (!confirmed) return
    try {
      const data = await clearAllMutation.mutateAsync()
      setSelectedIds(new Set())
      setDetailRow(null)
      toastSuccess(
        data.visitReconciliations > 0
          ? `Deleted ${data.visitReconciliations} visit reconciliation(s).`
          : 'No visit reconciliations to delete.',
      )
    } catch (err) {
      toastApiError(err, 'Could not delete visit reconciliations.')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view visit reconciliation. Required:{' '}
        <span className="font-mono text-xs">billing.visit_reconciliations.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3" data-testid="visit-recon-toolbar">
        <h2 className="sr-only">Visit reconciliation</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Combobox
            options={serviceUserOptions}
            value={serviceUserId}
            onChange={setServiceUserId}
            placeholder="All service users"
            searchPlaceholder="Search service users…"
            emptyText="No service users found."
            loading={serviceUsersQuery.isLoading}
            aria-label="Filter by service user"
            data-testid="visit-recon-filter-service-user"
            className="h-8 w-[220px]"
            allowDeselect
          />
          <Combobox
            options={carerOptions}
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="All carers"
            searchPlaceholder="Search carers…"
            emptyText="No carers found."
            loading={carersQuery.isLoading}
            aria-label="Filter by carer"
            data-testid="visit-recon-filter-carer"
            className="h-8 w-[220px]"
            allowDeselect
          />
          <Input
            placeholder="Search visit or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-48"
            aria-label="Search visit reconciliations"
          />
          <Button
            variant={exceptionsOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExceptionsOnly(v => !v)}
          >
            {exceptionsOnly ? 'Showing exceptions' : 'Filter exceptions'}
          </Button>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBackfill()}
              disabled={isMutating}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Sync completed visits
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => void handleClearAll()}
              disabled={isMutating}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {clearAllMutation.isPending ? 'Deleting…' : 'Delete all'}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleBulkApprove()}
              disabled={isMutating || !rows.length}
            >
              {selectedIds.size
                ? `Bulk approve (${selectedIds.size})`
                : 'Bulk approve all'}
            </Button>
          </div>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visit reconciliations…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Failed to load visit reconciliations.</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <p>No visits awaiting reconciliation.</p>
          {canManage ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void handleBackfill()}
              disabled={isMutating}
            >
              Sync from completed visits
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {canManage ? (
                  <th className="px-3 py-2.5 w-10">
                    <input
                      ref={el => {
                        if (el) el.indeterminate = someSelected && !allSelected
                      }}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border"
                      aria-label="Select all visits"
                      title={allSelected ? 'Clear selection' : 'Select all'}
                    />
                  </th>
                ) : null}
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  EMONITORED
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Client ID
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Client First Name
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Client Second Name
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Client Address
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Client Post Code
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Visit Date
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Care Type
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Planned Arrival
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Planned Departure
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Actual Arrival
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Actual Departure
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Exceptions</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Details</th>
                {canManage ? (
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const needsManager = row.status === 'REQUIRES_MANAGER_APPROVAL'
                const blockingCodes = listBlockingExceptionCodes(row.exceptions)
                const hasBlocking = blockingCodes.length > 0
                const pendingOverrun =
                  (row.overrunMinutes ?? 0) > 0 &&
                  (row.overrunDecision === 'PENDING' || row.overrunDecision == null)
                const locked = row.status === 'LOCKED' || row.status === 'APPROVED_FOR_BOTH'
                return (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    {canManage ? (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelected(row.id)}
                          className="h-4 w-4 rounded border-border"
                          aria-label={`Select ${row.visitRef}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                      {row.emonitored ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                      {row.clientId || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.clientFirstName || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.clientSecondName || '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate" title={row.clientAddress}>
                      {row.clientAddress || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.clientPostCode || '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {row.visitDate || row.date}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.careType || '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {row.plannedArrival || '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {row.plannedDeparture || '—'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {row.actualArrival || '00:00:00'}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {row.actualDeparture || '00:00:00'}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.exceptions.length === 0 && !pendingOverrun && !(row.overrunMinutes && row.overrunDecision) ? (
                        <span className="text-xs text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(row.overrunMinutes ?? 0) > 0 ? (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                              +{row.overrunMinutes}m
                              {row.overrunDecision === 'APPROVED'
                                ? ' approved'
                                : row.overrunDecision === 'REJECTED'
                                  ? ' rejected'
                                  : ' pending'}
                            </span>
                          ) : null}
                          {row.exceptions.map(ex => (
                            <BillingExceptionBadge
                              key={ex}
                              code={ex}
                              serviceUserId={row.serviceUserId}
                              employeeId={row.employeeId}
                              scheduledJobId={row.scheduledJobId}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <VisitReconStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => setDetailRow(row)}
                      >
                        Details
                      </Button>
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={
                              hasBlocking
                                ? `Blocking exceptions must be fixed first: ${blockingCodes.join(', ')}`
                                : pendingOverrun
                                  ? 'Open Details to approve or reject overrun first'
                                  : needsManager
                                    ? 'Manager approve'
                                    : 'Approve for pay and invoice'
                            }
                            disabled={isMutating || locked || pendingOverrun || hasBlocking}
                            onClick={() => void handleApprove(row.id, needsManager)}
                          >
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Reject"
                            disabled={isMutating || locked}
                            onClick={() => void handleReject(row.id)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <VisitReconciliationDetailDialog
        open={detailRow != null}
        onOpenChange={open => {
          if (!open) setDetailRow(null)
        }}
        row={detailRow}
      />
    </div>
  )
}
