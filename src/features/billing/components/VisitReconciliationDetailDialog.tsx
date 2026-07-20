import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import {
  BillingExceptionBadge,
  VisitReconStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import {
  useApproveVisitOverrun,
  useRejectVisitOverrun,
  useUpdateVisitReconciliation,
  useVisitReconciliation,
} from '@/features/billing/hooks/useVisitReconciliations'
import type { VisitReconciliationRow } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationRateBreakdown } from '@/features/billing/types/visit-reconciliation.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: VisitReconciliationRow | null
}

function RateBreakdownCard({
  title,
  subtitle,
  timeRange,
  hours,
  breakdown,
  fallbackAmount,
}: {
  title: string
  subtitle: string
  timeRange: string
  hours: string | null
  breakdown: VisitReconciliationRateBreakdown | null
  fallbackAmount: string | null
}) {
  const segments = breakdown?.segments?.filter(s => s.minutes > 0) ?? []

  return (
    <ContentCard className="p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Approved time</dt>
          <dd className="font-medium">{timeRange}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Hours</dt>
          <dd className="font-medium tabular-nums">{hours ?? '—'}</dd>
        </div>
      </dl>
      {breakdown ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3 text-sm">
          {breakdown.cardName ? (
            <p className="text-xs text-muted-foreground">
              Rate card: <span className="font-medium text-foreground">{breakdown.cardName}</span>
              {breakdown.cardCode ? ` (${breakdown.cardCode})` : ''}
            </p>
          ) : null}
          {breakdown.ruleLabel ? (
            <p className="text-xs text-muted-foreground">Rule: {breakdown.ruleLabel}</p>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium tabular-nums">{breakdown.unitRate ?? '—'}</span>
          </div>
          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Calculation
            </p>
            {segments.length > 0 ? (
              <ul className="space-y-2">
                {segments.map((seg, i) => (
                  <li
                    key={`${seg.startLabel}-${seg.endLabel}-${i}`}
                    className="rounded-md border border-border/80 bg-background px-3 py-2 space-y-1"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {seg.startLabel}–{seg.endLabel}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {seg.hoursLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {seg.ruleLabel?.trim() || 'Hourly rate'}
                      {' · '}
                      <span className="tabular-nums text-foreground">{seg.unitRate}</span>
                    </p>
                    <p className="text-sm tabular-nums">{seg.lineFormula}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm tabular-nums">{breakdown.formula}</p>
            )}
            {segments.length > 1 ? (
              <p className="text-xs text-muted-foreground">{breakdown.formula}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums text-primary">
              {breakdown.amount ?? '—'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {fallbackAmount
            ? `Estimated total: ${fallbackAmount} (rate card details unavailable)`
            : 'Amount cannot be calculated — check pay/charge card setup and approved times.'}
        </p>
      )}
    </ContentCard>
  )
}

export function VisitReconciliationDetailDialog({ open, onOpenChange, row }: Props) {
  const canManage = useAuthStore(s => s.can('billing.visit_reconciliations.manage' as never))
  const detailQuery = useVisitReconciliation(open && row ? row.id : undefined)
  const updateMutation = useUpdateVisitReconciliation()
  const approveOverrunMutation = useApproveVisitOverrun()
  const rejectOverrunMutation = useRejectVisitOverrun()
  const detail = detailQuery.data
  const preview = detail?.calculationPreview

  const [travelMiles, setTravelMiles] = React.useState('')
  const [overrunNotes, setOverrunNotes] = React.useState('')

  React.useEffect(() => {
    if (!detail) return
    setTravelMiles(detail.travelMiles != null ? String(detail.travelMiles) : '')
    setOverrunNotes('')
  }, [detail?.id, detail?.travelMiles])

  const canEditTravel = detail && detail.status !== 'LOCKED'
  const pendingOverrun =
    detail &&
    (detail.overrunMinutes ?? 0) > 0 &&
    (detail.overrunDecision === 'PENDING' || detail.overrunDecision == null)
  const overrunBusy = approveOverrunMutation.isPending || rejectOverrunMutation.isPending

  const saveTravel = async () => {
    if (!detail || !canEditTravel) return
    try {
      await updateMutation.mutateAsync({
        id: detail.id,
        body: {
          travelMiles: travelMiles.trim() === '' ? null : Number(travelMiles),
          // Travel time UI is hidden for now — keep existing value unchanged.
        },
      })
      toastSuccess('Mileage saved. Payroll will use this with the pay card mileage rate.')
    } catch (err) {
      toastApiError(err, 'Could not save mileage.')
    }
  }

  const decideOverrun = async (decision: 'approve' | 'reject') => {
    if (!detail) return
    try {
      if (decision === 'approve') {
        await approveOverrunMutation.mutateAsync({
          id: detail.id,
          notes: overrunNotes.trim() || undefined,
        })
        toastSuccess('Overrun acknowledged. Gross pay remains on planned visit time.')
      } else {
        await rejectOverrunMutation.mutateAsync({
          id: detail.id,
          notes: overrunNotes.trim() || undefined,
        })
        toastSuccess('Overrun rejected. Gross pay remains on planned visit time.')
      }
    } catch (err) {
      toastApiError(err, 'Could not save overrun decision.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Visit billing details</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          {!row ? null : detailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading visit details…
            </div>
          ) : detailQuery.isError || !detail ? (
            <p className="text-sm text-destructive">Could not load visit details.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-medium">{detail.visitRef}</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.date} · {detail.serviceUserName}
                    {detail.carerName ? ` · ${detail.carerName}` : ''}
                  </p>
                </div>
                <VisitReconStatusBadge status={detail.status} />
              </div>

              <ContentCard className="p-4">
                <h4 className="mb-3 text-sm font-semibold">Time worked</h4>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Planned</dt>
                    <dd className="font-medium">{preview?.timeWindows.planned ?? row.planned}</dd>
                    <dd className="text-xs text-muted-foreground tabular-nums">
                      {preview?.plannedHours ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Actual (recorded)</dt>
                    <dd className="font-medium">{preview?.timeWindows.actual ?? row.actual}</dd>
                    <dd className="text-xs text-muted-foreground tabular-nums">
                      {preview?.actualHours ?? '—'}
                    </dd>
                  </div>
                </dl>
              </ContentCard>

              {(detail.overrunMinutes ?? 0) > 0 ? (
                <ContentCard className="space-y-3 border-amber-300/50 bg-amber-50/40 p-4 dark:border-amber-700/40 dark:bg-amber-950/20">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Duration overrun — {detail.overrunMinutes} min
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gross pay and invoice use the planned visit length. The extra{' '}
                      {detail.overrunMinutes} minutes are flagged for review only.
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm">
                    <p className="text-xs text-muted-foreground">Carer / recorder reason</p>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {detail.overrunReason?.trim() || 'No reason provided'}
                    </p>
                  </div>
                  {detail.overrunDecision && detail.overrunDecision !== 'PENDING' ? (
                    <p className="text-sm">
                      Decision:{' '}
                      <span className="font-medium">
                        {detail.overrunDecision === 'APPROVED'
                          ? 'Acknowledged — pay stays planned'
                          : 'Rejected — pay stays planned'}
                      </span>
                    </p>
                  ) : null}
                  {canManage && pendingOverrun ? (
                    <div className="space-y-2">
                      <label className="block space-y-1 text-sm">
                        <span className="text-xs text-muted-foreground">Admin notes (optional)</span>
                        <Input
                          value={overrunNotes}
                          onChange={e => setOverrunNotes(e.target.value)}
                          disabled={overrunBusy}
                          placeholder="Optional note for this decision"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={overrunBusy}
                          onClick={() => void decideOverrun('approve')}
                        >
                          Acknowledge overrun
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={overrunBusy}
                          onClick={() => void decideOverrun('reject')}
                        >
                          Reject overrun note
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </ContentCard>
              ) : null}

              <ContentCard className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">Mileage</h4>
                  <p className="text-xs text-muted-foreground">
                    Enter approved journey miles between visits. Payroll multiplies this by the carer’s pay card mileage (£/mile) rate.
                  </p>
                </div>
                <label className="block max-w-xs space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Travel distance (miles)</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={travelMiles}
                    onChange={e => setTravelMiles(e.target.value)}
                    disabled={!canEditTravel || updateMutation.isPending}
                    placeholder="e.g. 6.2"
                  />
                </label>
                {canEditTravel ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveTravel()}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save mileage'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Locked — mileage can no longer be edited.</p>
                )}
              </ContentCard>

              <RateBreakdownCard
                title="Carer pay"
                subtitle="Payroll — based on approved payable time"
                timeRange={preview?.timeWindows.approvedPayable ?? row.approvedPayable}
                hours={preview?.payableHours ?? null}
                breakdown={preview?.carerPay ?? null}
                fallbackAmount={detail.payableAmount}
              />

              <RateBreakdownCard
                title="Client charge"
                subtitle="Invoice — based on approved billable time"
                timeRange={preview?.timeWindows.approvedBillable ?? row.approvedBillable}
                hours={preview?.billableHours ?? null}
                breakdown={preview?.clientCharge ?? null}
                fallbackAmount={detail.billableAmount}
              />

              {preview?.exceptionDetails && preview.exceptionDetails.length > 0 ? (
                <ContentCard className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Exceptions</h4>
                  <ul className="space-y-2">
                    {preview.exceptionDetails.map(ex => (
                      <li
                        key={`${ex.code}-${ex.message}`}
                        className="flex flex-wrap items-start gap-2 text-sm"
                      >
                        <BillingExceptionBadge
                          code={ex.code}
                          message={ex.message}
                          serviceUserId={row.serviceUserId}
                          employeeId={row.employeeId}
                          scheduledJobId={row.scheduledJobId}
                        />
                        <span className="text-muted-foreground">{ex.message}</span>
                      </li>
                    ))}
                  </ul>
                </ContentCard>
              ) : null}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
