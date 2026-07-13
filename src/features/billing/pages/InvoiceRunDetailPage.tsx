import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Lock,
  Send,
  Users,
} from 'lucide-react'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import {
  ExportStatusBadge,
  InvoiceRunStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import { InvoiceRunAuthoritySection } from '@/features/billing/components/InvoiceRunAuthoritySection'
import { InvoiceRunPreviewDialog } from '@/features/billing/components/InvoiceRunPreviewDialog'
import {
  useApproveInvoiceRun,
  useCalculateInvoiceRun,
  useInvoiceRun,
  useLockInvoiceRun,
  useSendInvoiceRun,
} from '@/features/billing/hooks/useInvoiceRuns'
import { useAuthStore } from '@/features/auth/store'
import type { ExportStatus, InvoiceRunStatus } from '@/features/billing/types/billing.types'
import { cn } from '@/shared/lib/utils'

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

const WORKFLOW_STEPS: Array<{ key: string; label: string; statuses: InvoiceRunStatus[] }> = [
  { key: 'draft', label: 'Draft', statuses: ['DRAFT'] },
  { key: 'calculate', label: 'Calculated', statuses: ['READY_FOR_REVIEW', 'EXCEPTION_FOUND'] },
  { key: 'approve', label: 'Approved', statuses: ['APPROVED'] },
  { key: 'lock', label: 'Locked', statuses: ['LOCKED'] },
  { key: 'send', label: 'Sent', statuses: ['SENT', 'PART_PAID', 'PAID'] },
]

function workflowStepIndex(status: InvoiceRunStatus): number {
  if (status === 'DRAFT') return 0
  if (status === 'READY_FOR_REVIEW' || status === 'EXCEPTION_FOUND' || status === 'CALCULATING') return 1
  if (status === 'APPROVED') return 2
  if (status === 'LOCKED') return 3
  if (status === 'SENT' || status === 'PART_PAID' || status === 'PAID' || status === 'DISPUTED') return 4
  return 0
}

function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'default' | 'warning' | 'success'
  icon?: React.ReactNode
}) {
  return (
    <ContentCard
      className={cn(
        'p-4 space-y-2',
        tone === 'warning' && 'border-amber-300/60 bg-amber-50/40 dark:border-amber-700/40 dark:bg-amber-950/20',
        tone === 'success' && 'border-success/30 bg-success/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground/80">{icon}</span> : null}
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </ContentCard>
  )
}

export default function InvoiceRunDetailPage() {
  const { invoiceRunId = '' } = useParams({ strict: false }) as { invoiceRunId?: string }
  const canRead = useAuthStore(s => s.can('billing.invoice_runs.read' as never))
  const canManage = useAuthStore(s => s.can('billing.invoice_runs.manage' as never))
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewFunderId, setPreviewFunderId] = React.useState<string | null | undefined>(undefined)

  const openPreview = (funderId?: string | null) => {
    setPreviewFunderId(funderId)
    setPreviewOpen(true)
  }

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
      <ContentCard className="p-6">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view invoice runs.
        </p>
      </ContentCard>
    )
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invoice run…
      </div>
    )
  }

  if (query.isError || !run) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <ContentCard className="space-y-3 p-8">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Invoice run not found</h1>
          <p className="text-sm text-muted-foreground">
            This run may have been deleted, or the link is no longer valid.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing" search={{ tab: 'invoice-runs' }}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to invoice runs
            </Link>
          </Button>
        </ContentCard>
      </div>
    )
  }

  const activeStep = workflowStepIndex(run.status)
  const hasExceptions = run.exceptions > 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="space-y-4">
        <Link
          to="/billing"
          search={{ tab: 'invoice-runs' }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Invoice runs
        </Link>

        <ContentSectionHeader
          title={run.period}
          description={`${run.periodStart} – ${run.periodEnd} · ${run.lineCount} line${run.lineCount === 1 ? '' : 's'} · ${run.funderSummaries.length} authority invoice${run.funderSummaries.length === 1 ? '' : 's'}`}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <InvoiceRunStatusBadge status={run.status} />
              <ExportStatusBadge status={run.exportStatus as ExportStatus} />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Eye className="h-3.5 w-3.5" />}
                onClick={() => openPreview()}
                disabled={run.lineCount === 0}
              >
                Preview all
              </Button>
              {canManage ? (
                <>
                  {(run.status === 'DRAFT' || run.status === 'EXCEPTION_FOUND') && (
                    <Button
                      size="sm"
                      disabled={isMutating}
                      leftIcon={<Calculator className="h-3.5 w-3.5" />}
                      onClick={() => void calculateMutation.mutateAsync(run.id)}
                    >
                      {isMutating && calculateMutation.isPending ? 'Calculating…' : 'Calculate'}
                    </Button>
                  )}
                  {(run.status === 'READY_FOR_REVIEW' || run.status === 'EXCEPTION_FOUND') && (
                    <Button
                      size="sm"
                      disabled={isMutating}
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      onClick={() => void approveMutation.mutateAsync(run.id)}
                    >
                      Approve
                    </Button>
                  )}
                  {run.status === 'APPROVED' && (
                    <Button
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
          }
        />
      </div>

      <ContentCard className="overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
          {WORKFLOW_STEPS.map((step, index) => {
            const done = index < activeStep
            const current = index === activeStep
            return (
              <div
                key={step.key}
                className={cn(
                  'bg-card px-3 py-3 text-center',
                  current && 'bg-primary/5',
                )}
              >
                <p
                  className={cn(
                    'text-[11px] font-medium uppercase tracking-wide',
                    current ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                <div
                  className={cn(
                    'mx-auto mt-2 h-1.5 w-full max-w-[4.5rem] rounded-full',
                    done || current ? 'bg-primary' : 'bg-muted',
                  )}
                />
              </div>
            )
          })}
        </div>
      </ContentCard>

      {hasExceptions ? (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50/50 px-4 py-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/25">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-amber-950 dark:text-amber-100">
              {run.exceptions} exception{run.exceptions === 1 ? '' : 's'} need review
            </p>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
              Check line-level messages under each authority invoice before approving.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Net total"
          value={run.netTotal}
          hint="All authority invoices combined"
          icon={<FileText className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Service users"
          value={run.serviceUsers}
          hint={`${run.lineCount} billable line${run.lineCount === 1 ? '' : 's'}`}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Authority invoices"
          value={run.funderSummaries.length}
          hint="Separate invoice per funder"
        />
        <StatTile
          label="Exceptions"
          value={run.exceptions}
          tone={hasExceptions ? 'warning' : 'default'}
          hint={hasExceptions ? 'Resolve before final send' : 'No open exceptions'}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ContentCard className="space-y-4 p-5 lg:col-span-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Payment summary</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Amounts allocated against this invoice run
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
              <dt className="text-xs text-muted-foreground">Paid</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{run.paidAmount}</dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
              <dt className="text-xs text-muted-foreground">Outstanding</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-primary">{run.outstanding}</dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
              <dt className="text-xs text-muted-foreground">Export status</dt>
              <dd className="mt-2">
                <ExportStatusBadge status={run.exportStatus as ExportStatus} />
              </dd>
            </div>
          </dl>
        </ContentCard>

        <ContentCard className="space-y-4 p-5 lg:col-span-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Run timeline</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Key milestones for this period</p>
          </div>
          <ol className="space-y-3">
            {[
              { label: 'Approved', value: run.approvedAt },
              { label: 'Locked', value: run.lockedAt },
              { label: 'Sent', value: run.sentAt },
            ].map(item => (
              <li key={item.label} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn('tabular-nums', item.value ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {formatTimestamp(item.value)}
                </span>
              </li>
            ))}
          </ol>
        </ContentCard>
      </div>

      {run.notes ? (
        <ContentCard className="space-y-2 p-5">
          <h3 className="text-sm font-semibold">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{run.notes}</p>
        </ContentCard>
      ) : null}

      <ContentSectionHeader
        title="Authority invoices"
        description="Each local authority and funder is billed on its own invoice with a unique invoice number."
      />

      {run.funderSummaries.length === 0 ? (
        <ContentCard className="border-dashed p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/70" />
          <p className="mt-3 text-sm font-medium text-foreground">No invoices calculated yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Run calculate to pull approved billable visits for this period into authority invoices.
          </p>
          {canManage && (run.status === 'DRAFT' || run.status === 'EXCEPTION_FOUND') ? (
            <Button
              className="mt-4"
              size="sm"
              disabled={isMutating}
              leftIcon={<Calculator className="h-3.5 w-3.5" />}
              onClick={() => void calculateMutation.mutateAsync(run.id)}
            >
              Calculate now
            </Button>
          ) : null}
        </ContentCard>
      ) : (
        <div className="space-y-4">
          {run.funderSummaries.map((group, index) => (
            <InvoiceRunAuthoritySection
              key={group.funderId ?? `direct-${index}`}
              invoiceRun={run}
              group={group}
              invoiceIndex={index}
              formatMinutes={formatMinutes}
              onPreview={() => openPreview(group.funderId)}
            />
          ))}
        </div>
      )}

      <InvoiceRunPreviewDialog
        open={previewOpen}
        onOpenChange={open => {
          setPreviewOpen(open)
          if (!open) setPreviewFunderId(undefined)
        }}
        invoiceRun={run}
        funderIdFilter={previewFunderId}
      />
    </div>
  )
}
