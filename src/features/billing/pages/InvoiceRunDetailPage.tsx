import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calculator,
  Eye,
  Loader2,
  Lock,
  Send,
} from 'lucide-react'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import {
  ExportStatusBadge,
  InvoiceRunStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import { InvoiceRunPreviewDialog } from '@/features/billing/components/InvoiceRunPreviewDialog'
import {
  useApproveInvoiceRun,
  useCalculateInvoiceRun,
  useInvoiceRun,
  useLockInvoiceRun,
  useSendInvoiceRun,
} from '@/features/billing/hooks/useInvoiceRuns'
import { useAuthStore } from '@/features/auth/store'
import type { ExportStatus } from '@/features/billing/types/billing.types'

function formatTimestamp(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(d)
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  return `${minutes} min`
}

export default function InvoiceRunDetailPage() {
  const { invoiceRunId = '' } = useParams({ strict: false }) as { invoiceRunId?: string }
  const canRead = useAuthStore(s => s.can('billing.invoice_runs.read' as never))
  const canManage = useAuthStore(s => s.can('billing.invoice_runs.manage' as never))
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const query = useInvoiceRun(invoiceRunId)
  const calculateMutation = useCalculateInvoiceRun()
  const approveMutation = useApproveInvoiceRun()
  const lockMutation = useLockInvoiceRun()
  const sendMutation = useSendInvoiceRun()

  const run = query.data
  const isMutating =
    calculateMutation.isPending ||
    approveMutation.isPending ||
    lockMutation.isPending ||
    sendMutation.isPending

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoice runs.
      </p>
    )
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invoice run…
      </div>
    )
  }

  if (query.isError || !run) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/billing" search={{ tab: 'invoice-runs' }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to invoice runs
          </Link>
        </Button>
        <p className="text-sm text-destructive">Invoice run not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing" search={{ tab: 'invoice-runs' }}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Invoice runs
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{run.period}</h1>
            <p className="text-sm text-muted-foreground">
              {run.periodStart} – {run.periodEnd} · {run.lineCount} line
              {run.lineCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceRunStatusBadge status={run.status} />
            <ExportStatusBadge status={run.exportStatus as ExportStatus} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => setPreviewOpen(true)}
            disabled={run.lineCount === 0}
          >
            Preview invoice
          </Button>
          {canManage ? (
            <>
              {(run.status === 'DRAFT' || run.status === 'EXCEPTION_FOUND') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  leftIcon={<Calculator className="h-3.5 w-3.5" />}
                  onClick={() => void calculateMutation.mutateAsync(run.id)}
                >
                  Calculate
                </Button>
              )}
              {(run.status === 'READY_FOR_REVIEW' || run.status === 'EXCEPTION_FOUND') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  onClick={() => void approveMutation.mutateAsync(run.id)}
                >
                  Approve
                </Button>
              )}
              {run.status === 'APPROVED' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  leftIcon={<Lock className="h-3.5 w-3.5" />}
                  onClick={() => void lockMutation.mutateAsync(run.id)}
                >
                  Lock
                </Button>
              )}
              {run.status === 'LOCKED' && (
                <Button
                  size="sm"
                  disabled={isMutating}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  onClick={() => void sendMutation.mutateAsync(run.id)}
                >
                  Mark sent
                </Button>
              )}
              {run.status === 'SENT' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isMutating}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  onClick={() => void sendMutation.mutateAsync(run.id)}
                >
                  Resend
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ContentCard className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Net total</p>
          <p className="text-lg font-semibold tabular-nums">{run.netTotal}</p>
        </ContentCard>
        <ContentCard className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Service users</p>
          <p className="text-lg font-semibold tabular-nums">{run.serviceUsers}</p>
        </ContentCard>
        <ContentCard className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Funders</p>
          <p className="text-lg font-semibold tabular-nums">{run.funders}</p>
        </ContentCard>
        <ContentCard className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Exceptions</p>
          <p className="text-lg font-semibold tabular-nums">{run.exceptions}</p>
        </ContentCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="p-4 space-y-2 lg:col-span-2">
          <h3 className="text-sm font-semibold">Payment status</h3>
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-medium tabular-nums">{run.paidAmount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Outstanding</dt>
              <dd className="font-medium tabular-nums">{run.outstanding}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Export</dt>
              <dd>
                <ExportStatusBadge status={run.exportStatus as ExportStatus} />
              </dd>
            </div>
          </dl>
        </ContentCard>
        <ContentCard className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Timeline</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Approved</dt>
              <dd>{formatTimestamp(run.approvedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Locked</dt>
              <dd>{formatTimestamp(run.lockedAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sent</dt>
              <dd>{formatTimestamp(run.sentAt)}</dd>
            </div>
          </dl>
        </ContentCard>
      </div>

      {run.notes ? (
        <ContentCard className="p-4">
          <h3 className="text-sm font-semibold mb-1">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{run.notes}</p>
        </ContentCard>
      ) : null}

      <ContentSectionHeader
        title="Invoice lines"
        description="Visit charges with funder splits applied from active funding contracts."
      />

      {run.lines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No lines calculated yet. Run calculate to pull approved billable visits for this period.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Visit</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Funder</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Duration</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Split</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Exception</th>
              </tr>
            </thead>
            <tbody>
              {run.lines.map(line => (
                <tr key={line.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono text-xs">{line.visitRef ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{line.serviceUserName}</span>
                    {line.serviceUserNumber ? (
                      <span className="block text-xs text-muted-foreground">{line.serviceUserNumber}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">{line.funderName}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{line.description}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatMinutes(line.minutes)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {line.splitPercent != null ? `${line.splitPercent}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{line.amount}</td>
                  <td className="px-3 py-2.5 text-xs text-destructive">{line.exceptionMessage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InvoiceRunPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} invoiceRun={run} />
    </div>
  )
}
