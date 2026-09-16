import type { CSSProperties } from 'react'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import { marChartRowIsPatch } from '@/features/service-users/medication/medication-body-map-eligibility'
import type { MarCalendarFilters } from '@/features/service-users/medication/mar-calendar-filters'
import { cellMatchesCellFilters } from '@/features/service-users/medication/mar-calendar-filters'
import {
  isHmLabel,
  normalizeDueTimeHm,
  roundNameFromDueTime,
} from '@/features/service-users/medication/medication-time-slots'
import {
  minutesInOperationalTimeZone,
  operationalTodayIso,
} from '@/shared/lib/operational-day.util'

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

const ROUND_EMOJI: Record<string, string> = {
  Morning: '🌅',
  Midday: '☀',
  Afternoon: '☀',
  Evening: '🌆',
  Night: '🌙',
}

export type MarMedicationGroup = {
  medicationId: string
  medicationName: string
  packName: string | null
  dose: string | null
  strength: string | null
  routeName: string | null
  scheduleType: MarChartMedicationRow['scheduleType']
  type: string | null
  frequency: string | null
  slots: MarChartMedicationRow[]
}

export type TimeSlotDisplay = {
  label: string
  time: string | null
  isPrn: boolean
}

export function dayOfWeek(month: string, day: number): number {
  const [yStr, mStr] = month.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 0
  return new Date(y, m - 1, day).getDay()
}

export function dayOfWeekLetter(month: string, day: number): string {
  return DOW_LETTERS[dayOfWeek(month, day)] ?? ''
}

export function groupMarRows(rows: MarChartMedicationRow[]): MarMedicationGroup[] {
  const order: string[] = []
  const map = new Map<string, MarMedicationGroup>()
  for (const row of rows) {
    let group = map.get(row.medicationId)
    if (!group) {
      group = {
        medicationId: row.medicationId,
        medicationName: row.medicationName,
        packName: row.packName,
        dose: row.dose,
        strength: row.strength,
        routeName: row.routeName,
        scheduleType: row.scheduleType,
        type: row.type,
        frequency: row.frequency,
        slots: [],
      }
      map.set(row.medicationId, group)
      order.push(row.medicationId)
    }
    group.slots.push(row)
  }
  return order.map(id => map.get(id)!)
}

export function scheduleChipClass(scheduleType: MarChartMedicationRow['scheduleType']): string {
  switch (scheduleType) {
    case 'weekly':
      return 'schedule-chip schedule-chip-weekly'
    case 'monthly':
      return 'schedule-chip schedule-chip-monthly'
    case 'interval':
      return 'schedule-chip schedule-chip-interval'
    case 'prn':
      return 'schedule-chip schedule-chip-prn'
    case 'specific':
      return 'schedule-chip schedule-chip-specific'
    default:
      return 'schedule-chip schedule-chip-daily'
  }
}

export function scheduleChipLabel(scheduleType: MarChartMedicationRow['scheduleType']): string {
  switch (scheduleType) {
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'interval':
      return 'Every N days'
    case 'prn':
      return 'PRN'
    case 'specific':
      return 'Specific days'
    default:
      return 'Daily'
  }
}

export function countFilteredScheduleRows(groups: MarMedicationGroup[]): number {
  return groups.reduce((sum, g) => sum + g.slots.length, 0)
}

export function medicationMetaLine(group: MarMedicationGroup): string | null {
  const parts = [group.strength, group.dose, group.routeName, group.type, group.frequency].filter(
    Boolean,
  ) as string[]
  return parts.length > 0 ? parts.join(' · ') : null
}

export type MedicationDetailField = { label: string; value: string }

