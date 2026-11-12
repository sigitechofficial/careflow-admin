import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import type { VisitDeliveryAssessment } from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { visitTimingExceptionReasonLabel } from '@/features/scheduling/utils/visit-timing-exception-reason.util'
import { VoiceNoteList } from '@/features/scheduling/components/VoiceNoteList'
import type { VisitVoiceNote } from '@/features/scheduling/types/visit-voice-note.types'

type TimingExceptionSummary = {
  reasonCode?: string | null
  reasonLabel?: string | null
  notes?: string | null
  overrunReason?: string | null
} | null

type CareNotDeliveredSummary = {
  reasonCode?: string | null
  reasonLabel?: string | null
  notes?: string | null
} | null

type CancellationSummary = {
  reasonCode?: string | null
  reasonNotes?: string | null
  outcome?: string | null
} | null

type Props = {
  assessment: VisitDeliveryAssessment
  timingException?: TimingExceptionSummary
  careNotDelivered?: CareNotDeliveredSummary
  cancellation?: CancellationSummary
  /** Carer voice notes recorded at clock-out (timing / overrun notes). */
  clockOutVoiceNotes?: VisitVoiceNote[]
  /** Carer voice notes recorded with "Unable to start". */
  unableToStartVoiceNotes?: VisitVoiceNote[]
  className?: string
}

function flagBadgeClass(severity: 'info' | 'warning' | 'critical'): string {
  if (severity === 'critical') {
    return 'bg-destructive/10 text-destructive border-destructive/30'
  }
  if (severity === 'warning') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
}

function formatSignedMinutes(value: number | null): string {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

export function VisitDeliveryStatusPanel({
  assessment,
  timingException,
  careNotDelivered,
  cancellation,
  clockOutVoiceNotes,
  unableToStartVoiceNotes,
  className,
}: Props) {
  const reasonLabel =
    timingException?.reasonLabel ??
    visitTimingExceptionReasonLabel(timingException?.reasonCode) ??
    null

  return (
    <section
      className={cn('rounded-lg border border-border bg-muted/20 px-4 py-3', className)}
      aria-label="Visit delivery status"
    >
      <h3 className="text-sm font-semibold text-foreground">Delivery status</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Lifecycle, punctuality, and duration exceptions for this visit
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="font-medium">
          {assessment.lifecycleLabel}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            'font-medium',
            assessment.timingStatus === 'CRITICALLY_LATE' && flagBadgeClass('critical'),
            assessment.timingStatus === 'LATE_START' && flagBadgeClass('warning'),
            assessment.timingStatus === 'EARLY_ARRIVAL' && flagBadgeClass('info'),
            assessment.timingStatus === 'ON_TIME' &&
              'bg-success/10 text-success border-success/20',
          )}
          title={`Tolerance ±${assessment.toleranceMinutes} min · critical after ${assessment.criticallyLateThresholdMinutes} min`}
        >
          {assessment.timingLabel}
        </Badge>
        {assessment.flags
          .filter(
            (f) =>
              f.code !== assessment.timingStatus &&
              f.code !== assessment.lifecycleStatus &&
              f.code !== 'LATE_START' &&
              f.code !== 'EARLY_ARRIVAL' &&
              f.code !== 'CRITICALLY_LATE',
          )
          .map((flag) => (
            <Badge
              key={flag.code}
              variant="outline"
              className={cn('font-medium', flagBadgeClass(flag.severity))}
              title={flag.detail}
            >
              {flag.label}
            </Badge>
          ))}
      </div>

      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Start variance</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatSignedMinutes(assessment.startVarianceMinutes)} min
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">End variance</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatSignedMinutes(assessment.endVarianceMinutes)} min
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Planned duration</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {assessment.plannedDurationMinutes != null
              ? `${assessment.plannedDurationMinutes} min`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Actual duration</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {assessment.actualDurationMinutes != null
              ? `${assessment.actualDurationMinutes} min`
              : '—'}
          </dd>
        </div>
      </dl>

      {assessment.flags.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {assessment.flags.map((flag) => (
            <li key={`${flag.code}-${flag.detail ?? ''}`}>
              <span className="font-medium text-foreground">{flag.label}</span>
              {flag.detail ? ` — ${flag.detail}` : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No timing or duration exceptions detected.</p>
      )}

      {reasonLabel || timingException?.overrunReason || timingException?.notes ? (
        <div className="mt-3 rounded-md border border-border/80 bg-background/60 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">Exception reason</p>
          {reasonLabel ? <p className="mt-0.5 text-foreground">{reasonLabel}</p> : null}
          {/* With no office reason list the app sends the note as the reason too — show it once. */}
          {timingException?.notes && timingException.notes.trim() !== reasonLabel?.trim() ? (
            <p className="mt-0.5 text-muted-foreground">{timingException.notes}</p>
          ) : null}
          {timingException?.overrunReason &&
          timingException.overrunReason !== timingException.notes ? (
            <p className="mt-0.5 text-muted-foreground">
              Overrun notes: {timingException.overrunReason}
            </p>
          ) : null}
          <VoiceNoteList voiceNotes={clockOutVoiceNotes} label="Carer voice notes" />
        </div>
      ) : clockOutVoiceNotes?.length ? (
        <div className="mt-3 rounded-md border border-border/80 bg-background/60 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">Clock-out notes</p>
          <VoiceNoteList voiceNotes={clockOutVoiceNotes} label="Carer voice notes" />
        </div>
      ) : null}

      {careNotDelivered?.reasonCode || careNotDelivered?.reasonLabel ? (
        <div className="mt-3 rounded-md border border-sky-300/50 bg-sky-50/70 px-3 py-2 text-xs dark:border-sky-800 dark:bg-sky-950/40">
          <p className="font-medium text-foreground">Care could not be delivered</p>
          <p className="mt-0.5 text-muted-foreground">
            Carer attended / checked in, but care was not started (same as carer-app Unable to start).
          </p>
          <p className="mt-1 text-foreground">
            {careNotDelivered.reasonLabel ??
              careNotDelivered.reasonCode?.replace(/_/g, ' ') ??
              'Recorded'}
          </p>
          {careNotDelivered.notes ? (
            <p className="mt-0.5 text-muted-foreground">{careNotDelivered.notes}</p>
          ) : null}
          <VoiceNoteList voiceNotes={unableToStartVoiceNotes} label="Carer voice notes" />
        </div>
      ) : null}

      {cancellation?.reasonCode ? (
        <div className="mt-3 rounded-md border border-border/80 bg-background/60 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">
            Cancellation / call-off ({cancellation.outcome ?? 'recorded'})
          </p>
          <p className="mt-0.5 text-foreground">{cancellation.reasonCode.replace(/_/g, ' ')}</p>
          {cancellation.reasonNotes ? (
            <p className="mt-0.5 text-muted-foreground">{cancellation.reasonNotes}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
