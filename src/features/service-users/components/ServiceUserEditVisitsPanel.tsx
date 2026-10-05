import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  PoundSterling,
  Receipt,
  Trash2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  BillingExceptionBadge,
  formatBillingLabel,
  VisitReconStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import { VisitReconciliationDetailDialog } from '@/features/billing/components/VisitReconciliationDetailDialog'
import {
  useClearAllVisitReconciliations,
  useVisitReconciliations,
} from '@/features/billing/hooks/useVisitReconciliations'
import type { VisitReconciliationRow } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationStatus } from '@/features/billing/types/billing.types'
import { buildEcmVisitsCsv, EcmVisitsTable } from '@/features/ecm/components/EcmVisitsTable'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { useEcmVisitsTable } from '@/features/ecm/hooks/useEcm'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/dialog'

function parseMoney(value: string | null | undefined): number {
  if (!value) return 0
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatGbp(amount: number): string {
  return `£${amount.toFixed(2)}`
}

/** Pay-only / invoice-rejected: funders are not billed (priced amount is reference only). */
function isFunderNotCharged(status: VisitReconciliationStatus): boolean {
  return status === 'APPROVED_FOR_PAY' || status === 'REJECTED_FOR_INVOICE'
}

/** Invoice-only / pay-rejected: carer is not paid (priced amount is reference only). */
function isCarerNotPaid(status: VisitReconciliationStatus): boolean {
  return status === 'APPROVED_FOR_INVOICE' || status === 'REJECTED_FOR_PAY'
}

function effectiveFunderCharge(row: VisitReconciliationRow): number {
  if (isFunderNotCharged(row.status)) return 0
  return parseMoney(row.billableAmount)
}

function shiftMonth(month: string, delta: number): string {
  const [y = 1970, m = 1] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [y = 1970, m = 1] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  )
}

function monthDateRange(month: string): { dateFrom: string; dateTo: string } {
  const [y = 1970, m = 1] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { dateFrom: `${month}-01`, dateTo: `${month}-${String(lastDay).padStart(2, '0')}` }
}

function FunderChargeCell({ row }: { row: VisitReconciliationRow }) {
  if (isFunderNotCharged(row.status)) {
    return (
      <div>
        <span className="font-medium tabular-nums text-foreground">£0.00</span>
        <div className="text-[11px] text-muted-foreground">
          Not billed
          {row.billableAmount ? ` · priced ${row.billableAmount}` : ''}
        </div>
      </div>
    )
  }
  return (
    <>
      <span className="font-medium tabular-nums text-foreground">{row.billableAmount ?? '—'}</span>
      {row.approvedBillable && row.approvedBillable !== '—' ? (
        <div className="text-[11px] text-muted-foreground">{row.approvedBillable}</div>
      ) : null}
    </>
  )
}

function CarerPayCell({ row }: { row: VisitReconciliationRow }) {
  if (isCarerNotPaid(row.status)) {
    return (
      <div>
        <span className="font-medium text-foreground">£0.00</span>
        <div className="text-[11px]">
          Not paid
          {row.payableAmount ? ` · priced ${row.payableAmount}` : ''}
        </div>
      </div>
    )
  }
  return <>{row.payableAmount ?? '—'}</>
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string | number
  hint: string
}) {
  return (
    <ContentCard className="space-y-1 p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </ContentCard>
  )
}

