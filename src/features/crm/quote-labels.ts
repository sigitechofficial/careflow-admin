import type {
  QuoteChargeFrequency,
  QuoteExtraKind,
  QuoteFundingCategory,
  QuoteFundingMethod,
  QuoteNightDuty,
  QuotePatternFrequency,
  QuotePatternInput,
  QuotePayerType,
  QuoteRates,
  QuoteResponseType,
  QuoteSendChannel,
  QuoteStatus,
  QuoteType,
} from '@/features/crm/types/quotation.types'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  CHANGES_REQUESTED: 'Changes requested',
  UNDER_NEGOTIATION: 'Under negotiation',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  SUPERSEDED: 'Superseded',
  CANCELLED: 'Cancelled',
}

export const QUOTE_STATUS_CLASS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-sky-100 text-sky-800',
  SENT: 'bg-violet-100 text-violet-800',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800',
  UNDER_NEGOTIATION: 'bg-indigo-100 text-indigo-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
  SUPERSEDED: 'bg-zinc-100 text-zinc-600',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
}

export const QUOTE_TYPE_LABELS: Record<QuoteType, string> = {
  PROVISIONAL_ESTIMATE: 'Provisional estimate',
  FINAL: 'Final',
}

export const FUNDING_CATEGORY_LABELS: Record<QuoteFundingCategory, string> = {
  PRIVATE: 'Private',
  LOCAL_AUTHORITY: 'Local authority',
  NHS: 'NHS',
  OTHER: 'Other',
  MIXED: 'Mixed',
}

export const PAYER_TYPE_LABELS: Record<QuotePayerType, string> = {
  PRIVATE_CLIENT: 'Private client',
  LOCAL_AUTHORITY: 'Local authority',
  NHS: 'NHS',
  OTHER: 'Other',
}

export const FUNDING_METHOD_LABELS: Record<QuoteFundingMethod, string> = {
  FIXED: '£ per week',
  PERCENTAGE: '% of weekly total',
  PER_VISIT: '£ per visit',
}

export const FREQUENCY_LABELS: Record<QuotePatternFrequency, string> = {
  WEEKLY: 'Every week',
  FORTNIGHTLY: 'Every 2 weeks',
  FOUR_WEEKLY: 'Every 4 weeks',
  ONE_OFF: 'One-off',
}

export const NIGHT_DUTY_LABELS: Record<QuoteNightDuty, string> = {
  NONE: 'Day visit',
  SLEEPING_NIGHT: 'Sleeping night',
  WAKING_NIGHT: 'Waking night',
}

export const EXTRA_KIND_LABELS: Record<QuoteExtraKind, string> = {
  SETUP_FEE: 'Set-up fee',
  MILEAGE: 'Mileage',
  DISCOUNT: 'Discount',
  OTHER: 'Other charge',
}

export const CHARGE_FREQUENCY_LABELS: Record<QuoteChargeFrequency, string> = {
  ONE_OFF: 'One-off',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
}

export const RESPONSE_TYPE_LABELS: Record<QuoteResponseType, string> = {
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CHANGES_REQUESTED: 'Changes requested',
  QUERY: 'Query',
  NO_RESPONSE: 'No response',
}

export const SEND_CHANNEL_LABELS: Record<QuoteSendChannel, string> = {
  EMAIL: 'Email from CareFlow',
  EXTERNAL_EMAIL: 'Emailed outside CareFlow',
  POST: 'Post',
  HAND_DELIVERED: 'Handed over',
  OTHER: 'Other',
}

/** 0=Sun … 6=Sat, shown Monday first. */
export const WEEKDAYS: Array<{ value: number; short: string }> = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 0, short: 'Sun' },
]

/** Versions a response can be recorded on. */
export const RESPONDABLE: QuoteStatus[] = ['SENT', 'UNDER_NEGOTIATION', 'CHANGES_REQUESTED', 'EXPIRED']
export const SENDABLE: QuoteStatus[] = ['APPROVED', 'SENT', 'UNDER_NEGOTIATION']
export const REVISABLE: QuoteStatus[] = ['APPROVED', 'SENT', 'CHANGES_REQUESTED', 'UNDER_NEGOTIATION', 'EXPIRED', 'DECLINED', 'ACCEPTED', 'SUPERSEDED']

