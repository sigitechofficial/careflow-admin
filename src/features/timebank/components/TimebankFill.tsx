import type { TimebankWeekReasons } from '@/features/timebank/types'
import { formatMinutes } from '@/features/timebank/timebank-format'

/** How a week's contracted hours are made up; each part has the colour its column uses. */
export const TIMEBANK_FILL_PARTS = [
  { key: 'delivered', label: 'Delivered', bar: 'bg-emerald-500' },
  { key: 'pending', label: 'Not approved for invoice', bar: 'bg-sky-500' },
  { key: 'awaiting', label: 'Awaiting clock-out', bar: 'bg-violet-500' },
  { key: 'scheduled', label: 'Scheduled', bar: 'bg-slate-400 dark:bg-slate-500' },
  { key: 'short', label: 'Short / hours left to give', bar: 'bg-amber-500' },
] as const

type FillKey = (typeof TIMEBANK_FILL_PARTS)[number]['key']

/** Thin bar: the contracted hours split into delivered, not approved, awaiting, scheduled and short. */
export function TimebankFillBar({ minutes }: { minutes: Record<FillKey, number> }) {
  const total = TIMEBANK_FILL_PARTS.reduce((s, p) => s + Math.max(0, minutes[p.key]), 0)
  if (total <= 0) return null
  return (
    <div
      className="mt-1 flex h-1.5 w-28 overflow-hidden rounded-full bg-muted"
      aria-hidden
      title={TIMEBANK_FILL_PARTS.filter(p => minutes[p.key] > 0)
        .map(p => `${p.label} ${formatMinutes(minutes[p.key])}`)
        .join(' · ')}
    >
      {TIMEBANK_FILL_PARTS.map(p =>
        minutes[p.key] > 0 ? (
          <div key={p.key} className={p.bar} style={{ width: `${(minutes[p.key] / total) * 100}%` }} />
        ) : null,
      )}
    </div>
  )
}

/** Small legend + the sum the columns make, shown above a timebank table. */
export function TimebankFillLegend({ shortLabel, showScheduled }: { shortLabel: string; showScheduled: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        Contracted = Delivered + Not approved for invoice + Awaiting clock-out
        {showScheduled ? ' + Scheduled' : ''} + {shortLabel}
      </span>
      {TIMEBANK_FILL_PARTS.filter(p => showScheduled || p.key !== 'scheduled').map(p => (
        <span key={p.key} className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${p.bar}`} aria-hidden />
          {p.key === 'short' ? shortLabel : p.label}
        </span>
      ))}
    </div>
  )
}

/** "Missed 2h · Cancelled 2h · No visit on rota 1h": why the hours are short. */
export function shortReasonsLine(reasons: TimebankWeekReasons): string {
  const cancelled =
    reasons.cancelledByServiceUserMinutes + reasons.cancelledByAgencyMinutes + reasons.cancelledOtherMinutes
  return [
    reasons.missedMinutes > 0 ? `Missed ${formatMinutes(reasons.missedMinutes)}` : null,
    cancelled > 0 ? `Cancelled ${formatMinutes(cancelled)}` : null,
    reasons.shorterMinutes > 0 ? `Shorter or rejected ${formatMinutes(reasons.shorterMinutes)}` : null,
    reasons.notBookedMinutes > 0 ? `No visit on rota ${formatMinutes(reasons.notBookedMinutes)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
