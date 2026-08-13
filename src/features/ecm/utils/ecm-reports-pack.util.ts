import type { EcmDailyOpsReport, EcmDailyOpsReportRow } from '@/features/ecm/api/ecm.api'
import {
  buildDurationComplianceBands,
  buildEcmMethodBreakdown,
  buildPunctualityComplianceBands,
  pct,
} from '@/features/ecm/utils/ecm-compliance-overview.util'
import { getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'

export type ReportClassificationTableRow = {
  key: string
  label: string
  count: number
  denominator: number
  percent: number
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

function csvLine(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvEscape).join(',')
}

export function resolveExceptionRegister(report: EcmDailyOpsReport): EcmDailyOpsReportRow[] {
  if (report.exceptionRegister?.length) return report.exceptionRegister
  return report.rows.filter((row) => {
    if (row.inExceptionRegister) return true
    if (row.exceptionReasons?.length) return true
    const arrival = String(row.arrivalClassification ?? '').toUpperCase()
    const duration = String(row.durationClassification ?? '').toUpperCase()
    const missed = String(row.missedClassification ?? '').toUpperCase()
    if (
      arrival === 'EARLY_ARRIVAL' ||
      arrival === 'LATE_ARRIVAL' ||
      arrival === 'VERY_LATE_ARRIVAL'
    ) {
      return true
    }
    if (duration === 'SHORT_VISIT' || duration === 'LONG_VISIT' || duration === 'EXCESSIVE_OVERRUN') {
      return true
    }
    if (missed && missed !== 'NONE') return true
    return (row.operationalExceptionCodes ?? []).length > 0
  })
}

export function carerLabel(row: EcmDailyOpsReportRow): string {
  if (row.carerNames?.length) return row.carerNames.join('; ')
  if (row.carers?.length) return row.carers.map((c) => c.name).join('; ')
  return ''
}

export function exceptionReasonsLabel(row: EcmDailyOpsReportRow): string {
  if (row.exceptionReasons?.length) return row.exceptionReasons.join('|')
  const codes = [...(row.operationalExceptionCodes ?? [])]
  const arrival = String(row.arrivalClassification ?? '').toUpperCase()
  const duration = String(row.durationClassification ?? '').toUpperCase()
  const missed = String(row.missedClassification ?? '').toUpperCase()
  if (arrival !== 'ON_TIME' && arrival !== 'NOT_ASSESSED' && arrival) codes.push(arrival)
  if (duration !== 'ON_TIME' && duration !== 'NOT_ASSESSED' && duration) codes.push(duration)
  if (missed && missed !== 'NONE') codes.push(missed)
  return [...new Set(codes)].join('|')
}

export function buildArrivalClassificationTable(
  report: EcmDailyOpsReport,
): ReportClassificationTableRow[] {
  if (report.classifications?.arrival) {
    const a = report.classifications.arrival
    const den = a.total
    return [
      { key: 'on_time', label: 'On time', count: a.onTime, denominator: den, percent: pct(a.onTime, den) },
      { key: 'early', label: 'Early', count: a.early, denominator: den, percent: pct(a.early, den) },
      { key: 'late', label: 'Late', count: a.late, denominator: den, percent: pct(a.late, den) },
      {
        key: 'very_late',
        label: 'Very late',
        count: a.veryLate,
        denominator: den,
        percent: pct(a.veryLate, den),
      },
      {
        key: 'not_assessed',
        label: 'Not assessed',
        count: a.notAssessed,
        denominator: den,
        percent: pct(a.notAssessed, den),
      },
    ].filter((r) => r.count > 0 || r.key !== 'not_assessed')
  }

  return buildPunctualityComplianceBands(report.rows).map((b) => ({
    key: b.key,
    label: b.label,
    count: b.count,
    denominator: report.kpis.totalVisits,
    percent: b.percent,
  }))
}

export function buildDurationClassificationTable(
  report: EcmDailyOpsReport,
): ReportClassificationTableRow[] {
  if (report.classifications?.duration) {
    const d = report.classifications.duration
    const den = d.total
    const longCombined = d.long + d.excessiveOverrun
    return [
      { key: 'on_time', label: 'On time', count: d.onTime, denominator: den, percent: pct(d.onTime, den) },
      { key: 'short', label: 'Short visit', count: d.short, denominator: den, percent: pct(d.short, den) },
      {
        key: 'long',
        label: 'Long / overrun',
        count: longCombined,
        denominator: den,
        percent: pct(longCombined, den),
      },
      {
        key: 'not_assessed',
        label: 'Not assessed',
        count: d.notAssessed,
        denominator: den,
        percent: pct(d.notAssessed, den),
      },
    ].filter((r) => r.count > 0 || r.key !== 'not_assessed')
  }

  return buildDurationComplianceBands(report.rows).map((b) => ({
    key: b.key,
    label: b.label,
    count: b.count,
    denominator: report.kpis.totalVisits,
    percent: b.percent,
  }))
}

export function buildReportSummaryCsv(report: EcmDailyOpsReport): string {
  const k = report.kpis
  const p = k.punctuality
  const exclusions = p.exclusions ?? {}
  const method = buildEcmMethodBreakdown(k)
  const em = k.electronicMonitoring
  const lines = [
    csvLine(['field', 'value']),
    csvLine(['reportType', report.reportType]),
    csvLine(['dateFrom', report.dateFrom ?? report.date]),
    csvLine(['dateTo', report.dateTo ?? report.date]),
    csvLine(['operationalTimezone', report.operationalTimezone ?? getSyncedOperationalTimeZone()]),
    csvLine(['thresholdVersion', report.thresholdVersion]),
    csvLine(['generatedAt', report.refreshedAt]),
    csvLine(['totalVisits', k.totalVisits]),
    csvLine(['punctualityNumerator', p.numerator]),
    csvLine(['punctualityDenominator', p.denominator]),
    csvLine(['punctualityRatePct', p.rate ?? '']),
    csvLine(['exclusionsConfirmedMissed', exclusions.confirmedMissed ?? '']),
    csvLine(['exclusionsFalseEcmAlerts', exclusions.falseEcmAlerts ?? '']),
    csvLine(['exclusionsDisputed', exclusions.disputed ?? '']),
    csvLine(['electronicNumerator', em?.numerator ?? method.electronic]),
    csvLine(['electronicDenominator', em?.denominator ?? method.total]),
    csvLine(['electronicRatePct', em?.rate ?? method.electronicPercent]),
    csvLine(['manualAttendance', k.manualAttendance]),
    csvLine(['lateArrivals', k.lateArrivals]),
    csvLine(['earlyArrivals', k.earlyArrivals ?? '']),
    csvLine(['shortVisits', k.shortVisits ?? '']),
    csvLine(['longVisits', k.longVisits ?? '']),
    csvLine(['potentialMissed', k.potentialMissed]),
    csvLine(['confirmedMissed', k.confirmedMissed]),
    csvLine(['geofenceBreaches', k.geofenceBreaches ?? '']),
    csvLine(['verifiedConfidence', k.verifiedConfidence]),
    csvLine(['exceptionRegisterCount', k.exceptionRegisterCount ?? '']),
  ]

  if (report.integrity) {
    lines.push(
      csvLine(['integrityVerified', report.integrity.verified]),
      csvLine(['integrityPartiallyVerified', report.integrity.partiallyVerified ?? '']),
      csvLine(['integrityManuallyVerified', report.integrity.manuallyVerified]),
      csvLine(['integrityUnverified', report.integrity.unverified]),
      csvLine(['integrityDisputed', report.integrity.disputed]),
      csvLine(['integrityRejected', report.integrity.rejected]),
    )
  }

  for (const row of buildArrivalClassificationTable(report)) {
    lines.push(csvLine([`arrival_${row.key}`, `${row.count}/${row.denominator}`]))
  }
  for (const row of buildDurationClassificationTable(report)) {
    lines.push(csvLine([`duration_${row.key}`, `${row.count}/${row.denominator}`]))
  }

  return `${lines.join('\n')}\n`
}

export function buildExceptionRegisterCsv(rows: EcmDailyOpsReportRow[]): string {
  const header = csvLine([
    'localVisitDate',
    'plannedStartDateTime',
    'serviceUserName',
    'carers',
    'jobName',
    'lifecycleStatus',
    'arrivalClassification',
    'durationClassification',
    'missedClassification',
    'confidence',
    'criticality',
    'startVarianceMinutes',
    'durationVarianceMinutes',
    'exceptionReasons',
    'operationalExceptionCodes',
    'scheduledJobId',
  ])
  const body = rows.map((row) =>
    csvLine([
      row.localVisitDate ?? '',
      row.plannedStartDateTime ?? '',
      row.serviceUserName,
      carerLabel(row),
      row.jobName,
      row.lifecycleStatus,
      row.arrivalClassification,
      row.durationClassification,
      row.missedClassification,
      row.confidence,
      row.criticality,
      row.startVarianceMinutes,
      row.durationVarianceMinutes,
      exceptionReasonsLabel(row),
      (row.operationalExceptionCodes ?? []).join('|'),
      row.scheduledJobId,
    ]),
  )
  return `${[header, ...body].join('\n')}\n`
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatGeneratedAt(iso: string, timeZone = getSyncedOperationalTimeZone()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(d)
}

export function formatPlannedStart(
  iso: string | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d)
}
