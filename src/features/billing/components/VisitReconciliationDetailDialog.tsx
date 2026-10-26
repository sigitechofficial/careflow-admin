import * as React from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Loader2, PoundSterling, User, Wallet, XCircle } from 'lucide-react'
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
import { Badge } from '@/shared/ui/badge'
import { SectionInfoTip } from '@/features/billing/components/SectionInfoTip'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import {
  BillingExceptionBadge,
  VisitReconStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import {
  useApproveVisitOverrun,
  useRejectVisitOverrun,
  useSetVisitBillableAmount,
  useSetVisitPayableAmount,
  useUpdateVisitReconciliation,
  useVisitReconciliation,
} from '@/features/billing/hooks/useVisitReconciliations'
import type { VisitReconciliationRow } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationRateBreakdown } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationDetail } from '@/features/billing/types/visit-reconciliation.types'
import { toastApiError, toastSuccess, toastWithVariant } from '@/shared/lib/toast'
import { payTimeEditNotice } from '@/features/billing/utils/pay-time-outcome.util'
import { useAuthStore } from '@/features/auth/store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { formatReconClock } from '@/features/billing/utils/visit-reconciliation-display.util'
import { VisitPayCorrectionsCard } from '@/features/billing/components/VisitPayCorrectionsCard'
import { VisitMileageCorrectionCard } from '@/features/billing/components/VisitMileageCorrectionCard'
import { VisitTravelTimeCard } from '@/features/billing/components/VisitTravelTimeCard'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'

/** Heading between the modal's sections (the visit, carer pay, client charge). */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-t border-border pt-4 text-base font-semibold text-foreground first:border-t-0 first:pt-0">
      {children}
    </h3>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: VisitReconciliationRow | null
}