/** Labelled lines for MAR export / print (Medication:, Dose:, etc.). */
export function medicationDetailFields(group: MarMedicationGroup): MedicationDetailField[] {
  const fields: MedicationDetailField[] = [
    { label: 'Medication', value: group.medicationName },
  ]
  if (group.strength) fields.push({ label: 'Strength', value: group.strength })
  if (group.dose) fields.push({ label: 'Dose', value: group.dose })
  if (group.routeName) fields.push({ label: 'Route', value: group.routeName })
  if (group.type) fields.push({ label: 'Type', value: group.type })
  if (group.frequency) fields.push({ label: 'Frequency', value: group.frequency })
  if (group.packName) fields.push({ label: 'Pack', value: group.packName })
  return fields
}

function resolveRoundName(row: MarChartMedicationRow): string {
  const slot = row.timeSlot?.trim() ?? ''
  if (slot && slot !== 'Administration' && slot !== 'PRN' && !isHmLabel(slot)) {
    return slot
  }
  const fromTime = roundNameFromDueTime(row.dueTime)
  if (fromTime) return fromTime
  return slot || 'Administration'
}

export function formatTimeSlotDisplay(row: MarChartMedicationRow): TimeSlotDisplay {
  if (row.scheduleType === 'prn') {
    return { label: 'PRN', time: 'When needed', isPrn: true }
  }
  const roundName = resolveRoundName(row)
  const emoji = ROUND_EMOJI[roundName] ?? ''
  const label = emoji ? `${emoji} ${roundName}` : roundName
  const time = normalizeDueTimeHm(row.dueTime)
  return { label, time, isPrn: false }
}

