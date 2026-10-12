import * as React from 'react'
import { Eye, Loader2, Plus, Download, Lock, Calculator, Trash2 } from 'lucide-react'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { PayrollRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { BillingRunPeriodDialog } from '@/features/billing/components/BillingRunPeriodDialog'
import { PayrollRunDetailDialog } from '@/features/billing/components/PayrollRunDetailDialog'
import {
  useApprovePayrollRun,
  useCalculatePayrollRun,
  useCreatePayrollRun,
  useDiscardPayrollRun,
  useDownloadPayrollRunCsv,
  useExportPayrollRun,
  useLockPayrollRun,
  usePayrollRuns,
} from '@/features/billing/hooks/usePayrollRuns'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type { PayrollRunRow } from '@/features/billing/api/payroll-runs.api'

/** A run in one of these states can still be recalculated or discarded. */
const UNLOCKED_STATUSES = ['DRAFT', 'EXCEPTION_FOUND', 'READY_FOR_REVIEW', 'APPROVED']
const APPROVE_HINT =
  'Approving and locking pay needs the "Approve pay and record payments" responsibility'

export function BillingPayrollRunsPanel() {
  const canRead = useAuthStore(s => s.can('billing.payroll_runs.read'))
  const canManage = useAuthStore(s => s.can('billing.payroll_runs.manage'))
  // Approving and locking are a separate power from preparing a run.
  const canApprove = useAuthStore(s => s.can('billing.payroll_runs.approve'))
  const { locationId } = useGlobalLocationScope()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detailRow, setDetailRow] = React.useState<PayrollRunRow | null>(null)

  const query = usePayrollRuns({ locationId: locationId ?? undefined })
  const createMutation = useCreatePayrollRun()
  const calculateMutation = useCalculatePayrollRun()
  const approveMutation = useApprovePayrollRun()
  const lockMutation = useLockPayrollRun()
  const discardMutation = useDiscardPayrollRun()
  const exportMutation = useExportPayrollRun()
  const downloadMutation = useDownloadPayrollRunCsv()

  const rows = query.data ?? []
  const isMutating =
    createMutation.isPending ||
    calculateMutation.isPending ||
    approveMutation.isPending ||
    lockMutation.isPending ||
    discardMutation.isPending ||
    exportMutation.isPending ||
    downloadMutation.isPending

  /** Calculate and say so when another run already holds some of the approved visits. */
  const calculate = async (id: string) => {
    try {
      const { heldByOtherRuns } = await calculateMutation.mutateAsync(id)
      if (heldByOtherRuns > 0) {
        toastWarning(
          `${heldByOtherRuns} approved visit${heldByOtherRuns === 1 ? ' is' : 's are'} already in another pay run`,
          'They were left out of this run. Discard or recalculate the other run to release them.',
        )
      }
    } catch (e) {
      toastApiError(e, 'Could not calculate the payroll run')
    }
  }

  const runAction = async (action: () => Promise<unknown>, done: string, failed: string) => {
    try {
      await action()
      toastSuccess(done)
    } catch (e) {
      toastApiError(e, failed)
    }
  }

  const discard = (row: PayrollRunRow) => {
    if (!window.confirm(`Discard the payroll run for ${row.period}? Its visits become available to other runs.`)) {
      return
    }
    void runAction(() => discardMutation.mutateAsync(row.id), 'Payroll run discarded', 'Could not discard the payroll run')
  }

  const handleCreate = async (values: { periodStart: string; periodEnd: string }) => {
    const created = await createMutation.mutateAsync(values)
    setCreateOpen(false)
    await calculate(created.id)
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view payroll runs. Required:{' '}
        <span className="font-mono text-xs">billing.payroll_runs.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Payroll runs"
        titleClassName="sr-only"
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              New payroll run
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payroll runs…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No payroll runs yet. Create a run for a completed calendar month with approved visit pay times.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Period</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Carers</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Visit lines</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Gross pay</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">NMW top-up</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Exceptions</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Details</th>
                {canManage ? (
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{row.period}</td>
                  <td className="px-3 py-2.5">
                    <PayrollRunStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.carers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.visitLines}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.grossPay}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{row.nmwTopUp}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.exceptions}</td>
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
                      <div className="flex flex-wrap gap-1">
                        {UNLOCKED_STATUSES.includes(row.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            leftIcon={<Calculator className="h-3.5 w-3.5" />}
                            onClick={() => void calculate(row.id)}
                            title={
                              row.status === 'APPROVED'
                                ? 'Recalculating withdraws the approval'
                                : undefined
                            }
                          >
                            {row.status === 'DRAFT' ? 'Calculate' : 'Recalculate'}
                          </Button>
                        )}
                        {(row.status === 'READY_FOR_REVIEW' || row.status === 'EXCEPTION_FOUND') && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating || !canApprove}
                            title={canApprove ? 'Must be a different user from the one who created the run' : APPROVE_HINT}
                            onClick={() =>
                              void runAction(
                                () => approveMutation.mutateAsync(row.id),
                                'Payroll run approved',
                                'Could not approve the payroll run',
                              )
                            }
                          >
                            Approve
                          </Button>
                        )}
                        {row.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating || !canApprove}
                            title={canApprove ? 'Locking makes this run permanent history' : APPROVE_HINT}
                            leftIcon={<Lock className="h-3.5 w-3.5" />}
                            onClick={() =>
                              void runAction(
                                () => lockMutation.mutateAsync(row.id),
                                'Payroll run locked',
                                'Could not lock the payroll run',
                              )
                            }
                          >
                            Lock
                          </Button>
                        )}
                        {UNLOCKED_STATUSES.includes(row.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => discard(row)}
                          >
                            Discard
                          </Button>
                        )}
                        {row.status === 'LOCKED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            leftIcon={<Download className="h-3.5 w-3.5" />}
                            onClick={() => void exportMutation.mutateAsync(row.id)}
                            title="Download CSV and mark as exported"
                          >
                            Export CSV
                          </Button>
                        )}
                        {row.status === 'EXPORTED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            leftIcon={<Download className="h-3.5 w-3.5" />}
                            onClick={() => void downloadMutation.mutateAsync(row.id)}
                            title="Download payroll CSV again"
                          >
                            Download CSV
                          </Button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BillingRunPeriodDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New payroll run"
        description="Select the pay period. Visits with approved payable time in this range will be included."
        isPending={createMutation.isPending || calculateMutation.isPending}
        onSubmit={handleCreate}
      />

      <PayrollRunDetailDialog
        open={detailRow != null}
        onOpenChange={open => {
          if (!open) setDetailRow(null)
        }}
        row={detailRow}
      />
    </div>
  )
}
