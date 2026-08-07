import type { EcmDailyOpsReport } from '@/features/ecm/api/ecm.api'

export type ComplianceBandRow = {
  key: string
  label: string
  count: number
  percent: number
  color: string
  textClass: string
}

export type EcmMethodBreakdown = {
  electronic: number
  manual: number
  total: number
  electronicPercent: number
  manualPercent: number
}

export function pct(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 10_000) / 100
}

export function formatPct(value: number): string {
  return `${value.toFixed(2)}%`
}

export function buildEcmMethodBreakdown(kpis: EcmDailyOpsReport['kpis']): EcmMethodBreakdown {
  const total = kpis.totalVisits ?? 0
  const manual = kpis.manualAttendance ?? 0
  const electronic =
    kpis.electronicAttendance != null ? kpis.electronicAttendance : Math.max(0, total - manual)
  return {
    electronic,
    manual,
    total,
    electronicPercent: pct(electronic, total),
    manualPercent: pct(manual, total),
  }
}

/**
 * Coarse duration bands from durationClassification (same enum SSOT as
 * graph-dashboard durationVariance). Prefer Graphs for full distribution;
 * this helper remains for Reports / tests.
 */
export function buildDurationComplianceBands(
  rows: EcmDailyOpsReport['rows'],
): ComplianceBandRow[] {
  let compliant = 0
  let overstay = 0
  let understay = 0
  let other = 0

  for (const row of rows) {
    const code = String(row.durationClassification ?? '').toUpperCase()
    if (code === 'ON_TIME') compliant += 1
    else if (code === 'LONG_VISIT' || code === 'EXCESSIVE_OVERRUN') overstay += 1
    else if (code === 'SHORT_VISIT') understay += 1
    else other += 1
  }

  const total = compliant + overstay + understay + other

  const bands: ComplianceBandRow[] = [
    {
      key: 'on_time',
      label: 'On time',
      count: compliant,
      percent: pct(compliant, total),
      color: '#16a34a',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'short',
      label: 'Short visit',
      count: understay,
      percent: pct(understay, total),
      color: '#dc2626',
      textClass: 'text-red-700 dark:text-red-300',
    },
    {
      key: 'long',
      label: 'Long / overrun',
      count: overstay,
      percent: pct(overstay, total),
      color: '#ea580c',
      textClass: 'text-orange-700 dark:text-orange-300',
    },
  ]

  if (other > 0) {
    bands.push({
      key: 'not_assessed',
      label: 'Not assessed',
      count: other,
      percent: pct(other, total || 1),
      color: '#94a3b8',
      textClass: 'text-muted-foreground',
    })
  }

  return bands
}

/**
 * Punctuality bands from arrivalClassification (same enum SSOT as
 * graph-dashboard arrivalPunctuality). Late and very-late are split to match Graphs.
 */
export function buildPunctualityComplianceBands(
  rows: EcmDailyOpsReport['rows'],
): ComplianceBandRow[] {
  let onTime = 0
  let early = 0
  let late = 0
  let veryLate = 0
  let notAssessed = 0

  for (const row of rows) {
    const code = String(row.arrivalClassification ?? '').toUpperCase()
    if (code === 'ON_TIME') onTime += 1
    else if (code === 'EARLY_ARRIVAL') early += 1
    else if (code === 'LATE_ARRIVAL') late += 1
    else if (code === 'VERY_LATE_ARRIVAL') veryLate += 1
    else notAssessed += 1
  }

  const total = onTime + early + late + veryLate + notAssessed

  const bands: ComplianceBandRow[] = [
    {
      key: 'on_time',
      label: 'On Time',
      count: onTime,
      percent: pct(onTime, total),
      color: '#16a34a',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'early',
      label: 'Early',
      count: early,
      percent: pct(early, total),
      color: '#0ea5e9',
      textClass: 'text-sky-700 dark:text-sky-300',
    },
    {
      key: 'late',
      label: 'Late',
      count: late,
      percent: pct(late, total),
      color: '#f97316',
      textClass: 'text-orange-700 dark:text-orange-300',
    },
    {
      key: 'very_late',
      label: 'Very late',
      count: veryLate,
      percent: pct(veryLate, total),
      color: '#dc2626',
      textClass: 'text-red-700 dark:text-red-300',
    },
  ]

  if (notAssessed > 0) {
    bands.push({
      key: 'not_assessed',
      label: 'Not assessed',
      count: notAssessed,
      percent: pct(notAssessed, total || 1),
      color: '#94a3b8',
      textClass: 'text-muted-foreground',
    })
  }

  return bands
}

export function countGeofenceBreaches(report: EcmDailyOpsReport): number {
  if (typeof report.kpis.geofenceBreaches === 'number') return report.kpis.geofenceBreaches
  return report.rows.filter((r) =>
    (r.operationalExceptionCodes ?? []).includes('OUTSIDE_GEOFENCE'),
  ).length
}

export function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function lastNDatesInclusive(endIso: string, n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i -= 1) out.push(shiftIsoDate(endIso, -i))
  return out
}

export function formatTrendDayLabel(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(dt)
}
