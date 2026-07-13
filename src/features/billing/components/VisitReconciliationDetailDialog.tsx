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
  useUpdateVisitReconciliation,
  useVisitReconciliation,
} from '@/features/billing/hooks/useVisitReconciliations'
import type { VisitReconciliationRow } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationRateBreakdown } from '@/features/billing/types/visit-reconciliation.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

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
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-sm">
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
          <div className="border-t border-border pt-2">
            <p className="text-xs text-muted-foreground">Calculation</p>
            <p className="font-mono text-sm">{breakdown.formula}</p>
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
  const detailQuery = useVisitReconciliation(open && row ? row.id : undefined)
  const updateMutation = useUpdateVisitReconciliation()
  const detail = detailQuery.data
  const preview = detail?.calculationPreview

  const [travelMiles, setTravelMiles] = React.useState('')
  const [travelMinutes, setTravelMinutes] = React.useState('')

  React.useEffect(() => {
    if (!detail) return
    setTravelMiles(detail.travelMiles != null ? String(detail.travelMiles) : '')
    setTravelMinutes(detail.travelMinutes != null ? String(detail.travelMinutes) : '')
  }, [detail?.id, detail?.travelMiles, detail?.travelMinutes])

  const canEditTravel = detail && detail.status !== 'LOCKED'

  const saveTravel = async () => {
    if (!detail || !canEditTravel) return
    try {
      await updateMutation.mutateAsync({
        id: detail.id,
        body: {
          travelMiles: travelMiles.trim() === '' ? null : Number(travelMiles),
          travelMinutes: travelMinutes.trim() === '' ? null : Number(travelMinutes),
        },
      })
      toastSuccess('Travel details saved. Payroll will use these with the pay card rates.')
    } catch (err) {
      toastApiError(err, 'Could not save travel details.')
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

              <ContentCard className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">Travel & mileage</h4>
                  <p className="text-xs text-muted-foreground">
                    Enter approved journey values. Payroll multiplies these by the carer’s pay card mileage (£/mile) and travel time (£/hr) rates.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
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
                  <label className="space-y-1 text-sm">
                    <span className="text-xs text-muted-foreground">Travel time (minutes)</span>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={travelMinutes}
                      onChange={e => setTravelMinutes(e.target.value)}
                      disabled={!canEditTravel || updateMutation.isPending}
                      placeholder="e.g. 15"
                    />
                  </label>
                </div>
                {canEditTravel ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveTravel()}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save travel'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Locked — travel can no longer be edited.</p>
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
                        <BillingExceptionBadge code={ex.code} />
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
