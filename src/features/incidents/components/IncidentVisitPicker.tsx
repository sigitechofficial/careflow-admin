import * as React from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useIncidentVisitOptions } from '@/features/incidents/hooks/useIncidents'
import type { IncidentVisitOption } from '@/features/incidents/types'
import {
  formatOrganisationIsoDate,
  formatOrganisationTime,
} from '@/shared/lib/organisation-display-format.store'

/** No visit chosen yet (''), explicitly "not during a visit", or a scheduled job id. */
export const NOT_DURING_VISIT = 'NONE'

/** Visits within this margin of the incident time count as the likely one. */
const SUGGEST_MARGIN_MS = 30 * 60 * 1000

function shiftDay(isoDay: string, delta: number): string {
  const d = new Date(`${isoDay}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Today as YYYY-MM-DD in the browser's timezone (same clock as the "When did it happen?" input). */
function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prettyStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
}

/** The visit whose time window covers the incident time (± 30 min), if exactly one does. */
export function suggestVisit(options: IncidentVisitOption[], incidentAt: Date): IncidentVisitOption | null {
  const t = incidentAt.getTime()
  if (Number.isNaN(t)) return null
  const hits = options.filter((v) => {
    const start = Date.parse(v.startsAt)
    const end = v.endsAt ? Date.parse(v.endsAt) : start
    return t >= start - SUGGEST_MARGIN_MS && t <= end + SUGGEST_MARGIN_MS
  })
  return hits.length === 1 ? (hits[0] ?? null) : null
}

/**
 * Lets the office link an incident to the visit where it happened or was discovered.
 * Shows the incident date ± 1 day (grouped by day); the day can be moved for incidents
 * reported late or with an uncertain date.
 */
export function IncidentVisitPicker({
  serviceUserId,
  employeeId,
  incidentAt,
  reporterEmployeeId,
  value,
  onChange,
  onSelectedVisitChange,
  noVisitLabel = 'Not during a visit',
  error,
}: {
  serviceUserId?: string
  /** Used when there is no service user (e.g. only a staff member was affected). */
  employeeId?: string
  /** `datetime-local` value of "When did it happen?" */
  incidentAt: string
  reporterEmployeeId?: string
  value: string
  onChange: (value: string) => void
  /** Called with the chosen visit (or null) so the form can suggest its carers. */
  onSelectedVisitChange?: (visit: IncidentVisitOption | null) => void
  /** Label for the "no visit" option (Care Delivery uses "No matching visit found"). */
  noVisitLabel?: string
  error?: string
}) {
  const today = todayIso()
  const incidentDay = incidentAt.slice(0, 10) > today ? today : incidentAt.slice(0, 10)
  const [day, setDay] = React.useState(incidentDay)
  React.useEffect(() => {
    setDay(incidentDay)
  }, [incidentDay])

  const query = useIncidentVisitOptions({
    date: day,
    serviceUserId: serviceUserId || undefined,
    employeeId: serviceUserId ? undefined : employeeId || undefined,
  })
  const options = React.useMemo(() => query.data ?? [], [query.data])
  const suggested = React.useMemo(() => suggestVisit(options, new Date(incidentAt)), [options, incidentAt])

  // Pre-select the visit that covers the incident time, but never override a choice.
  React.useEffect(() => {
    if (!value && suggested) onChange(suggested.scheduledJobId)
  }, [value, suggested, onChange])

  const selectedVisit = React.useMemo(
    () => options.find((v) => v.scheduledJobId === value) ?? null,
    [options, value],
  )
  React.useEffect(() => {
    onSelectedVisitChange?.(selectedVisit)
  }, [selectedVisit, onSelectedVisitChange])

  const byDay = React.useMemo(() => {
    const groups = new Map<string, IncidentVisitOption[]>()
    for (const v of options) groups.set(v.date, [...(groups.get(v.date) ?? []), v])
    return [...groups.entries()]
  }, [options])

  const showServiceUser = !serviceUserId

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Showing visits around</span>
        <Button type="button" variant="ghost" size="sm" aria-label="Previous day" onClick={() => setDay((d) => shiftDay(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <input
          type="date"
          value={day}
          max={today}
          onChange={(e) => e.target.value && setDay(e.target.value > today ? today : e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          aria-label="Show visits around this date"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Next day"
          disabled={day >= today}
          onClick={() => setDay((d) => (d >= today ? d : shiftDay(d, 1)))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Visit">
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading visits…</p>}
        {query.isError && (
          <p className="text-sm text-destructive dark:text-red-400">Could not load visits.</p>
        )}
        {!query.isLoading && !query.isError && options.length === 0 && (
          <p className="text-sm text-muted-foreground">No visits found around this date.</p>
        )}
        {byDay.map(([date, visits]) => (
          <div key={date} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatOrganisationIsoDate(date)}
            </p>
            {visits.map((v) => {
              const checked = value === v.scheduledJobId
              return (
                <label
                  key={v.scheduledVisitId}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/40',
                    checked ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="inc-visit"
                    checked={checked}
                    onChange={() => onChange(v.scheduledJobId)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 space-y-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-foreground">
                        {formatOrganisationTime(v.startsAt)}
                        {v.endsAt ? `–${formatOrganisationTime(v.endsAt)}` : ''}
                      </span>
                      <span className="text-foreground">{v.visitName}</span>
                      {suggested?.scheduledJobId === v.scheduledJobId && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <Star className="h-3 w-3" aria-hidden /> Suggested
                        </span>
                      )}
                    </span>
                    <span className="block text-muted-foreground">
                      {showServiceUser && v.serviceUserName ? `${v.serviceUserName} · ` : ''}
                      {v.carers.length
                        ? v.carers
                            .map((c) => (c.employeeId === reporterEmployeeId ? `${c.name} (reporter)` : c.name))
                            .join(', ')
                        : 'No carer allocated'}
                      {' · '}
                      {prettyStatus(v.status)}
                      {v.visitRef ? (
                        <>
                          {' · '}
                          <span className="font-mono text-xs">{v.visitRef}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        ))}
        <label
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/40',
            value === NOT_DURING_VISIT ? 'border-primary bg-primary/5' : 'border-border',
          )}
        >
          <input
            type="radio"
            name="inc-visit"
            checked={value === NOT_DURING_VISIT}
            onChange={() => onChange(NOT_DURING_VISIT)}
            className="h-4 w-4 shrink-0"
          />
          <span className="text-foreground">{noVisitLabel}</span>
        </label>
      </div>
      {suggested && value === suggested.scheduledJobId && (
        <p className="text-xs text-muted-foreground">Suggested because the incident time falls within this visit.</p>
      )}
      {error && <p className="text-xs font-medium text-destructive dark:text-red-400">{error}</p>}
    </div>
  )
}
