import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Plus, Send, Lock, Calculator, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { ExportStatusBadge, InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { BillingRunPeriodDialog } from '@/features/billing/components/BillingRunPeriodDialog'
import {
  useApproveInvoiceRun,
  useCalculateInvoiceRun,
  useCreateInvoiceRun,
  useDeleteAllInvoiceRuns,
  useInvoiceRuns,
  useLockInvoiceRun,
  useSendInvoiceRun,
} from '@/features/billing/hooks/useInvoiceRuns'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type { ExportStatus } from '@/features/billing/types/billing.types'
import type { InvoiceRunRow } from '@/features/billing/api/invoice-runs.api'

type CadenceTab = 'weekly' | 'monthly'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Derive the run cadence from its span (≈7 days = Weekly, ≈a month = Monthly, else Custom). */
function periodCadence(startIso: string, endIso: string): {
  label: string
  tone: 'weekly' | 'monthly' | 'custom'
} {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return { label: 'Custom', tone: 'custom' }
  const days = Math.round((end - start) / 86_400_000) + 1
  if (days >= 6 && days <= 8) return { label: 'Weekly', tone: 'weekly' }
  if (days >= 28 && days <= 31) return { label: 'Monthly', tone: 'monthly' }
  return { label: `${days} days`, tone: 'custom' }
}

function CadenceBadge({ startIso, endIso }: { startIso: string; endIso: string }) {
  const { label, tone } = periodCadence(startIso, endIso)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'weekly' && 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
        tone === 'monthly' && 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
        tone === 'custom' && 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  )
}

function filterRowsByCadence(rows: InvoiceRunRow[], tab: CadenceTab): InvoiceRunRow[] {
  return rows.filter((row) => periodCadence(row.periodStart, row.periodEnd).tone === tab)
}

export function BillingInvoiceRunsPanel() {
  const canRead = useAuthStore(s => s.can('billing.invoice_runs.read' as never))
  const canManage = useAuthStore(s => s.can('billing.invoice_runs.manage' as never))
  const { locationId } = useGlobalLocationScope()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [cadenceTab, setCadenceTab] = React.useState<CadenceTab>('weekly')

  const query = useInvoiceRuns({ locationId: locationId ?? undefined })
  const createMutation = useCreateInvoiceRun()
  const calculateMutation = useCalculateInvoiceRun()
  const approveMutation = useApproveInvoiceRun()
  const lockMutation = useLockInvoiceRun()
  const sendMutation = useSendInvoiceRun()
  const deleteAllMutation = useDeleteAllInvoiceRuns()

  const rows = query.data ?? []
  const weeklyRows = React.useMemo(() => filterRowsByCadence(rows, 'weekly'), [rows])
  const monthlyRows = React.useMemo(() => filterRowsByCadence(rows, 'monthly'), [rows])
  const customCount = React.useMemo(
    () => rows.filter((row) => periodCadence(row.periodStart, row.periodEnd).tone === 'custom').length,
    [rows],
  )
  const visibleRows = cadenceTab === 'weekly' ? weeklyRows : monthlyRows

  const isMutating =
    createMutation.isPending ||
    calculateMutation.isPending ||
    approveMutation.isPending ||
    lockMutation.isPending ||
    sendMutation.isPending ||
    deleteAllMutation.isPending

  const handleCreate = async (values: { periodStart: string; periodEnd: string }) => {
    const created = await createMutation.mutateAsync(values)
    setCreateOpen(false)
    await calculateMutation.mutateAsync(created.id)
    const tone = periodCadence(values.periodStart, values.periodEnd).tone
    if (tone === 'weekly' || tone === 'monthly') setCadenceTab(tone)
  }

  const handleDeleteAll = () => {
    const ok = window.confirm(
      `Delete ALL ${rows.length} invoice run${rows.length === 1 ? '' : 's'}?\n\n` +
        'This permanently removes every invoice run (including sent/paid ones), unlinks their ' +
        'visits so they can be re-invoiced, and clears payment allocations. This cannot be undone.',
    )
    if (!ok) return
    deleteAllMutation.mutate(undefined, {
      onSuccess: (res) =>
        toastSuccess(`Deleted ${res.deleted} invoice run${res.deleted === 1 ? '' : 's'}`),
      onError: (e) => toastApiError(e, 'Could not delete invoice runs'),
    })
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
        titleClassName="sr-only"
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {rows.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isMutating}
                  onClick={handleDeleteAll}
                >
                  Delete all
                </Button>
              ) : null}
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                New invoice run
              </Button>
            </div>
          ) : null
        }
      />

      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Invoice run cadence">
          {(
            [
              { id: 'weekly' as const, label: 'Weekly', count: weeklyRows.length },
              { id: 'monthly' as const, label: 'Monthly', count: monthlyRows.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCadenceTab(tab.id)}
              className={cn(
                'relative px-3 py-2.5 text-sm font-medium transition-colors',
                cadenceTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                  cadenceTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
              {cadenceTab === tab.id ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {customCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {customCount} custom-period run{customCount === 1 ? '' : 's'} hidden from these tabs
          (period is neither ~1 week nor ~1 month).
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice runs…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No invoice runs yet. Create a weekly (~7 day) or monthly period with approved billable visit times.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {cadenceTab} invoice runs yet.
          {cadenceTab === 'weekly'
            ? ' Create a run with a ~7 day period.'
            : ' Create a run with a ~28–31 day period.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Period</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Service users</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Invoices</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Paid</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Partial</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Unpaid</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Amount paid</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Net total</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Exceptions</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Export</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      to="/billing/invoice-runs/$invoiceRunId"
                      params={{ invoiceRunId: row.id }}
                      className="text-primary hover:underline"
                    >
                      {row.period}
                    </Link>
                    <div className="text-xs font-normal text-muted-foreground">
                      {fmtDate(row.periodStart)} → {fmtDate(row.periodEnd)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <CadenceBadge startIso={row.periodStart} endIso={row.periodEnd} />
                  </td>
                  <td className="px-3 py-2.5">
                    <InvoiceRunStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.serviceUsers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.funders}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {row.invoicesPaid ?? 0}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-400">
                    {row.invoicesPartPaid ?? 0}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.invoicesUnpaid ?? 0}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {row.paidAmount ?? '£0.00'}
                  </td>
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
        description="Select the billing period. Weekly (~7 days) or monthly (~28–31 days) periods appear on the matching tab."
        isPending={createMutation.isPending || calculateMutation.isPending}
        onSubmit={handleCreate}
      />
    </div>
  )
}
