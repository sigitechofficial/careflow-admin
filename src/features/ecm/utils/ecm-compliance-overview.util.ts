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

  const assessed = compliant + overstay + understay
  const total = assessed > 0 ? assessed : compliant + overstay + understay + other

  const bands: ComplianceBandRow[] = [
    {
      key: 'compliant',
      label: 'Compliant',
      count: compliant,
      percent: pct(compliant, total),
      color: '#16a34a',
      textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'overstay',
      label: 'Overstay',
      count: overstay,
      percent: pct(overstay, total),
      color: '#ea580c',
      textClass: 'text-orange-700 dark:text-orange-300',
    },
    {
      key: 'understay',
      label: 'Understay',
      count: understay,
      percent: pct(understay, total),
      color: '#dc2626',
      textClass: 'text-red-700 dark:text-red-300',
    },
  ]

  if (other > 0 && assessed === 0) {
    bands.push({
      key: 'not-assessed',
      label: 'Not assessed',
      count: other,
      percent: pct(other, rows.length || 1),
      color: '#94a3b8',
      textClass: 'text-muted-foreground',
    })
  }

  return bands
}

export function buildPunctualityComplianceBands(
  rows: EcmDailyOpsReport['rows'],
): ComplianceBandRow[] {
  let onTime = 0
  let early = 0
  let late = 0
  let other = 0

  for (const row of rows) {
    const code = String(row.arrivalClassification ?? '').toUpperCase()
    if (code === 'ON_TIME') onTime += 1
    else if (code === 'EARLY_ARRIVAL') early += 1
    else if (code === 'LATE_ARRIVAL' || code === 'VERY_LATE_ARRIVAL') late += 1
    else other += 1
  }

  const assessed = onTime + early + late
  const total = assessed > 0 ? assessed : onTime + early + late + other

  const bands: ComplianceBandRow[] = [
    {
      key: 'on-time',
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
      color: '#ea580c',
      textClass: 'text-orange-700 dark:text-orange-300',
    },
    {
      key: 'late',
      label: 'Late',
      count: late,
      percent: pct(late, total),
      color: '#dc2626',
      textClass: 'text-red-700 dark:text-red-300',
    },
  ]

  if (other > 0 && assessed === 0) {
    bands.push({
      key: 'not-assessed',
      label: 'Not assessed',
      count: other,
      percent: pct(other, rows.length || 1),
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
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function lastNDatesInclusive(endIso: string, n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i -= 1) out.push(shiftIsoDate(endIso, -i))
  return out
}

export function formatTrendDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(dt)
}