/** Subline under round label — due time + administration window (no duplicate HH:mm label). */
export function formatTimeSlotSubline(row: MarChartMedicationRow): string | null {
  const slot = formatTimeSlotDisplay(row)
  if (slot.isPrn) return slot.time
  const window = formatRoundWindow(row)
  const parts: string[] = []
  if (slot.time) parts.push(`Due ${slot.time}`)
  if (window) parts.push(`Window ${window}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function operationalMinutesNow(now: Date): number {
  return minutesInOperationalTimeZone(now)
}

/** True when ops-TZ wall clock is past the round administration window end and dose is still due. */
export function isMarSlotOverdue(row: MarChartMedicationRow, now: Date = new Date()): boolean {
  const end = normalizeDueTimeHm(row.roundWindowEnd)
  if (!end) return false
  return operationalMinutesNow(now) > hmToMinutes(end)
}

export function formatRoundWindow(row: MarChartMedicationRow): string | null {
  if (row.roundWindowStart && row.roundWindowEnd) {
    return `${row.roundWindowStart}–${row.roundWindowEnd}`
  }
  return null
}

/** Lines shown in MAR export time-slot cell (label + optional subline). */
export function exportSlotContentLineCount(row: MarChartMedicationRow): number {
  const slot = formatTimeSlotDisplay(row)
  const subline = [slot.time, formatRoundWindow(row)].filter(Boolean).join(' · ')
  return subline ? 2 : 1
}

export function maxExportSlotContentLines(slots: MarChartMedicationRow[]): number {
  if (!slots.length) return 1
  return Math.max(1, ...slots.map(exportSlotContentLineCount))
}

export function recordContextTitle(row: MarChartMedicationRow): string {
  const slotName = row.scheduleType === 'prn' ? 'PRN' : row.timeSlot
  return `${row.medicationName} · ${slotName}`
}

export function recordContextDetail(
  row: MarChartMedicationRow,
  dateLabel: string,
  extra?: string,
): string {
  const parts = [row.dose, row.routeName].filter(Boolean) as string[]
  const doseRoute = parts.length > 0 ? parts.join(' · ') : null
  const slot = formatTimeSlotDisplay(row)
  const due = slot.time && slot.time !== 'When needed' ? `Due ${slot.time}` : null
  return [doseRoute, due, dateLabel, extra].filter(Boolean).join(' · ')
}

export function cellDisplayLabel(cell: MarChartCell): string {
  if (cell.cellState === 'due') return 'Due'
  if (cell.cellState === 'na') return 'N/A'
  if (cell.cellState === 'prn') return '+'
  return cell.statusCode ?? '—'
}

export function marCellInnerClass(cell: MarChartCell): string {
  if (cell.cellState === 'due') return 'cell-inner cell-due'
  if (cell.cellState === 'na') return 'cell-inner cell-not-scheduled'
  if (cell.cellState === 'prn') return 'cell-inner cell-prn-log'
  const parts = ['cell-inner']
  if (cell.statusCode === 'PCI') parts.push('cell-code-pci-label')
  if (cell.requiresReview) parts.push('cell-review')
  return parts.join(' ')
}

/** Same fills as legend — colours come from MedicationStatusCode via chart API. */
export function marCellInnerStyle(cell: MarChartCell): CSSProperties | undefined {
  if (cell.cellState !== 'recorded' || !cell.color) return undefined
  return {
    backgroundColor: cell.color,
    color: cell.textColor ?? '#FFFFFF',
  }
}

export function groupMatchesFilters(group: MarMedicationGroup, filters: MarCalendarFilters): boolean {
  if (filters.scheduleType !== 'all' && group.scheduleType !== filters.scheduleType) return false
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    const hay = `${group.medicationName} ${group.packName ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (filters.statusCodes.size === 0 && filters.cellTypes.size === 0) return true
  return group.slots.some(row => row.days.some(cell => cellMatchesCellFilters(cell, filters)))
}

export function cellShouldDim(cell: MarChartCell, filters: MarCalendarFilters): boolean {
  if (filters.statusCodes.size === 0 && filters.cellTypes.size === 0) return false
  return !cellMatchesCellFilters(cell, filters)
}

export type MarDueTodaySlot = {
  medicationId: string
  scheduleId: string | null
  medicationName: string
  timeSlotLabel: string
  dueTime: string | null
  roundWindow: string | null
  overdue: boolean
  /** Patch medicines use body map for site rotation (§24.3). */
  isPatch: boolean
}

/** Column day for “today” — prefers chart API summary date (ops-TZ aligned with backend). */
export function chartTodayColumnDay(
  chart: { summary?: { date: string }; dayDates?: string[] } | undefined,
  month: string,
): number | null {
  const summaryDate = chart?.summary?.date
  if (summaryDate && chart?.dayDates?.length) {
    const idx = chart.dayDates.indexOf(summaryDate)
    if (idx >= 0) return idx + 1
  }
  const local = operationalTodayIso()
  if (!local.startsWith(month)) return null
  return Number(local.slice(8, 10))
}

export function collectDueTodaySlots(
  medications: MarChartMedicationRow[],
  todayDate: string,
  now: Date = new Date(),
): MarDueTodaySlot[] {
  const items: MarDueTodaySlot[] = []
  for (const row of medications) {
    const cell = row.days.find(d => d.date === todayDate)
    if (cell?.cellState !== 'due') continue
    const slot = formatTimeSlotDisplay(row)
    items.push({
      medicationId: row.medicationId,
      scheduleId: row.scheduleId,
      medicationName: row.medicationName,
      timeSlotLabel: slot.label,
      dueTime: normalizeDueTimeHm(row.dueTime),
      roundWindow: formatRoundWindow(row),
      overdue: isMarSlotOverdue(row, now),
      isPatch: marChartRowIsPatch(row),
    })
  }
  return items.sort((a, b) => {
    const ta = a.dueTime ?? '99:99'
    const tb = b.dueTime ?? '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return a.medicationName.localeCompare(b.medicationName)
  })
}

export function buildFilterSummary(filters: MarCalendarFilters): string {
  const parts: string[] = []
  if (filters.search.trim()) {
    parts.push(`search “${filters.search.trim()}”`)
  }
  if (filters.scheduleType !== 'all') {
    parts.push(filters.scheduleType)
  }
  if (filters.cellTypes.size > 0) {
    parts.push(`${filters.cellTypes.size} cell type(s)`)
  }
  if (filters.statusCodes.size > 0) {
    parts.push(`${filters.statusCodes.size} status code(s)`)
  }
  if (parts.length === 0) return 'Showing all medications · all status codes'
  return `Filtered · ${parts.join(' · ')}`
}
