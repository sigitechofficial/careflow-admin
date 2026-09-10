import * as React from 'react'
import { ClipboardList, ExternalLink, Eye, Loader2, PoundSterling, Receipt, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  BillingExceptionBadge,
  VisitReconStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import { VisitReconciliationDetailDialog } from '@/features/billing/components/VisitReconciliationDetailDialog'
import {
  useClearAllVisitReconciliations,
  useVisitReconciliations,
} from '@/features/billing/hooks/useVisitReconciliations'
import type { VisitReconciliationRow } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationStatus } from '@/features/billing/types/billing.types'
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

  const [detailRow, setDetailRow] = React.useState<VisitReconciliationRow | null>(null)
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
        description="Completed visits for this client with funder (client) charge amounts from visit reconciliation."
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

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <p>No reconciled visits yet for this service user.</p>
              <p className="mt-1 text-xs">
                Completed visits appear here after they are synced in Visit reconciliation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Visit</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Carer</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Planned</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Actual</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5" aria-hidden />
                        Funder charge
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <PoundSterling className="h-3.5 w-3.5" aria-hidden />
                        Carer pay
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Exceptions</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-mono text-xs font-medium whitespace-nowrap">
                        {row.visitRef || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{row.date || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{row.carerName || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {row.planned || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {row.actual || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isFunderNotCharged(row.status) ? (
                          <div>
                            <span className="font-medium tabular-nums text-foreground">£0.00</span>
                            <div className="text-[11px] text-muted-foreground">
                              Not billed
                              {row.billableAmount ? ` · priced ${row.billableAmount}` : ''}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium tabular-nums text-foreground">
                              {row.billableAmount ?? '—'}
                            </span>
                            {row.approvedBillable && row.approvedBillable !== '—' ? (
                              <div className="text-[11px] text-muted-foreground">
                                {row.approvedBillable}
                              </div>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                        {isCarerNotPaid(row.status) ? (
                          <div>
                            <span className="font-medium text-foreground">£0.00</span>
                            <div className="text-[11px]">
                              Not paid
                              {row.payableAmount ? ` · priced ${row.payableAmount}` : ''}
                            </div>
                          </div>
                        ) : (
                          (row.payableAmount ?? '—')
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <VisitReconStatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        {row.exceptions?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {row.exceptions.slice(0, 3).map(ex => (
                              <BillingExceptionBadge key={`${row.id}-${ex.code}`} code={ex.code} />
                            ))}
                            {row.exceptions.length > 3 ? (
                              <span className="text-xs text-muted-foreground">
                                +{row.exceptions.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => setDetailRow(row)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

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
