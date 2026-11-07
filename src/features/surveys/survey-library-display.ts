import type { LibrarySurvey } from '@/features/surveys/api/survey-library.api'
import type { SurveyTargetKind } from '@/features/surveys/types'

/** Who answers a ready-made survey, in plain words. */
export const LIBRARY_AUDIENCE_LABELS: Record<SurveyTargetKind, string> = {
  SERVICE_USER: 'People we support',
  EMPLOYEE: 'Staff',
  PUBLIC: 'Public',
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Short timing for a card, e.g. "Once a year: opens on the first working day of February…" →
 * "Once a year, February". The full sentence stays in the Read dialog.
 */
export function shortTiming(timing: LibrarySurvey['timing']): string {
  const full = timing.when.trim()
  const base = full.split(/[:;]|\s[—–-]\s/)[0]!.trim().replace(/[.,]$/, '')
  if (!base) return full
  const month = MONTHS.find(m => new RegExp(`\\b${m}\\b`).test(full))
  return month && !base.includes(month) ? `${base}, ${month}` : base
}

/**
 * Card summary: drops trailing sentences that only repeat the facts row (confidential, N questions,
 * about N minutes…). Keeps at least the first sentence.
 */
export function cardSummary(summary: string): string {
  const sentences = summary.trim().split(/(?<=[.!?])\s+/).filter(Boolean)
  const repeatsFacts = (s: string) => /\b\d+\s+questions?\b|\bminutes?\b/i.test(s)
  while (sentences.length > 1 && repeatsFacts(sentences[sentences.length - 1]!)) sentences.pop()
  if (sentences.length === 1 && repeatsFacts(sentences[0]!)) {
    // One sentence ending in the facts ("…, Confidential, 18 questions, about 8 minutes.")
    const trimmed = sentences[0]!.replace(/[.,;]?\s*(confidential|anonymous|named)?,?\s*\d+\s+questions?.*$/i, '.')
    return trimmed.length > 1 ? trimmed : sentences[0]!
  }
  return sentences.join(' ')
}

/**
 * How answers are kept: anonymous surveys are anonymous; other surveys sent to people we support
 * or staff are confidential (as their privacy notice says); other named surveys are "Named".
 */
export function responsesLabel(s: Pick<LibrarySurvey, 'anonymous' | 'audience'>): 'Anonymous' | 'Confidential' | 'Named' {
  if (s.anonymous) return 'Anonymous'
  return s.audience === 'PUBLIC' ? 'Named' : 'Confidential'
}

/**
 * How answers are kept, in full for the Read view: "Confidential — people can choose to answer
 * without their name" when the ready-made survey offers that choice.
 */
export function responsesDescription(
  s: Pick<LibrarySurvey, 'anonymous' | 'audience' | 'allowAnonymousResponses'>,
): string {
  const label = responsesLabel(s)
  return !s.anonymous && s.allowAnonymousResponses
    ? `${label} — people can choose to answer without their name`
    : label
}

const firstClause = (when: string) =>
  when
    .trim()
    .split(/[:;]|\s[—–-]\s/)[0]!
    .trim()
    .replace(/[.,]$/, '')

const monthIn = (text: string) => MONTHS.findIndex(m => new RegExp(`\\b${m}\\b`).test(text))

/**
 * A ready-made survey's recommended timing as a suggestion, e.g. "Recommended: once a year in
 * February" (null when the survey gives none). Nothing is scheduled from it.
 */
export function recommendedTiming(timing: LibrarySurvey['timing'] | null | undefined): string | null {
  const full = timing?.when?.trim()
  if (!full) return null
  const base = firstClause(full)
  if (!base) return null
  const lower = /^[A-Z][a-z]/.test(base) ? base[0]!.toLowerCase() + base.slice(1) : base
  const month = monthIn(full)
  const named = MONTHS[month]
  return `Recommended: ${named && !base.includes(named) ? `${lower} in ${named}` : lower}`
}

const SHORT_MONTHS = MONTHS.map(m => m.slice(0, 3))

/**
 * Name for a new survey started from a template. Where the ready-made survey repeats, the period is
 * added, e.g. "Annual satisfaction survey — February 2027" (the next February), "… — November
 * 2026" (monthly), "… — October–December 2026" (quarterly). `today` is the organisation's
 * calendar day, "YYYY-MM-DD".
 */
export function suggestSurveyName(
  title: string,
  timing: LibrarySurvey['timing'] | null | undefined,
  today: string,
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(today)
  if (!m || !timing?.recurrence) return title
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  let period: string
  switch (timing.recurrence) {
    case 'YEARLY': {
      const at = monthIn(timing.when ?? '')
      period = at >= 0 ? `${MONTHS[at]} ${at >= month ? year : year + 1}` : String(year)
      break
    }
    case 'QUARTERLY': {
      const first = Math.floor(month / 3) * 3
      period = `${MONTHS[first]}–${MONTHS[first + 2]} ${year}`
      break
    }
    case 'MONTHLY':
      period = `${MONTHS[month]} ${year}`
      break
    case 'WEEKLY': {
      const date = new Date(Date.UTC(year, month, day))
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
      period = `week of ${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
      break
    }
    default:
      return title
  }
  return title.includes(period) ? title : `${title} — ${period}`
}
