import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { useAuthStore } from '@/features/auth/store'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { VISIT_CANCELLATION_REASONS } from '@/features/scheduling/utils/visit-cancellation.constants'
import type { TimebankChargeableVisit } from '@/features/timebank/types'
import { formatMinutes } from '@/features/timebank/timebank-format'

const CANCEL_REASON_LABEL = new Map<string, string>(VISIT_CANCELLATION_REASONS.map(r => [r.code, r.label]))

/** "Charged · 6h notice · not added to the timebank" under a chargeable cancellation. */
export function ChargeableNote({ noticeHours }: { noticeHours?: number | null }) {
  return (
    <div className="text-xs text-muted-foreground">
      {[
        'Charged',
        noticeHours != null ? `${formatMinutes(Math.round(noticeHours * 60)) || '0h'} notice` : null,
        'not added to the timebank',
      ]
        .filter(Boolean)
        .join(' · ')}
    </div>
  )
}

/** "Cancelled under 24 hours before the visit: charge 100%" — one line per Job Cancellation rule. */
function cancellationRuleLines(rules: Array<{ hoursFrom: number; hoursTo: number; chargeServiceUserPercent: number }>) {
  const sorted = [...rules].sort((a, b) => a.hoursFrom - b.hoursFrom)
  return sorted.map((r, i) => {
    const band =
      i === sorted.length - 1
        ? `${r.hoursFrom} hours or more`
        : r.hoursFrom === 0
          ? `under ${r.hoursTo} hours`
          : `${r.hoursFrom}–${r.hoursTo} hours`
    const charge =
      r.chargeServiceUserPercent > 0 ? `charge ${r.chargeServiceUserPercent}% of the visit fee` : 'no charge'
    return `Cancelled ${band} before the visit: ${charge}`
  })
}

/** What a chargeable cancellation is and the organisation's Job Cancellation rules, with a link to them. */
function ChargeableRulesNote() {
  const canOpenSettings = useAuthStore(s => s.can('lookups.read' as never))
  const { data: settings } = useGeneralSettings()
  const rules = settings?.domJobCancellationRules ?? []
  return (
    <div
      className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs"
      data-testid="chargeable-rules-note"
    >
      <p className="font-medium text-foreground">When is a visit charged?</p>
      <p className="mt-1 text-muted-foreground">
        When the service user cancels a visit (or it is called off) late, the Job Cancellation rules suggest a charge.
        The office can change the decision when cancelling.
      </p>
      {rules.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-foreground">
          {cancellationRuleLines(rules).map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1.5 text-muted-foreground">
        {settings?.domCancellationHospitalExemption ? 'Hospital admission: no charge. ' : ''}
        Council, NHS and Direct Payment funded care: finance confirms before any charge. Cancelled by our agency: never
        charged.
      </p>
      {canOpenSettings ? (
        <Link
          to="/settings/general"
          search={{ tab: 'dom-care' }}
          className="mt-1.5 inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
          data-testid="chargeable-rules-settings-link"
        >
          Job Cancellation settings (Settings → Dom Care Settings) <ChevronRight className="h-3 w-3" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

/** Side panel listing a service user's chargeable cancellations for the week: why each was cancelled and charged. */
export function ChargeableVisitsSheet({
  open,
  onOpenChange,
  serviceUserName,
  visits,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserName: string
  visits: TimebankChargeableVisit[]
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>Chargeable cancellations — {serviceUserName}</SheetTitle>
          <SheetDescription>
            Visits cancelled or called off with a Charge decision. The service user pays for them, so their hours are
            not added to the timebank.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3">
          <ChargeableRulesNote />
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chargeable cancellations this week.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border" data-testid="timebank-chargeable-list">
              {visits.map(v => (
                <li key={v.jobId} className="flex flex-col gap-1 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{v.jobName}</p>
                    <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
                      {v.cancelledAs === 'CALLED_OFF' ? 'Called off' : 'Cancelled'} · Charged
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(v.day)} · {formatTime(v.start)}
                    {v.end ? `–${formatTime(v.end)}` : ''} · {formatMinutes(v.plannedMinutes)}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Reason: </span>
                    {v.cancelReasonCode ? (CANCEL_REASON_LABEL.get(v.cancelReasonCode) ?? v.cancelReasonCode) : '—'}
                  </p>
                  {v.cancelReasonNotes ? (
                    <p className="text-xs text-muted-foreground">“{v.cancelReasonNotes}”</p>
                  ) : null}
                  {v.chargeNotes ? (
                    <p className="text-sm text-foreground">
                      <span className="text-muted-foreground">Why charged: </span>
                      {v.chargeNotes}
                    </p>
                  ) : null}
                  <ChargeableNote noticeHours={v.noticeHours} />
                </li>
              ))}
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