export const money = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

export const hours = (minutes: number) => `${Math.round((minutes / 60) * 100) / 100} h`

const EVERY_N_WEEKS: Record<Exclude<QuotePatternFrequency, 'ONE_OFF'>, number> = { WEEKLY: 1, FORTNIGHTLY: 2, FOUR_WEEKLY: 4 }

/** Care time a week from the repeating visits; a visit with 2 carers counts once, one-off visits not at all. */
export function weeklyVisitMinutes(patterns: QuotePatternInput[]): number {
  return patterns.reduce(
    (sum, p) => (p.frequency === 'ONE_OFF' ? sum : sum + (p.durationMinutes * p.daysOfWeek.length) / EVERY_N_WEEKS[p.frequency]),
    0,
  )
}

/** True when the visits take more time a week than the hours allowed (none set: no limit). */
export const overWeeklyHours = (minutes: number, hoursPerWeek: number | null | undefined) =>
  hoursPerWeek != null && minutes > hoursPerWeek * 60 + 0.01

/** Minutes from start to end on the clock; an end at or before the start is the next day. */
export function clockSpan(start: string, end: string): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const span = (toMin(end) - toMin(start) + 1440) % 1440
  return span === 0 ? 1440 : span
}

export const emptyPattern = (): QuotePatternInput => ({
  label: 'Morning call',
  careType: '',
  startTime: '08:00',
  endTime: '08:30',
  windowEndTime: null,
  durationMinutes: 30,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
  frequency: 'WEEKLY',
  effectiveFrom: null,
  effectiveTo: null,
  oneOffDates: [],
  carersPerVisit: 1,
  nightDuty: 'NONE',
  activities: [],
  notes: '',
  manualChargePerVisit: null,
  overrideReason: null,
})

/**
 * The price of one visit on an ordinary weekday, as the server prices it: a night rate, else a
 * short-visit price, else the hourly rate × length; × carers. Null when no rate applies yet.
 */
export function visitBasePrice(
  visit: Pick<QuotePatternInput, 'durationMinutes' | 'carersPerVisit' | 'nightDuty'>,
  hourlyRate: number | null,
  rates: QuoteRates | null | undefined,
): { amount: number; how: string } | null {
  const carers = Math.max(1, visit.carersPerVisit)
  const times = carers > 1 ? ` × ${carers} carers` : ''
  const mins = visit.durationMinutes
  // Rates still at 0 (a line not filled in yet) are ignored, as on the server.
  if (visit.nightDuty === 'SLEEPING_NIGHT' && rates?.sleepingNightPrice) {
    return { amount: rates.sleepingNightPrice * carers, how: `sleeping night ${money(rates.sleepingNightPrice)}${times}` }
  }
  if (visit.nightDuty === 'WAKING_NIGHT' && rates?.wakingNightHourly) {
    return {
      amount: ((rates.wakingNightHourly * mins) / 60) * carers,
      how: `waking night ${money(rates.wakingNightHourly)}/hour × ${mins} min${times}`,
    }
  }
  const band = [...(rates?.shortVisits ?? [])].filter(b => b.pricePerVisit > 0).sort((a, b) => a.upToMinutes - b.upToMinutes).find(b => mins <= b.upToMinutes)
  if (band) return { amount: band.pricePerVisit * carers, how: `short visit (up to ${band.upToMinutes} min) ${money(band.pricePerVisit)}${times}` }
  if (hourlyRate == null) return null
  return { amount: ((hourlyRate * mins) / 60) * carers, how: `${money(hourlyRate)}/hour × ${mins} min${times}` }
}

/** "Weekends +20% · bank holidays £30.00/hour" — the day rates that change a visit's price. */
export function dayRatesNote(rates: QuoteRates | null | undefined): string | null {
  const one = (label: string, r: QuoteRates['weekend']) =>
    r && r.value > 0 ? `${label} ${r.mode === 'PERCENT' ? `+${r.value}%` : `${money(r.value)}/hour`}` : null
  const parts = [one('weekends', rates?.weekend), one('bank holidays', rates?.bankHoliday)].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