/** Split stored approval notes into readable entries (newlines / amount-set lines). */
function parseApprovalNoteEntries(notes: string): string[] {
  const trimmed = notes.trim()
  if (!trimmed) return []
  const byLine = trimmed
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
  if (byLine.length > 1) return byLine

  // Older rows sometimes concatenated without newlines — split on amount markers.
  const single = byLine[0] ?? trimmed
  const parts = single
    .split(/(?=(?:Payable|Billable) amount set to)/i)
    .map(part => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts : [single]
}

function approvalNoteKind(entry: string): 'payable' | 'billable' | 'other' {
  if (/^Payable amount set to/i.test(entry)) return 'payable'
  if (/^Billable amount set to/i.test(entry)) return 'billable'
  return 'other'
}

function RateBreakdownCard({
  title,
  subtitle,
  timeRange,
  hours,
  breakdown,
  fallbackAmount,
  unavailableReason,
  icon,
  compact = false,
  /** When set (e.g. funder split share), shown as Total instead of card-gross breakdown.amount. */
  chargedTotal,
  chargedTotalNote,
  isManualOverride = false,
}: {
  title: string
  subtitle: string
  timeRange: string
  hours: string | null
  breakdown: VisitReconciliationRateBreakdown | null
  fallbackAmount: string | null
  /** Shown when rate breakdown cannot be built (e.g. missing charge-card rules). */
  unavailableReason?: string | null
  icon?: React.ReactNode
  /** Summary-only card (e.g. multi-funder total when per-funder cards follow). */
  compact?: boolean
  chargedTotal?: string | null
  chargedTotalNote?: string | null
  isManualOverride?: boolean
}) {
  const segments = breakdown?.segments?.filter(s => s.minutes > 0) ?? []
  const appliedRules = breakdown?.appliedRules?.filter(r => r.label.trim() || r.detail.trim()) ?? []
  // Banded visits already show the charged slice in Calculation — don't repeat Applied rule + Time.
  const showAppliedRules = !compact && appliedRules.length > 0 && segments.length === 0
  const displayTotal = chargedTotal?.trim() || breakdown?.amount || fallbackAmount || '—'
  const manual =
    isManualOverride ||
    Boolean(breakdown?.manualOverride) ||
    Boolean(breakdown?.explanation?.toLowerCase().includes('manual'))

  return (
    <ContentCard className="p-4 space-y-3">
      <div>
        <h4 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
          <SectionInfoTip label={title}>{subtitle}</SectionInfoTip>
          {manual ? (
            <Badge variant="secondary" className="text-[10px] font-normal">
              Manual override
            </Badge>
          ) : null}
        </h4>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
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

          {showAppliedRules ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Rate used
              </p>
              <ul className="space-y-2">
                {appliedRules.map((rule, i) => (
                  <li
                    key={`${rule.label}-${rule.rateType}-${i}`}
                    className="rounded-md border border-border/80 bg-background px-3 py-2 space-y-1"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-foreground">{rule.label}</span>
                      {rule.amount ? (
                        <span className="tabular-nums font-medium text-foreground">{rule.amount}</span>
                      ) : rule.unitRate ? (
                        <span className="tabular-nums text-foreground">{rule.unitRate}</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[rule.rateTypeLabel, rule.dayTypeLabel, rule.timeWindow, rule.unitRate]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!compact && !showAppliedRules && breakdown.ruleLabel && segments.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Rule: <span className="font-medium text-foreground">{breakdown.ruleLabel}</span>
            </p>
          ) : null}

          {!compact ? (
            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                How it was calculated
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
                          <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                            {seg.hoursLabel}
                          </span>
                        </span>
                        <span className="tabular-nums font-medium">{seg.amount}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {seg.ruleLabel?.trim() || 'Hourly rate'}
                        {' · '}
                        <span className="tabular-nums text-foreground">{seg.unitRate}</span>
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">{seg.lineFormula}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm tabular-nums">{breakdown.formula}</p>
              )}
              {segments.length > 1 ? (
                <p className="text-sm text-muted-foreground">{breakdown.formula}</p>
              ) : null}
              {chargedTotalNote ? (
                <p className="text-sm text-muted-foreground">{chargedTotalNote}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2">
            <span className="font-medium">{chargedTotal ? 'Charged to this funder' : 'Total'}</span>
            <span className="text-lg font-semibold tabular-nums text-primary">{displayTotal}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {unavailableReason?.trim()
            ? unavailableReason
            : fallbackAmount
              ? `Estimated total: ${fallbackAmount} (rate card details unavailable)`
              : 'Amount cannot be calculated — check pay/charge card setup and approved times.'}
        </p>
      )}
    </ContentCard>
  )
}

function parseStoredAmount(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  const n = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? String(n) : ''
}

const gbp = (amount: number) => `£${amount.toFixed(2)}`

/** Mileage and travel time paid with the visit pay, and what the carer gets for the visit in all. */
function TravelPayCard({
  travelPay,
  visitPay,
}: {
  travelPay: NonNullable<VisitReconciliationDetail['travelPay']>
  visitPay: string | null
}) {
  const lines = [
    travelPay.mileage ? { label: `Mileage (${travelPay.mileage.miles} mi)`, ...travelPay.mileage } : null,
    travelPay.travel ? { label: `Travel time (${travelPay.travel.minutes} min)`, ...travelPay.travel } : null,
  ].filter((line): line is NonNullable<typeof line> => line != null)
  // The visit pay arrives formatted (e.g. "£14.50").
  const visit = visitPay != null ? Number(visitPay.replace(/[^0-9.-]/g, '')) : null
  return (
    <ContentCard className="p-4 space-y-3">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <PoundSterling className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Mileage and travel pay
          <SectionInfoTip label="Mileage and travel pay">
            From the carer’s pay card. The visit pay run pays these as their own lines, beside the visit pay.
          </SectionInfoTip>
        </h4>
      </div>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line.label} className="rounded-md border border-border/80 bg-background px-3 py-2 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{line.label}</span>
              <span className="tabular-nums font-medium">{gbp(line.amount)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{line.explanation}</p>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-border pt-3 text-sm">
        {visit != null && Number.isFinite(visit) ? (
          <div className="flex justify-between gap-2 text-muted-foreground">
            <span>Visit pay + mileage + travel</span>
            <span className="tabular-nums">
              {gbp(visit)} + {gbp(travelPay.total)}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 font-semibold">
          <span>Carer total for this visit</span>
          <span className="tabular-nums">
            {gbp((visit != null && Number.isFinite(visit) ? visit : 0) + travelPay.total)}
          </span>
        </div>
      </div>
    </ContentCard>
  )
}

function ManualAmountEditor({
  title,
  description,
  value,
  notes,
  onValueChange,
  onNotesChange,
  onSave,
  disabled,
  saving,
}: {
  title: string
  description: string
  value: string
  notes: string
  onValueChange: (v: string) => void
  onNotesChange: (v: string) => void
  onSave: () => void
  disabled: boolean
  saving: boolean
}) {
  return (
    <ContentCard className="p-4 space-y-3">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <PoundSterling className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {title}
          <SectionInfoTip label={title}>{description}</SectionInfoTip>
        </h4>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Amount (£)</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value}
            onChange={e => onValueChange(e.target.value)}
            disabled={disabled || saving}
            placeholder="0.00"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Notes (optional)</span>
          <Input
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            disabled={disabled || saving}
            placeholder="Reason for override"
          />
        </label>
      </div>
      {disabled ? (
        <p className="text-xs text-muted-foreground">Locked — amount can no longer be edited.</p>
      ) : (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save amount'}
          </Button>
        </div>
      )}
    </ContentCard>
  )
}

export function VisitReconciliationDetailDialog({ open, onOpenChange, row }: Props) {
  const canManage = useAuthStore(s => s.can('billing.visit_reconciliations.manage' as never))
  const { formatDate, timeDisplayFormat } = useOrganisationDisplayFormat()
  const detailQuery = useVisitReconciliation(open && row ? row.id : undefined)
  const updateMutation = useUpdateVisitReconciliation()
  const setPayableMutation = useSetVisitPayableAmount()
  const setBillableMutation = useSetVisitBillableAmount()
  const approveOverrunMutation = useApproveVisitOverrun()
  const rejectOverrunMutation = useRejectVisitOverrun()
  const detail = detailQuery.data
  const preview = detail?.calculationPreview

  // What the approval decision means for this visit: is the carer actually paid,
  // and is the client / funder actually charged? Priced amounts are shown either way,
  // but a scoped approval (pay-only or bill-only) zeroes out the other side.
  const status = detail?.status
  // Carer will NOT be paid: bill-only approval, or pay explicitly rejected.
  const carerNotPaid = status === 'APPROVED_FOR_INVOICE' || status === 'REJECTED_FOR_PAY'
  // Funders will NOT be charged: pay-only approval, or invoice explicitly rejected.
  const funderNotCharged = status === 'APPROVED_FOR_PAY' || status === 'REJECTED_FOR_INVOICE'

  const decisionBanner: { tone: 'both' | 'pay' | 'bill' | 'reject'; text: string } | null =
    status === 'APPROVED_FOR_PAY'
      ? {
          tone: 'pay',
          text: 'Approved for carer pay only — the carer will be paid. The client / funders are charged £0 for this visit.',
        }
      : status === 'APPROVED_FOR_INVOICE'
        ? {
            tone: 'bill',
            text: 'Approved for client / funder billing only — the funders will be charged. The carer is paid £0 for this visit.',
          }
        : status === 'APPROVED_FOR_BOTH' || status === 'LOCKED'
          ? {
              tone: 'both',
              text: 'Approved for both — the carer is paid and the client / funders are charged for this visit.',
            }
          : status === 'REJECTED_FOR_PAY'
            ? { tone: 'reject', text: 'Carer pay rejected — the carer will not be paid for this visit.' }
            : status === 'REJECTED_FOR_INVOICE'
              ? {
                  tone: 'reject',
                  text: 'Client / funder billing rejected — the funders will not be charged for this visit.',
                }
              : null

  const [travelMiles, setTravelMiles] = React.useState('')
  const [overrunNotes, setOverrunNotes] = React.useState('')
  const [payableInput, setPayableInput] = React.useState('')
  const [payableNotes, setPayableNotes] = React.useState('')
  const [billableInput, setBillableInput] = React.useState('')
  const [billableNotes, setBillableNotes] = React.useState('')
  const [overrunTimeBasis, setOverrunTimeBasis] = React.useState<'PLANNED' | 'ACTUAL'>('ACTUAL')
  const [overrunApplyTo, setOverrunApplyTo] = React.useState<'PAY' | 'CHARGE' | 'BOTH'>('BOTH')

  React.useEffect(() => {
    if (!detail) return
    setTravelMiles(detail.travelMiles != null ? String(detail.travelMiles) : '')
    setOverrunNotes('')
    setOverrunTimeBasis('ACTUAL')
    setOverrunApplyTo('BOTH')
    setPayableInput(parseStoredAmount(detail.payableAmount))
    setPayableNotes('')
    setBillableInput(parseStoredAmount(detail.billableAmount))
    setBillableNotes('')
  }, [detail?.id, detail?.travelMiles, detail?.payableAmount, detail?.billableAmount])

  const canEditAmounts = Boolean(canManage && detail && detail.status !== 'LOCKED')
  // Settled pay is not edited here; the pay corrections card below is the way to change it.
  const paySettled = Boolean(detail?.paySettled)
  const canEditTravel = detail && detail.status !== 'LOCKED' && !paySettled
  const pendingOverrun =
    detail &&
    (detail.overrunMinutes ?? 0) > 0 &&
    (detail.overrunDecision === 'PENDING' || detail.overrunDecision == null)
  const overrunBusy = approveOverrunMutation.isPending || rejectOverrunMutation.isPending
  const payableManual =
    Boolean(preview?.carerPay?.manualOverride) ||
    Boolean(detail?.approvalNotes?.includes('Payable amount set to'))
  const billableManual =
    Boolean(preview?.clientCharge?.manualOverride) ||
    Boolean(detail?.approvalNotes?.includes('Billable amount set to'))

  const saveTravel = async () => {
    if (!detail || !canEditTravel) return
    try {
      const saved = await updateMutation.mutateAsync({
        id: detail.id,
        body: {
          travelMiles: travelMiles.trim() === '' ? null : Number(travelMiles),
          // Travel time UI is hidden for now — keep existing value unchanged.
        },
      })
      // A response that reports a payable-time edit is shown as it is, never as a plain success.
      const notice = payTimeEditNotice(saved.payTimeEdit)
      if (notice) toastWithVariant(notice.variant, notice.title, notice.description)
      else toastSuccess('Mileage saved. Payroll will use this with the pay card mileage rate.')
    } catch (err) {
      toastApiError(err, 'Could not save mileage.')
    }
  }

  const savePayableAmount = async () => {
    if (!detail || !canEditAmounts) return
    const parsed = Number(payableInput)
    if (!Number.isFinite(parsed) || parsed < 0) {
      toastApiError(new Error('Enter a valid carer pay amount (0 or greater).'))
      return
    }
    try {
      await setPayableMutation.mutateAsync({
        id: detail.id,
        body: {
          payableAmount: parsed,
          notes: payableNotes.trim() || undefined,
          approveForPay: true,
        },
      })
      toastSuccess('Carer pay amount saved.')
      setPayableNotes('')
    } catch (err) {
      toastApiError(err, 'Could not save carer pay amount.')
    }
  }

  const saveBillableAmount = async () => {
    if (!detail || !canEditAmounts) return
    const parsed = Number(billableInput)
    if (!Number.isFinite(parsed) || parsed < 0) {
      toastApiError(new Error('Enter a valid client/funder charge amount (0 or greater).'))
      return
    }
    try {
      await setBillableMutation.mutateAsync({
        id: detail.id,
        body: {
          billableAmount: parsed,
          notes: billableNotes.trim() || undefined,
          approveForInvoice: true,
        },
      })
      toastSuccess('Client / funder charge amount saved.')
      setBillableNotes('')
    } catch (err) {
      toastApiError(err, 'Could not save client/funder charge amount.')
    }
  }

  const decideOverrun = async (decision: 'approve' | 'reject') => {
    if (!detail) return
    try {
      if (decision === 'approve') {
        await approveOverrunMutation.mutateAsync({
          id: detail.id,
          notes: overrunNotes.trim() || undefined,
          timeBasis: overrunTimeBasis,
          applyTo: overrunApplyTo,
        })
        toastSuccess('Overrun acknowledged. Amounts recalculated with the chosen time.')
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
      <DialogContent className="w-[96vw] max-w-3xl">
        <TooltipProvider delayDuration={150}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
            Visit billing details
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[85vh] space-y-5 overflow-y-auto">
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
                  <p className="text-sm text-muted-foreground">
                    Visit reference (EMONITORED)
                  </p>
                  <p
                    className="font-mono text-base font-semibold"
                    title="VIS-[BRANCH]-[YYYYMMDD]-[NNNN] — BRANCH from the service user’s branch"
                  >
                    {detail.visitRef}
                  </p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium">{detail.date ? formatDate(detail.date) : '—'}</dd>
                    <dt className="text-muted-foreground">Service user</dt>
                    <dd className="font-medium">{detail.serviceUserName}</dd>
                    {detail.carerName ? (
                      <>
                        <dt className="text-muted-foreground">Carer</dt>
                        <dd className="font-medium">{detail.carerName}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detail.nightDuty ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {detail.nightDutyLabel ??
                        (detail.nightDuty === 'SLEEPING_NIGHT'
                          ? 'Sleeping night'
                          : detail.nightDuty === 'WAKING_NIGHT'
                            ? 'Waking night'
                            : 'Standard')}
                    </span>
                  ) : null}
                  <VisitReconStatusBadge status={detail.status} />
                </div>
              </div>

              {decisionBanner ? (
                <div
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium',
                    decisionBanner.tone === 'pay' &&
                      'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
                    decisionBanner.tone === 'bill' &&
                      'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200',
                    decisionBanner.tone === 'both' &&
                      'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
                    decisionBanner.tone === 'reject' &&
                      'border-destructive/40 bg-destructive/10 text-destructive',
                  )}
                >
                  {decisionBanner.text}
                </div>
              ) : null}

              {detail.approval?.evidenceChangedReason ? (
                <p
                  className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200"
                  data-testid="visit-recon-evidence-changed"
                >
                  {detail.approval.evidenceChangedReason}
                </p>
              ) : null}
              {detail.approval?.source ? (
                <p className="text-sm text-muted-foreground" data-testid="visit-recon-approval-source">
                  {detail.approval.source === 'AUTO_VERIFIED'
                    ? 'Approved automatically: the visit had no exceptions.'
                    : detail.approval.source === 'MANAGER_OVERRIDE'
                      ? 'Approved by a person, overriding an exception.'
                      : 'Approved by a person.'}
                  {detail.approval.approvedAt
                    ? ` ${formatDate(dayKeyFromInstant(detail.approval.approvedAt) || detail.approval.approvedAt.slice(0, 10))}.`
                    : ''}{' '}
                  New attendance evidence sends the visit back for review.
                </p>
              ) : null}

              {/* The visit: what happened and what was flagged. */}
              <SectionHeading>The visit</SectionHeading>
              <ContentCard className="p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Time worked
                  <SectionInfoTip label="Time worked">
                    Planned is the rota time; actual is what was recorded at clock-in and clock-out.
                  </SectionInfoTip>
                </h4>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Planned</dt>
                    <dd className="font-medium">
                      {formatReconClock(
                        preview?.timeWindows.planned ?? row.planned,
                        timeDisplayFormat,
                      )}
                    </dd>
                    <dd className="text-xs text-muted-foreground tabular-nums">
                      {preview?.plannedHours ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Actual (recorded)</dt>
                    <dd className="font-medium">
                      {formatReconClock(
                        preview?.timeWindows.actual ?? row.actual,
                        timeDisplayFormat,
                      )}
                    </dd>
                    <dd className="text-xs text-muted-foreground tabular-nums">
                      {preview?.actualHours ?? '—'}
                    </dd>
                  </div>
                </dl>
              </ContentCard>

              {(detail.overrunMinutes ?? 0) > 0 ? (
                <ContentCard className="space-y-3 border-amber-300/50 bg-amber-50/40 p-4 dark:border-amber-700/40 dark:bg-amber-950/20">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                      Duration overrun — {detail.overrunMinutes} min
                      <SectionInfoTip label="Duration overrun">
                        Until the overrun is acknowledged, carer pay and client charge use the planned
                        visit length. When acknowledging, choose planned or actual time and which
                        amount(s) to update.
                      </SectionInfoTip>
                    </h4>
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
                          ? detail.overrunPayBasis || detail.overrunBillBasis
                            ? `Acknowledged — carer pay: ${
                                detail.overrunPayBasis === 'ACTUAL' ? 'actual time' : 'planned time'
                              }, client charge: ${
                                detail.overrunBillBasis === 'ACTUAL' ? 'actual time' : 'planned time'
                              }`
                            : 'Acknowledged — carer pay and client charge on actual time'
                          : 'Rejected — carer pay and client charge stay on planned time'}
                      </span>
                    </p>
                  ) : null}
                  {canManage && pendingOverrun ? (
                    <div className="space-y-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <fieldset className="space-y-1.5" disabled={overrunBusy}>
                          <legend className="text-xs text-muted-foreground">Calculate using</legend>
                          {(
                            [
                              ['ACTUAL', 'Actual time (clock-in to clock-out)'],
                              ['PLANNED', 'Planned time (booked visit)'],
                            ] as const
                          ).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`overrun-basis-${detail.id}`}
                                checked={overrunTimeBasis === value}
                                onChange={() => setOverrunTimeBasis(value)}
                                data-testid={`overrun-basis-${value.toLowerCase()}`}
                              />
                              {label}
                            </label>
                          ))}
                        </fieldset>
                        <fieldset className="space-y-1.5" disabled={overrunBusy}>
                          <legend className="text-xs text-muted-foreground">Update</legend>
                          {(
                            [
                              ['BOTH', 'Carer pay and client charge'],
                              ['PAY', 'Carer pay only'],
                              ['CHARGE', 'Client charge only'],
                            ] as const
                          ).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`overrun-apply-${detail.id}`}
                                checked={overrunApplyTo === value}
                                onChange={() => setOverrunApplyTo(value)}
                                data-testid={`overrun-apply-${value.toLowerCase()}`}
                              />
                              {label}
                            </label>
                          ))}
                        </fieldset>
                      </div>
                      {overrunApplyTo !== 'BOTH' ? (
                        <p className="text-xs text-muted-foreground">
                          {overrunApplyTo === 'PAY' ? 'Client charge' : 'Carer pay'} stays on the planned time.
                        </p>
                      ) : null}
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
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          disabled={overrunBusy}
                          onClick={() => void decideOverrun('approve')}
                        >
                          Acknowledge overrun
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
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

              {preview?.exceptionDetails && preview.exceptionDetails.length > 0 ? (
                <ContentCard className="p-4 space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    Exceptions
                    <SectionInfoTip label="Exceptions">
                      Problems found when the visit was checked, such as missing clock times or rates. Blocking ones stop
                      the visit being approved until they are resolved.
                    </SectionInfoTip>
                  </h4>
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

              {/* One column: what the carer is paid, then what the client is charged. */}
              <div className="space-y-5">
              <div className="min-w-0 space-y-4">
              <SectionHeading>Paid to the carer</SectionHeading>
              <div className={cn('space-y-4', carerNotPaid && 'opacity-70')}>
                {carerNotPaid ? (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    Not paid for this visit — £0 to the carer. The amount below is the priced value,
                    kept for reference only.
                  </p>
                ) : null}
                <RateBreakdownCard
                  title="Pay carer"
                  subtitle="Payroll — based on this carer’s approved payable time"
                  timeRange={formatReconClock(
                    preview?.timeWindows.approvedPayable ?? row.approvedPayable,
                    timeDisplayFormat,
                  )}
                  hours={preview?.payableHours ?? null}
                  breakdown={preview?.carerPay ?? null}
                  fallbackAmount={detail.payableAmount}
                  isManualOverride={payableManual}
                  icon={<Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                />
                {detail.travelPay ? (
                  <TravelPayCard travelPay={detail.travelPay} visitPay={detail.payableAmount} />
                ) : null}
              <ContentCard className="p-4 space-y-3">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <PoundSterling className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Mileage
                    <SectionInfoTip label="Mileage">
                      Filled automatically from the distance between the carer’s previous service user that day and this one (change it if the journey differed). Payroll multiplies this by the carer’s pay card mileage (£/mile) rate.
                    </SectionInfoTip>
                  </h4>
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
                  <p className="text-xs text-muted-foreground">
                    {paySettled
                      ? 'Paid — mileage can no longer be edited here. Record a mileage correction below for a difference.'
                      : 'Locked — mileage can no longer be edited.'}
                  </p>
                )}
                {paySettled ? <VisitMileageCorrectionCard visitReconciliationId={row.id} /> : null}
                <VisitTravelTimeCard visitReconciliationId={row.id} visitDate={row.date} />
              </ContentCard>
              <VisitPayCorrectionsCard visitReconciliationId={row.id} />
                {canManage ? (
                  <ManualAmountEditor
                    title="Set carer pay manually"
                    description="Override the calculated pay for this visit. Saving also accepts the visit for pay when it is not already approved."
                    value={payableInput}
                    notes={payableNotes}
                    onValueChange={setPayableInput}
                    onNotesChange={setPayableNotes}
                    onSave={() => void savePayableAmount()}
                    disabled={!canEditAmounts || paySettled}
                    saving={setPayableMutation.isPending}
                  />
                ) : null}
              </div>
              </div>

              <div className="min-w-0 space-y-4">
              <SectionHeading>Charged to the client</SectionHeading>
              <div className={cn('space-y-4', funderNotCharged && 'opacity-70')}>
                {funderNotCharged ? (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                    Not billed for this visit — £0 to the client / funders. The amounts below are the
                    priced values, kept for reference only.
                  </p>
                ) : null}
                <RateBreakdownCard
                  title="Client charge"
                  subtitle={
                    preview?.funderClientCharges?.length
                      ? `Sum of each funder’s share: ${preview.funderClientCharges
                          .map((f) => f.shareAmount)
                          .join(' + ')} = ${preview.clientCharge?.amount ?? detail.billableAmount ?? '—'}`
                      : preview?.funderChargeNote?.trim() ||
                        'Invoice — based on approved billable time (org multi-carer funder setting)'
                  }
                  timeRange={formatReconClock(
                    preview?.timeWindows.approvedBillable ?? row.approvedBillable,
                    timeDisplayFormat,
                  )}
                  hours={preview?.billableHours ?? null}
                  breakdown={preview?.clientCharge ?? null}
                  fallbackAmount={detail.billableAmount}
                  isManualOverride={billableManual}
                  compact={Boolean(preview?.funderClientCharges?.length)}
                  icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                />
                {canManage ? (
                  <ManualAmountEditor
                    title="Set client / funder charge manually"
                    description="Override the calculated visit total charged to the client/funders. Multi-funder % splits still apply from this total on invoice runs."
                    value={billableInput}
                    notes={billableNotes}
                    onValueChange={setBillableInput}
                    onNotesChange={setBillableNotes}
                    onSave={() => void saveBillableAmount()}
                    disabled={!canEditAmounts}
                    saving={setBillableMutation.isPending}
                  />
                ) : null}
                {preview?.funderClientCharges?.map((funderCharge) => (
                  <RateBreakdownCard
                    key={`${funderCharge.funderName}-${funderCharge.splitPercent ?? 'none'}`}
                    title={funderCharge.funderName}
                    subtitle={
                      funderCharge.splitPercent != null && funderCharge.splitPercent > 0
                        ? `This funder’s share of the visit (${funderCharge.splitPercent}%)`
                        : funderCharge.reason ?? 'Funder charge'
                    }
                    timeRange={formatReconClock(
                      preview?.timeWindows.approvedBillable ?? row.approvedBillable,
                      timeDisplayFormat,
                    )}
                    hours={preview?.billableHours ?? null}
                    breakdown={funderCharge.breakdown}
                    fallbackAmount={funderCharge.shareAmount}
                    unavailableReason={funderCharge.reason}
                    chargedTotal={funderCharge.shareAmount}
                    chargedTotalNote={
                      funderCharge.splitPercent != null &&
                      funderCharge.splitPercent > 0 &&
                      funderCharge.cardGrossAmount
                        ? `Card visit price ${funderCharge.cardGrossAmount} × ${funderCharge.splitPercent}% = ${funderCharge.shareAmount} charged`
                        : null
                    }
                    icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                  />
                ))}
              </div>

              {preview?.funderSplitPreview && !preview?.funderClientCharges?.length ? (
                <ContentCard className="space-y-3 p-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Funder split (invoice run)</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{preview.funderSplitPreview.note}</p>
                    {preview.funderSplitPreview.visitChargeCardName ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Visit gross priced with:{' '}
                        <span className="font-medium text-foreground">
                          {preview.funderSplitPreview.visitChargeCardName}
                        </span>
                        {preview.funderSplitPreview.note.includes('one gross charge')
                          ? ' (primary funding rate card)'
                          : null}
                      </p>
                    ) : null}
                  </div>
                  <ul className="space-y-2">
                    {preview.funderSplitPreview.lines.map((line) => (
                      <li
                        key={`${line.funderName}-${line.splitPercent ?? 'none'}`}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          line.included
                            ? 'border-border bg-muted/20'
                            : 'border-amber-500/30 bg-amber-500/5'
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-foreground">{line.funderName}</span>
                          <span className="tabular-nums font-medium text-foreground">
                            {line.included ? line.amount : '£0.00'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {line.splitPercent != null && line.splitPercent > 0
                            ? `Split ${line.splitPercent}%`
                            : 'No split %'}
                          {line.chargeCardName ? ` · Charge card: ${line.chargeCardName}` : ''}
                        </p>
                        {line.pricingNote ? (
                          <p className="mt-1 text-xs text-muted-foreground">{line.pricingNote}</p>
                        ) : null}
                        {!line.included && line.reason ? (
                          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{line.reason}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Total visit charge:{' '}
                    <span className="font-medium text-foreground tabular-nums">
                      {preview.funderSplitPreview.totalAmount}
                    </span>
                  </p>
                </ContentCard>
              ) : null}
              </div>
              </div>

              {detail.approvalNotes?.trim() ? (
                <ContentCard className="p-4" data-testid="visit-recon-approval-notes">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Approval history
                    <SectionInfoTip label="Approval history">
                      Notes left each time this visit was approved, newest last.
                    </SectionInfoTip>
                  </h4>
                  <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {parseApprovalNoteEntries(detail.approvalNotes).map((entry, index) => {
                      const kind = approvalNoteKind(entry)
                      return (
                        <li
                          key={`${index}-${entry.slice(0, 40)}`}
                          className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                        >
                          {kind === 'payable' ? (
                            <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px] font-normal">
                              Carer pay
                            </Badge>
                          ) : kind === 'billable' ? (
                            <Badge variant="secondary" className="mt-0.5 shrink-0 text-[10px] font-normal">
                              Client charge
                            </Badge>
                          ) : (
                            <span
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                              aria-hidden
                            />
                          )}
                          <span className="min-w-0 leading-snug text-foreground">{entry}</span>
                        </li>
                      )
                    })}
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
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}
