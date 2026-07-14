import * as React from 'react'
import { Eye, Loader2, Plus, Download, Lock, Calculator } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { PayrollRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { BillingRunPeriodDialog } from '@/features/billing/components/BillingRunPeriodDialog'
import { PayrollRunDetailDialog } from '@/features/billing/components/PayrollRunDetailDialog'
import {
  useApprovePayrollRun,
  useCalculatePayrollRun,
  useCreatePayrollRun,
  useDownloadPayrollRunCsv,
  useExportPayrollRun,
  useLockPayrollRun,
  usePayrollRuns,
} from '@/features/billing/hooks/usePayrollRuns'
import { useAuthStore } from '@/features/auth/store'
import type { PayrollRunRow } from '@/features/billing/api/payroll-runs.api'

export function BillingPayrollRunsPanel() {
  const canRead = useAuthStore(s => s.can('billing.payroll_runs.read' as never))
  const canManage = useAuthStore(s => s.can('billing.payroll_runs.manage' as never))
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detailRow, setDetailRow] = React.useState<PayrollRunRow | null>(null)

  const query = usePayrollRuns()
  const createMutation = useCreatePayrollRun()
  const calculateMutation = useCalculatePayrollRun()
  const approveMutation = useApprovePayrollRun()
  const lockMutation = useLockPayrollRun()
  const exportMutation = useExportPayrollRun()
  const downloadMutation = useDownloadPayrollRunCsv()

  const rows = query.data ?? []
  const isMutating =
    createMutation.isPending ||
    calculateMutation.isPending ||
    approveMutation.isPending ||
    lockMutation.isPending ||
    exportMutation.isPending ||
    downloadMutation.isPending

  const handleCreate = async (values: { periodStart: string; periodEnd: string }) => {
    const created = await createMutation.mutateAsync(values)
    setCreateOpen(false)
    await calculateMutation.mutateAsync(created.id)
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
          No payroll runs yet. Create a run for a completed week with approved visit pay times.
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
                        {(row.status === 'DRAFT' || row.status === 'EXCEPTION_FOUND') && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            leftIcon={<Calculator className="h-3.5 w-3.5" />}
                            onClick={() => void calculateMutation.mutateAsync(row.id)}
                          >
                            Calculate
                          </Button>
                        )}
                        {(row.status === 'READY_FOR_REVIEW' || row.status === 'EXCEPTION_FOUND') && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => void approveMutation.mutateAsync(row.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {row.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            leftIcon={<Lock className="h-3.5 w-3.5" />}
                            onClick={() => void lockMutation.mutateAsync(row.id)}
                          >
                            Lock
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
