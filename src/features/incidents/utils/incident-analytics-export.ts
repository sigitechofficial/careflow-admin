import type {
  IncidentAnalytics,
  IncidentListItem,
  IncidentSeverity,
  IncidentStatus,
} from '@/features/incidents/types'
import { INCIDENT_STATUS_LABELS } from '@/features/incidents/types'

const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-10" → "Oct 26". */
export function formatTrendMonth(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} ${y?.slice(2) ?? ''}`.trim()
}

/** Average time to close: hours under two days, otherwise days. */
export function formatClosureTime(hours: number | null): string {
  if (hours == null) return '—'
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`
  return `${Math.round((hours / 24) * 10) / 10} days`
}

export function severityLabel(s: IncidentSeverity): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

/** Monday first, the usual UK week. The API returns Sunday first. */
export function weekRowsMondayFirst(rows: IncidentAnalytics['byDayOfWeek']): IncidentAnalytics['byDayOfWeek'] {
  return [...rows.slice(1), ...rows.slice(0, 1)]
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value)
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  // BOM so Excel reads UTF-8 (en dashes, accents) correctly.
  return `\uFEFF${rows.map((r) => r.map(csvEscape).join(',')).join('\r\n')}\r\n`
}

export type AnalyticsExportContext = {
  generatedAt: string
  period: string
  filters: string
}

export function buildAnalyticsSummaryCsv(data: IncidentAnalytics, ctx: AnalyticsExportContext): string {
  const t = data.totals
  const rows: Array<Array<string | number | null>> = [
    ['Incident analytics'],
    ['Generated', ctx.generatedAt],
    ['Period', ctx.period],
    ['Filters', ctx.filters],
    [],
    ['Section', 'Item', 'Count'],
    ['Totals', 'Total', t.total],
    ['Totals', 'Open', t.open],
    ['Totals', 'Closed', t.closed],
    ['Totals', 'High / Critical (all, open and closed)', t.highCritical],
    ['Totals', 'Overdue actions', t.overdueActions],
    ['Totals', 'Falls', t.falls],
    ['Totals', 'Medication', t.medication],
    ['Totals', 'Near misses', t.nearMiss],
    ['Totals', 'Involving staff', t.involvingEmployees],
    ['Totals', 'Repeat service users (2+ incidents)', t.repeatServiceUsers],
    ['Totals', 'Average time to close', formatClosureTime(t.averageClosureHours)],
    ...data.byCategory.map((c) => ['By category', c.label, c.count]),
    ...SEVERITIES.map((s) => ['By severity', severityLabel(s), data.bySeverity[s] ?? 0]),
    ...(Object.entries(data.byStatus) as [IncidentStatus, number][]).map(([s, n]) => [
      'By status',
      INCIDENT_STATUS_LABELS[s] ?? s,
      n,
    ]),
    ...data.byLocation.map((l) => ['By branch', l.name, l.count]),
    ...data.bySubtype.map((s) => ['Top subtypes', s.label, s.count]),
    ...data.byTimeOfDay.map((b) => ['Time of day (UK time)', b.label, b.count]),
    ...weekRowsMondayFirst(data.byDayOfWeek).map((d) => ['Day of week (UK time)', d.day, d.count]),
    ...data.byServiceUser.map((s) => ['Service users with most incidents', s.name, s.count]),
    ['Reported from', 'Carer app', data.bySource?.carerApp ?? 0],
    ['Reported from', 'Recorded by the office', data.bySource?.office ?? 0],
    ...(data.byReporter ?? []).map((r) => ['Reported by (carer)', r.name, r.count]),
    ...data.injuryTypes.map((i) => ['Injury types', i.type, i.count]),
    ...data.monthlyTrend.map((m) => ['Monthly trend', formatTrendMonth(m.month), m.count]),
  ]
  return toCsv(rows)
}

export function buildIncidentListCsv(
  items: IncidentListItem[],
  formatDateTime: (iso: string) => string,
): string {
  return toCsv([
    [
      'Reference',
      'When it happened (UK time)',
      'Category',
      'Subtype',
      'Severity',
      'Status',
      'Service user',
      'Branch',
      'Reported by',
      'Recorded by',
      'Visit',
    ],
    ...items.map((i) => [
      i.referenceNumber,
      formatDateTime(i.occurredAt),
      i.category.label,
      i.subtype?.label ?? '',
      i.severityLabel,
      i.statusLabel,
      i.serviceUserName ?? '',
      i.locationName ?? '',
      i.reportedBy?.name ?? '',
      i.reportedBy?.source === 'CARER_APP' ? 'Carer app' : (i.reportedBy?.recordedByName ?? ''),
      i.visitRef ?? '',
    ]),
  ])
}

export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
