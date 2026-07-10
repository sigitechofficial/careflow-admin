import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, Loader2, Plus, Send, Lock, Calculator } from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { ExportStatusBadge, InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { BillingRunPeriodDialog } from '@/features/billing/components/BillingRunPeriodDialog'
import { InvoiceRunPreviewDialog } from '@/features/billing/components/InvoiceRunPreviewDialog'
import {
  useApproveInvoiceRun,
  useCalculateInvoiceRun,
  useCreateInvoiceRun,
  useInvoiceRun,
  useInvoiceRuns,
  useLockInvoiceRun,
  useSendInvoiceRun,
} from '@/features/billing/hooks/useInvoiceRuns'
import { useAuthStore } from '@/features/auth/store'
import type { ExportStatus } from '@/features/billing/types/billing.types'

function InvoiceRunPreviewButton({ id }: { id: string }) {
  const [open, setOpen] = React.useState(false)
  const detailQuery = useInvoiceRun(open ? id : undefined)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Eye className="h-3.5 w-3.5" />}
        onClick={() => setOpen(true)}
      >
        Preview
      </Button>
      {open && detailQuery.isLoading ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading invoice preview…
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <InvoiceRunPreviewDialog
          open={open}
          onOpenChange={setOpen}
          invoiceRun={detailQuery.data ?? null}
        />
      )}
    </>
  )
}

export function BillingInvoiceRunsPanel() {
  const canRead = useAuthStore(s => s.can('billing.invoice_runs.read' as never))
  const canManage = useAuthStore(s => s.can('billing.invoice_runs.manage' as never))
  const [createOpen, setCreateOpen] = React.useState(false)

  const query = useInvoiceRuns()
  const createMutation = useCreateInvoiceRun()
  const calculateMutation = useCalculateInvoiceRun()
  const approveMutation = useApproveInvoiceRun()
  const lockMutation = useLockInvoiceRun()
  const sendMutation = useSendInvoiceRun()

  const rows = query.data ?? []
  const isMutating =
    createMutation.isPending ||
    calculateMutation.isPending ||
    approveMutation.isPending ||
    lockMutation.isPending ||
    sendMutation.isPending

  const handleCreate = async (values: { periodStart: string; periodEnd: string }) => {
    const created = await createMutation.mutateAsync(values)
    setCreateOpen(false)
    await calculateMutation.mutateAsync(created.id)
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoice runs. Required:{' '}
        <span className="font-mono text-xs">billing.invoice_runs.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Invoice runs"
        description="Batch visit charges for a billing period. Each local authority and funder receives its own separate invoice."
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              New invoice run
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice runs…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No invoice runs yet. Create a run for a completed week with approved billable visit times.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Period</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Service users</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Invoices</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Net total</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Exceptions</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Export</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      to="/billing/invoice-runs/$invoiceRunId"
                      params={{ invoiceRunId: row.id }}
                      className="text-primary hover:underline"
                    >
                      {row.period}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <InvoiceRunStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.serviceUsers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.funders}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.netTotal}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.exceptions}</td>
                  <td className="px-3 py-2.5">
                    <ExportStatusBadge status={row.exportStatus as ExportStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/billing/invoice-runs/$invoiceRunId" params={{ invoiceRunId: row.id }}>
                          View
                        </Link>
                      </Button>
                      <InvoiceRunPreviewButton id={row.id} />
                      {canManage && (row.status === 'DRAFT' || row.status === 'EXCEPTION_FOUND') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          leftIcon={<Calculator className="h-3.5 w-3.5" />}
                          onClick={() => void calculateMutation.mutateAsync(row.id)}
                        >
                          Calculate
                        </Button>
                      ) : null}
                      {canManage &&
                      (row.status === 'READY_FOR_REVIEW' || row.status === 'EXCEPTION_FOUND') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          onClick={() => void approveMutation.mutateAsync(row.id)}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {canManage && row.status === 'APPROVED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          leftIcon={<Lock className="h-3.5 w-3.5" />}
                          onClick={() => void lockMutation.mutateAsync(row.id)}
                        >
                          Lock
                        </Button>
                      ) : null}
                      {canManage && row.status === 'LOCKED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => void sendMutation.mutateAsync(row.id)}
                        >
                          Mark sent
                        </Button>
                      ) : null}
                      {canManage && row.status === 'SENT' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => void sendMutation.mutateAsync(row.id)}
                        >
                          Resend
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BillingRunPeriodDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New invoice run"
        description="Select the billing period. Visits with approved billable time in this range will be charged with funder splits applied."
        isPending={createMutation.isPending || calculateMutation.isPending}
        onSubmit={handleCreate}
      />
    </div>
  )
}
