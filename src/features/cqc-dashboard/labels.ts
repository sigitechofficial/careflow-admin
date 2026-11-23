/** Labels for the CQC dashboard and reports. Ratings and evidence labels come from the mock inspection feature. */

export const KEY_QUESTION_LABEL: Record<string, string> = {
  SAFE: 'Safe',
  EFFECTIVE: 'Effective',
  CARING: 'Caring',
  RESPONSIVE: 'Responsive',
  WELL_LED: 'Well-led',
}

export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  DEATH: 'Death of a person',
  SERIOUS_INJURY: 'Serious injury',
  ABUSE_ALLEGATION: 'Abuse or allegation of abuse',
  POLICE_INCIDENT: 'Police incident',
  SERVICE_DISRUPTION: 'Event stopping the service',
}

const RATING_RANK: Record<string, number> = { INADEQUATE: 1, REQUIRES_IMPROVEMENT: 2, GOOD: 3, OUTSTANDING: 4 }

/** 1 better, -1 worse, 0 the same, null when either is missing. */
export function ratingChange(now: string | null | undefined, before: string | null | undefined): -1 | 0 | 1 | null {
  if (!now || !before) return null
  const d = (RATING_RANK[now] ?? 0) - (RATING_RANK[before] ?? 0)
  return d > 0 ? 1 : d < 0 ? -1 : 0
}

/** "2026-11" → "Nov '26". */
export function shortMonth(month: string): string {
  const [y = 1970, m = 1] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .replace(' ', " '")
}

export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)