export function ServiceUserEditVisitsPanel({ serviceUserId }: { serviceUserId: string }) {
  const canRead = useAuthStore(
    s =>
      s.can('service_users.read') ||
      s.can('service_users.update') ||
      s.can('billing.visit_reconciliations.read' as never),
  )
  const canOpenBilling = useAuthStore(s =>
    s.can('billing.visit_reconciliations.read' as never),
  )
  const canManage = useAuthStore(s =>
    s.can('billing.visit_reconciliations.manage' as never),
  )

  const canReadEcm = useAuthStore(s => s.can('ecm.read') || s.can('ecm.monitor'))

  const [detailRow, setDetailRow] = React.useState<VisitReconciliationRow | null>(null)
  const [month, setMonth] = React.useState(() => operationalTodayIso().slice(0, 7))
  const [ecmJobId, setEcmJobId] = React.useState<string | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = React.useState(false)
  const clearAllMutation = useClearAllVisitReconciliations()

  const query = useVisitReconciliations({
    serviceUserId,
    limit: 100,
  })

  const rows = React.useMemo(() => {
    const list = query.data?.rows ?? []
    return [...list].sort((a, b) => {
      const byDate = (b.date || '').localeCompare(a.date || '')
      if (byDate !== 0) return byDate
      return (b.plannedArrival || b.planned || '').localeCompare(a.plannedArrival || a.planned || '')
    })
  }, [query.data?.rows])

  const totals = React.useMemo(() => {
    let charged = 0
    let withCharge = 0
    let missingCharge = 0
    for (const row of rows) {
      if (isFunderNotCharged(row.status)) {
        // Explicitly not billed — do not count priced reference amounts.
        continue
      }
      const amount = effectiveFunderCharge(row)
      if (amount > 0) {
        charged += amount
        withCharge += 1
      } else if (!row.billableAmount) {
        missingCharge += 1
      }
    }
    return { charged, withCharge, missingCharge, visitCount: rows.length }
  }, [rows])

  const visitTotal = query.data?.meta.total ?? rows.length

  // Same columns and timings as ECM live monitoring.
  const ecmQuery = useEcmVisitsTable(
    { serviceUserId, ...monthDateRange(month) },
    canRead && canReadEcm,
  )
  const reconByJob = React.useMemo(() => {
    const map = new Map<string, VisitReconciliationRow>()
    for (const row of rows) {
      if (row.scheduledJobId && !map.has(row.scheduledJobId)) map.set(row.scheduledJobId, row)
    }
    return map
  }, [rows])

  const ecmRows = ecmQuery.data?.rows ?? []
  const downloadCsv = () => {
    const recon = (jobId: string) => reconByJob.get(jobId)
    const csv = buildEcmVisitsCsv(ecmRows, [
      {
        header: 'Funder charge',
        value: row => {
          const r = recon(row.scheduledJobId)
          if (!r) return ''
          return isFunderNotCharged(r.status) ? '£0.00' : (r.billableAmount ?? '')
        },
      },
      {
        header: 'Carer pay',
        value: row => {
          const r = recon(row.scheduledJobId)
          if (!r) return ''
          return isCarerNotPaid(r.status) ? '£0.00' : (r.payableAmount ?? '')
        },
      },
      {
        header: 'Billing status',
        value: row => {
          const r = recon(row.scheduledJobId)
          return r ? formatBillingLabel(r.status) : 'Not reconciled'
        },
      },
    ])
    // BOM so Excel reads £ and other UTF-8 characters correctly.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `service-user-visits-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAll = async () => {
    try {
      const data = await clearAllMutation.mutateAsync({ serviceUserId })
      setDetailRow(null)
      setDeleteAllOpen(false)
      toastSuccess(
        data.visitReconciliations > 0
          ? `Deleted ${data.visitReconciliations} visit(s) for this service user.`
          : 'No visits to delete.',
      )
    } catch (err) {
      toastApiError(err, 'Could not delete visits.')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view visit charges for this service user.
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="service-user-visits-panel">
      <ContentSectionHeader
        title="Visits"
        description="Visits for this client with the same columns as ECM live monitoring, plus funder charge and carer pay from visit reconciliation."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && visitTotal > 0 ? (
              <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={clearAllMutation.isPending}
                    data-testid="service-user-visits-delete-all"
                  >
                    {clearAllMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {clearAllMutation.isPending ? 'Deleting…' : 'Delete all visits'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all visits for this service user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes {visitTotal} reconciled visit{visitTotal === 1 ? '' : 's'} and any
                      linked payroll / invoice lines for this client only. Scheduled visits are not
                      deleted — you can sync completed visits again afterwards. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={clearAllMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={clearAllMutation.isPending}
                      onClick={e => {
                        e.preventDefault()
                        void handleDeleteAll()
                      }}
                    >
                      {clearAllMutation.isPending ? 'Deleting…' : 'Delete all'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {canOpenBilling ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/billing/visit-reconciliation" search={{ serviceUserId }}>
                  Open visit reconciliation
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visits…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load visits for this service user.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total charged"
              value={formatGbp(totals.charged)}
              hint="Sum actually billed to funders (excludes carer-pay-only visits)"
            />
            <StatCard
              title="Visits"
              value={totals.visitCount}
              hint="Reconciled visits for this client"
            />
            <StatCard
              title="With charge"
              value={totals.withCharge}
              hint="Visits approved for funder billing with an amount"
            />
            <StatCard
              title="Missing charge"
              value={totals.missingCharge}
              hint="No billable amount yet — check charge card"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Previous month"
              onClick={() => setMonth(m => shiftMonth(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[9rem] text-center text-sm font-medium text-foreground">
              {monthLabel(month)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Next month"
              onClick={() => setMonth(m => shiftMonth(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {ecmQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
            {canReadEcm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                disabled={ecmRows.length === 0 || ecmQuery.isFetching}
                onClick={downloadCsv}
                data-testid="service-user-visits-export-csv"
              >
                Export CSV
              </Button>
            ) : null}
          </div>

          {!canReadEcm ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You need ECM access to see the visit table for this service user.
            </p>
          ) : ecmQuery.isError ? (
            <p className="text-sm text-destructive">Could not load visits for this month.</p>
          ) : ecmQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading visits…
            </div>
          ) : (
            <EcmVisitsTable
              rows={ecmRows}
              onOpen={row => setEcmJobId(row.scheduledJobId)}
              emptyState={
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </span>
                  No visits for this service user in {monthLabel(month)}.
                </div>
              }
              extraColumns={[
                {
                  key: 'funder-charge',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" aria-hidden />
                      Funder charge
                    </span>
                  ),
                  className: 'whitespace-nowrap',
                  render: row => {
                    const recon = reconByJob.get(row.scheduledJobId)
                    return recon ? (
                      <FunderChargeCell row={recon} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  },
                },
                {
                  key: 'carer-pay',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <PoundSterling className="h-3.5 w-3.5" aria-hidden />
                      Carer pay
                    </span>
                  ),
                  className: 'whitespace-nowrap tabular-nums text-muted-foreground',
                  render: row => {
                    const recon = reconByJob.get(row.scheduledJobId)
                    return recon ? <CarerPayCell row={recon} /> : '—'
                  },
                },
                {
                  key: 'billing',
                  header: 'Billing',
                  render: row => {
                    const recon = reconByJob.get(row.scheduledJobId)
                    return recon ? (
                      <div className="flex flex-col items-start gap-1">
                        <VisitReconStatusBadge status={recon.status} />
                        {recon.exceptions?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {recon.exceptions.slice(0, 2).map(ex => (
                              <BillingExceptionBadge key={`${recon.id}-${ex.code}`} code={ex.code} />
                            ))}
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => setDetailRow(recon)}
                        >
                          View
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not reconciled</span>
                    )
                  },
                },
              ]}
            />
          )}
        </>
      )}

      <EcmVisitDetailDialog
        open={Boolean(ecmJobId)}
        onOpenChange={open => {
          if (!open) setEcmJobId(null)
        }}
        jobId={ecmJobId}
      />

      <VisitReconciliationDetailDialog
        open={Boolean(detailRow)}
        onOpenChange={open => {
          if (!open) setDetailRow(null)
        }}
        row={detailRow}
      />
    </div>
  )
}
