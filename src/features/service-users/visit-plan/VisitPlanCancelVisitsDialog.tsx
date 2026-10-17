import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-table'
import { cn, formatDate, formatTime } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import {
  cancellationRequiresNotification,
  cancellationRequiresWelfare,
  VISIT_CHARGE_DECISION_OPTIONS,
  visitCancellationReasonMeta,
  type VisitCancellationReasonCode,
  type VisitChargeDecision,
} from '@/features/scheduling/utils/visit-cancellation.constants'
import {
  previewCancelVisits,
  useCancelVisitsOnDates,
  useCancellableVisits,
  VISIT_CANCELLATION_REASONS_BY_PARTY,
  VISIT_CANCELLED_BY_OPTIONS,
  type CancellableVisit,
  type CancelVisitsPreviewItem,
  type VisitCancelledByParty,
} from '@/features/service-users/visit-plan/visit-plan-date-changes.api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
}

const FOLLOW_POLICY = 'POLICY'
const ALL_SLOTS = '__all__'

const SUGGESTED_BILLING_LABEL: Record<NonNullable<CancelVisitsPreviewItem['suggestedDecision']>, string> = {
  NO_CHARGE: 'No charge',
  CHARGE: 'Charge',
  PENDING_REVIEW: 'Finance review',
}

function visitKey(v: { visitPlanSlotId: string; date: string }): string {
  return `${v.visitPlanSlotId}|${v.date}`
}

function weekdayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}

