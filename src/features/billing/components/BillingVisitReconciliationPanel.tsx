import * as React from 'react'
import { CheckCircle2, Eye, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { BillingExceptionBadge, VisitReconStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { VisitReconciliationDetailDialog } from '@/features/billing/components/VisitReconciliationDetailDialog'
import {
  useApproveVisitReconciliation,
  useBackfillVisitReconciliations,
  useBulkApproveVisitReconciliations,
  useRejectVisitReconciliation,
  useVisitReconciliations,
} from '@/features/billing/hooks/useVisitReconciliations'
import { useAuthStore } from '@/features/auth/store'
import type { VisitReconciliationRow } from '@/features/billing/types/visit-reconciliation.types'

export function BillingVisitReconciliationPanel() {
  const canRead = useAuthStore(s => s.can('billing.visit_reconciliations.read' as never))
  const canManage = useAuthStore(s => s.can('billing.visit_reconciliations.manage' as never))
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [exceptionsOnly, setExceptionsOnly] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [detailRow, setDetailRow] = React.useState<VisitReconciliationRow | null>(null)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const query = useVisitReconciliations({
    search: debouncedSearch || undefined,
    hasExceptions: exceptionsOnly ? true : undefined,
    limit: 100,
  })
  const approveMutation = useApproveVisitReconciliation()
  const rejectMutation = useRejectVisitReconciliation()
  const bulkApproveMutation = useBulkApproveVisitReconciliations()
  const backfillMutation = useBackfillVisitReconciliations()

  const rows = query.data?.rows ?? []
  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    bulkApproveMutation.isPending ||
    backfillMutation.isPending

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
    await backfillMutation.mutateAsync({})
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
      <ContentSectionHeader
        title="Visit reconciliation"
        description="Review completed visits before payroll and invoice calculation. Approve payable time and billable time separately."
        action={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search visit or service user…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-48"
            />
            <Button
              variant={exceptionsOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExceptionsOnly(v => !v)}
            >
              {exceptionsOnly ? 'Showing exceptions' : 'Filter exceptions'}
            </Button>
            {canManage ? (
              <>
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
                  size="sm"
                  onClick={() => void handleBulkApprove()}
                  disabled={isMutating || !rows.length}
                >
                  {selectedIds.size
                    ? `Bulk approve (${selectedIds.size})`
                    : 'Bulk approve all'}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

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
          <table className="w-full min-w-[1100px] text-sm">
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
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Visit</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Carer</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Planned</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actual</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Approved payable</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Approved billable</th>
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
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-xs">{row.visitRef}</div>
                      <div className="text-xs text-muted-foreground">{row.date}</div>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{row.serviceUserName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.carerName ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.planned}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.actual}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-primary">{row.approvedPayable}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-primary">{row.approvedBillable}</td>
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
                            <BillingExceptionBadge key={ex} code={ex} />
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
                              pendingOverrun
                                ? 'Open Details to approve or reject overrun first'
                                : needsManager
                                  ? 'Manager approve'
                                  : 'Approve for pay and invoice'
                            }
                            disabled={isMutating || locked || pendingOverrun}
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
