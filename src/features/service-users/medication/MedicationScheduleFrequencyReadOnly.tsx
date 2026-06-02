import {
  collectWeekdaysFromSchedules,
  schedulePatternLabel,
  WEEKDAY_OPTIONS,
  type SchedulePattern,
} from '@/features/service-users/medication/medication-schedule-pattern'

type Props = {
  schedulePattern?: SchedulePattern | null
  frequencyIntervalDays?: number | null
  monthlyDayOfMonth?: number | null
  monthlyAnchorToStartDate?: boolean | null
  startDate?: string | null
  schedules?: { daysOfWeek?: string[] | null }[]
  frequencyName?: string | null
  frequencyText?: string | null
}

/** Read-only frequency / schedule pattern block aligned with Add medication dialog. */
export function MedicationScheduleFrequencyReadOnly({
  schedulePattern,
  frequencyIntervalDays,
  monthlyDayOfMonth,
  monthlyAnchorToStartDate,
  startDate,
  schedules,
  frequencyName,
  frequencyText,
}: Props) {
  const pattern = (schedulePattern ?? 'DAILY') as SchedulePattern
  const interval = Math.max(1, frequencyIntervalDays ?? 1)
  const weekdays = collectWeekdaysFromSchedules(schedules)
  const monthlyAnchor = monthlyAnchorToStartDate ?? true
  const lookupLabel = frequencyName?.trim() || frequencyText?.trim() || null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Pattern</label>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
            {schedulePatternLabel(pattern)}
          </div>
        </div>
        {pattern === 'DAILY' && (
          <div className="flex items-end gap-2 pb-0.5 text-sm text-muted-foreground">
            <span>Every</span>
            <span className="font-medium text-foreground">{interval}</span>
            <span>day(s)</span>
          </div>
        )}
      </div>

      {pattern === 'WEEKLY' && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">On weekdays</label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_OPTIONS.map(opt => {
              const active = weekdays.includes(opt.value)
              return (
                <span
                  key={opt.value}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    active
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </span>
              )
            })}
          </div>
          {weekdays.length === 0 && (
            <p className="text-xs text-muted-foreground">No weekdays stored on administration slots.</p>
          )}
        </div>
      )}

      {pattern === 'MONTHLY' && (
        <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          {monthlyAnchor ? (
            <p>
              Same calendar day as start date
              {startDate ? ` (${startDate.slice(0, 10)})` : ''}
            </p>
          ) : (
            <p>
              Fixed day of month:{' '}
              <span className="font-medium text-foreground">{monthlyDayOfMonth ?? '—'}</span>
            </p>
          )}
        </div>
      )}

      {lookupLabel && (
        <p className="text-xs text-muted-foreground">
          MAR frequency: <span className="font-medium text-foreground">{lookupLabel}</span>
        </p>
      )}
    </div>
  )
}