export function VisitPlanCancelVisitsDialog({ open, onOpenChange, serviceUserId, planId }: Props) {
  const [range, setRange] = React.useState({ from: '', to: '' })
  const [slotFilter, setSlotFilter] = React.useState(ALL_SLOTS)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [cancelledBy, setCancelledBy] = React.useState<VisitCancelledByParty | ''>('')
  const [description, setDescription] = React.useState('')
  const [reasonCode, setReasonCode] = React.useState<VisitCancellationReasonCode | ''>('')
  const [reasonNotes, setReasonNotes] = React.useState('')
  const [billing, setBilling] = React.useState<typeof FOLLOW_POLICY | VisitChargeDecision>(FOLLOW_POLICY)
  const [billingNotes, setBillingNotes] = React.useState('')
  const [welfareChecked, setWelfareChecked] = React.useState(false)
  const [familyNotified, setFamilyNotified] = React.useState(false)
  const [commissionerNotified, setCommissionerNotified] = React.useState(false)

  React.useEffect(() => {
    if (open) return
    setRange({ from: '', to: '' })
    setSlotFilter(ALL_SLOTS)
    setSelected(new Set())
    setCancelledBy('')
    setDescription('')
    setReasonCode('')
    setReasonNotes('')
    setBilling(FOLLOW_POLICY)
    setBillingNotes('')
    setWelfareChecked(false)
    setFamilyNotified(false)
    setCommissionerNotified(false)
  }, [open])

  const visitsQuery = useCancellableVisits(serviceUserId, planId, range, open)
  const cancelVisits = useCancelVisitsOnDates(serviceUserId, planId)
  const visits = React.useMemo(() => visitsQuery.data?.visits ?? [], [visitsQuery.data])

  const slotOptions = React.useMemo(() => {
    const seen = new Map<string, string>()
    for (const v of visits) seen.set(v.slotCode, v.slotLabel)
    return [...seen.entries()]
  }, [visits])

  const shown = React.useMemo(
    () => (slotFilter === ALL_SLOTS ? visits : visits.filter((v) => v.slotCode === slotFilter)),
    [visits, slotFilter],
  )
  const selectedVisits = React.useMemo(() => visits.filter((v) => selected.has(visitKey(v))), [visits, selected])
  const employeeNameById = useEmployeeNameMap(
    React.useMemo(() => [...new Set(visits.flatMap((v) => v.carerEmployeeIds))], [visits]),
  )

  // Visits that left the list (range change, refetch) cannot stay selected.
  React.useEffect(() => {
    const available = new Set(visits.map(visitKey))
    setSelected((prev) => {
      const next = new Set([...prev].filter((k) => available.has(k)))
      return next.size === prev.size ? prev : next
    })
  }, [visits])

  const effectiveReason: VisitCancellationReasonCode | '' = cancelledBy === 'OTHER' ? 'OTHER' : reasonCode
  const reasonMeta = effectiveReason ? visitCancellationReasonMeta(effectiveReason) : null
  const selectedItems = React.useMemo(
    () => selectedVisits.map((v) => ({ visitPlanSlotId: v.visitPlanSlotId, date: v.date })),
    [selectedVisits],
  )

  const previewQuery = useQuery({
    queryKey: ['visit-plan-cancel-preview', planId, cancelledBy, effectiveReason, selectedItems.map(visitKey).join(',')],
    enabled: open && selectedItems.length > 0 && Boolean(cancelledBy) && Boolean(effectiveReason),
    queryFn: () =>
      previewCancelVisits(serviceUserId, planId, {
        items: selectedItems,
        cancelledBy: cancelledBy as VisitCancelledByParty,
        reasonCode: effectiveReason as VisitCancellationReasonCode,
      }),
  })
  const previewByKey = React.useMemo(
    () => new Map((previewQuery.data?.items ?? []).map((i) => [visitKey(i), i])),
    [previewQuery.data],
  )
  const billingCounts = React.useMemo(() => {
    const counts = { NO_CHARGE: 0, CHARGE: 0, PENDING_REVIEW: 0 }
    for (const item of previewQuery.data?.items ?? []) {
      if (item.suggestedDecision) counts[item.suggestedDecision] += 1
    }
    return counts
  }, [previewQuery.data])

  const timeCriticalVisit = selectedVisits.some((v) => v.timeCritical)
  const needsWelfare = effectiveReason
    ? cancellationRequiresWelfare({ timeCriticalVisit, outcome: 'CANCELLED', reasonCode: effectiveReason })
    : timeCriticalVisit
  const needsNotification = cancellationRequiresNotification({
    timeCriticalVisit,
    familyNotified,
    commissionerNotified,
  })
  const reasonNotesRequired = cancelledBy !== 'OTHER' && Boolean(reasonMeta?.requiresNotes)
  const overriding = billing !== FOLLOW_POLICY

  const toggle = (v: CancellableVisit, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(visitKey(v))
      else next.delete(visitKey(v))
      return next
    })
  }
  const allShownSelected = shown.length > 0 && shown.every((v) => selected.has(visitKey(v)))
  const toggleAllShown = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const v of shown) {
        if (checked) next.add(visitKey(v))
        else next.delete(visitKey(v))
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!selectedItems.length) {
      toastWarning('Choose visits', 'Tick at least one visit to cancel.')
      return
    }
    if (!cancelledBy) {
      toastWarning('Who cancelled?', 'Choose who asked for the cancellation.')
      return
    }
    if (cancelledBy === 'OTHER' && !description.trim()) {
      toastWarning('Add a description', 'Describe who cancelled and why.')
      return
    }
    if (!effectiveReason) {
      toastWarning('Choose a reason', 'Select the reason for cancellation.')
      return
    }
    if (reasonNotesRequired && !reasonNotes.trim()) {
      toastWarning('Add reason notes', 'Please describe why these visits are being cancelled.')
      return
    }
    if (needsWelfare && !welfareChecked) {
      toastWarning(
        'Confirm welfare check',
        timeCriticalVisit
          ? 'Welfare review is required for time-critical visits.'
          : 'Confirm a welfare/risk review was completed.',
      )
      return
    }
    if (needsNotification) {
      toastWarning(
        'Confirm notification',
        'Time-critical visits require family/representative or commissioner notification.',
      )
      return
    }
    if (overriding && !billingNotes.trim()) {
      toastWarning('Billing notes required', 'Explain why the suggested billing decision is being changed.')
      return
    }

    try {
      const result = await cancelVisits.mutateAsync({
        items: selectedItems,
        cancelledBy,
        cancelledByDescription: cancelledBy === 'OTHER' ? description.trim() : undefined,
        reasonCode: effectiveReason,
        reasonNotes: reasonNotes.trim() || undefined,
        chargeDecision: overriding ? (billing as VisitChargeDecision) : undefined,
        chargeDecisionNotes: overriding ? billingNotes.trim() : undefined,
        welfareChecked,
        familyNotified,
        commissionerNotified,
      })
      const parts: string[] = []
      if (result.cancelledOnRota) parts.push(`${result.cancelledOnRota} cancelled on the rota`)
      if (result.futureDatesStopped) parts.push(`${result.futureDatesStopped} future date${result.futureDatesStopped === 1 ? '' : 's'} will not be created`)
      toastSuccess(
        `${selectedItems.length} visit${selectedItems.length === 1 ? '' : 's'} cancelled`,
        `${parts.join(', ')}. Other visits are not affected.`,
      )
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not cancel visits')
      void visitsQuery.refetch()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Cancel visits</DialogTitle>
          <DialogDescription>Choose the visits to cancel. Other visits are not affected.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Slot</Label>
                <Select value={slotFilter} onValueChange={setSlotFilter}>
                  <SelectTrigger className="mt-1 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SLOTS}>All slots</SelectItem>
                    {slotOptions.map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  className="mt-1 w-40"
                  value={range.from || visitsQuery.data?.from || ''}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  className="mt-1 w-40"
                  value={range.to || visitsQuery.data?.to || ''}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
              </div>
              <p className="ml-auto text-sm text-muted-foreground" data-testid="cancel-visits-selected-count">
                {selected.size} visit{selected.size === 1 ? '' : 's'} selected
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
                    <TableHead variant="data" className="w-10">
                      <Checkbox
                        checked={allShownSelected}
                        disabled={shown.length === 0}
                        onCheckedChange={(c) => toggleAllShown(c === true)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead variant="data">Date</TableHead>
                    <TableHead variant="data">Slot</TableHead>
                    <TableHead variant="data">Time</TableHead>
                    <TableHead variant="data">Carers</TableHead>
                    <TableHead variant="data">Status</TableHead>
                    <TableHead variant="data">Billing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitsQuery.isLoading ? (
                    <TableRow>
                      <TableCell variant="data" colSpan={7} className="py-6 text-center text-muted-foreground">
                        Loading visits…
                      </TableCell>
                    </TableRow>
                  ) : shown.length === 0 ? (
                    <TableRow>
                      <TableCell variant="data" colSpan={7} className="py-6 text-center text-muted-foreground">
                        No upcoming visits to cancel in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shown.map((v) => {
                      const key = visitKey(v)
                      const isSelected = selected.has(key)
                      const preview = isSelected ? previewByKey.get(key) : undefined
                      const carers = v.carerEmployeeIds.map((id) => employeeNameById.get(id) ?? 'Carer').join(', ')
                      return (
                        <TableRow
                          key={key}
                          className={cn('cursor-pointer border-b border-border/60', isSelected && 'bg-red-50/60 dark:bg-red-950/20')}
                          onClick={() => toggle(v, !isSelected)}
                        >
                          <TableCell variant="data" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(c) => toggle(v, c === true)}
                              aria-label={`${v.slotLabel} ${formatDate(v.date)}`}
                            />
                          </TableCell>
                          <TableCell variant="data" className="whitespace-nowrap">
                            {weekdayLabel(v.date)} {formatDate(v.date)}
                          </TableCell>
                          <TableCell variant="data">
                            {v.slotLabel}
                            {v.timeCritical ? (
                              <span className="ml-1.5 text-[11px] font-medium text-red-700 dark:text-red-300">
                                Time critical
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell variant="data" className="whitespace-nowrap">
                            {formatTime(v.startDateTime)}–{formatTime(v.endDateTime)}
                          </TableCell>
                          <TableCell variant="data">{carers || '—'}</TableCell>
                          <TableCell variant="data" className="whitespace-nowrap">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                v.status === 'ON_ROTA'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {v.status === 'ON_ROTA' ? 'On rota' : 'Not on rota yet'}
                            </span>
                          </TableCell>
                          <TableCell variant="data" className="whitespace-nowrap" title={preview?.explanation ?? undefined}>
                            {preview?.suggestedDecision ? (
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  preview.suggestedDecision === 'CHARGE' && 'text-amber-700 dark:text-amber-300',
                                  preview.suggestedDecision === 'PENDING_REVIEW' && 'text-violet-700 dark:text-violet-300',
                                )}
                              >
                                {SUGGESTED_BILLING_LABEL[preview.suggestedDecision]}
                                {preview.suggestedDecision === 'CHARGE' && preview.chargePercent != null
                                  ? ` ${preview.chargePercent}%`
                                  : ''}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {timeCriticalVisit ? (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-900 dark:bg-red-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-300" aria-hidden />
              <p className="text-sm text-red-900 dark:text-red-100">
                A time-critical visit is selected. Complete a welfare review and notify the family/representative or
                commissioner before cancelling.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Cancelled by <span className="text-red-600">*</span>
              </Label>
              <Select
                value={cancelledBy || undefined}
                onValueChange={(v) => {
                  setCancelledBy(v as VisitCancelledByParty)
                  setReasonCode('')
                }}
              >
                <SelectTrigger className="mt-1" data-testid="cancel-visits-cancelled-by">
                  <SelectValue placeholder="Who asked to cancel?" />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_CANCELLED_BY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cancelledBy === 'OTHER' ? (
              <div>
                <Label htmlFor="cancel-visits-description" className="text-xs text-muted-foreground">
                  Description <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="cancel-visits-description"
                  className="mt-1"
                  placeholder="Who cancelled and why"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Reason for cancellation <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={reasonCode || undefined}
                  disabled={!cancelledBy}
                  onValueChange={(v) => setReasonCode(v as VisitCancellationReasonCode)}
                >
                  <SelectTrigger className="mt-1" data-testid="cancel-visits-reason">
                    <SelectValue placeholder={cancelledBy ? 'Select a reason' : 'Choose "Cancelled by" first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(cancelledBy ? VISIT_CANCELLATION_REASONS_BY_PARTY[cancelledBy] : []).map((code) => (
                      <SelectItem key={code} value={code}>
                        {visitCancellationReasonMeta(code).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="cancel-visits-reason-notes" className="text-xs text-muted-foreground">
              Reason notes {reasonNotesRequired ? '(required)' : '(optional)'}
            </Label>
            <Textarea
              id="cancel-visits-reason-notes"
              className="mt-1 min-h-[72px]"
              placeholder="What happened, who was contacted, alternative arrangements…"
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
            />
          </div>

          <section className="space-y-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing</p>
            {previewQuery.data ? (
              <p className="text-sm" data-testid="cancel-visits-billing-summary">
                Cancellation policy suggests:{' '}
                <strong>{billingCounts.NO_CHARGE}</strong> no charge, <strong>{billingCounts.CHARGE}</strong> charged
                {billingCounts.PENDING_REVIEW > 0 ? (
                  <>
                    , <strong>{billingCounts.PENDING_REVIEW}</strong> for finance review
                  </>
                ) : null}
                .
                {previewQuery.data.fundingTypeName ? (
                  <span className="text-muted-foreground"> Funding: {previewQuery.data.fundingTypeName}.</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {previewQuery.isFetching
                  ? 'Checking the cancellation policy…'
                  : 'Choose visits, who cancelled and a reason to see the billing suggestion.'}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Billing decision</Label>
                <Select value={billing} onValueChange={(v) => setBilling(v as typeof billing)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FOLLOW_POLICY}>As suggested by policy</SelectItem>
                    {VISIT_CHARGE_DECISION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} (all selected visits)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {overriding ? (
                <div>
                  <Label htmlFor="cancel-visits-billing-notes" className="text-xs text-muted-foreground">
                    Billing notes (required)
                  </Label>
                  <Input
                    id="cancel-visits-billing-notes"
                    className="mt-1"
                    placeholder="Why the suggestion is being changed"
                    value={billingNotes}
                    onChange={(e) => setBillingNotes(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              CQC compliance confirmations
            </p>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={welfareChecked} onCheckedChange={(v) => setWelfareChecked(v === true)} />
              <span>
                Welfare / risk review completed
                {needsWelfare ? <span className="text-red-600"> *</span> : null}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={familyNotified} onCheckedChange={(v) => setFamilyNotified(v === true)} />
              <span>Client, family, or representative notified</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={commissionerNotified} onCheckedChange={(v) => setCommissionerNotified(v === true)} />
              <span>Commissioner / funder notified (if applicable)</span>
            </label>
          </section>
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cancelVisits.isPending}>
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={cancelVisits.isPending || selected.size === 0}
            data-testid="cancel-visits-submit"
          >
            {cancelVisits.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cancel {selected.size > 0 ? selected.size : ''} visit{selected.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
