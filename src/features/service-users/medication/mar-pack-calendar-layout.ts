import type { CSSProperties } from 'react'
import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import { ADMINISTRATION_ROUNDS } from '@/features/service-users/medication/blister-pack-wizard.constants'
import {
  formatTimeSlotDisplay,
  groupMarRows,
  marCellInnerStyle,
  type MarMedicationGroup,
} from '@/features/service-users/medication/mar-calendar-layout'
import { normalizeDueTimeHm } from '@/features/service-users/medication/medication-time-slots'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

export type MarCalendarPackBundle = {
  packName: string
  rows: MarChartMedicationRow[]
  medicationGroups: MarMedicationGroup[]
}

export function splitPackAndStandaloneRows(rows: MarChartMedicationRow[]): {
  packBundles: MarCalendarPackBundle[]
  standaloneRows: MarChartMedicationRow[]
} {
  const packMap = new Map<string, MarChartMedicationRow[]>()
  const standaloneRows: MarChartMedicationRow[] = []

  for (const row of rows) {
    if (row.packName) {
      const list = packMap.get(row.packName) ?? []
      list.push(row)
      packMap.set(row.packName, list)
    } else {
      standaloneRows.push(row)
    }
  }

  const packBundles: MarCalendarPackBundle[] = [...packMap.entries()].map(([packName, packRows]) => ({
    packName,
    rows: packRows,
    medicationGroups: groupMarRows(packRows),
  }))

  packBundles.sort((a, b) => a.packName.localeCompare(b.packName))
  return { packBundles, standaloneRows }
}

export type MarPackCompartmentSlice = {
  dueTime: string
  roundName: string
  emoji: string
  label: string
  rows: MarChartMedicationRow[]
}

const PACK_ROW_UNSCHEDULED_KEY = '__unscheduled__'

function roundLabelToTime(label: string): string | null {
  const match = ADMINISTRATION_ROUNDS.find(
    r => r.name.toLowerCase() === label.toLowerCase() || r.code.toLowerCase() === label.toLowerCase(),
  )
  return match?.time ?? null
}

/** Resolve HH:mm for blister-pack compartment grouping from MAR chart rows. */
export function resolvePackRowDueTime(row: {
  dueTime?: string | null
  timeSlot?: string | null
}): string | null {
  const fromDue = normalizeDueTimeHm(row.dueTime)
  if (fromDue) return fromDue

  const slot = row.timeSlot?.trim()
  if (!slot || slot === 'Administration' || slot === 'PRN') return null

  const fromSlotHm = normalizeDueTimeHm(slot)
  if (fromSlotHm) return fromSlotHm

  return roundLabelToTime(slot)
}

function roundForDueTime(dueTime: string): { name: string; emoji: string } {
  if (dueTime === PACK_ROW_UNSCHEDULED_KEY) {
    return { name: 'Unscheduled', emoji: '⚠' }
  }
  const hm = normalizeDueTimeHm(dueTime)
  const match = ADMINISTRATION_ROUNDS.find(r => r.time === hm)
  if (match) return { name: match.name, emoji: match.emoji }
  const slot = formatTimeSlotDisplay({ dueTime, timeSlot: '', scheduleType: 'daily' } as MarChartMedicationRow)
  return { name: slot.label.replace(/^[^\s]+\s/, ''), emoji: '' }
}

export function buildPackCompartments(rows: MarChartMedicationRow[]): MarPackCompartmentSlice[] {
  const byTime = new Map<string, MarChartMedicationRow[]>()
  for (const row of rows) {
    const dueTime = resolvePackRowDueTime(row) ?? PACK_ROW_UNSCHEDULED_KEY
    const list = byTime.get(dueTime) ?? []
    list.push(row)
    byTime.set(dueTime, list)
  }

  const order = ADMINISTRATION_ROUNDS.map(r => r.time)
  const sortedTimes = [...byTime.keys()].sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return a.localeCompare(b)
  })

  return sortedTimes.map(dueTime => {
    const { name, emoji } = roundForDueTime(dueTime)
    const compartmentRows = (byTime.get(dueTime) ?? []).sort((a, b) =>
      a.medicationName.localeCompare(b.medicationName),
    )
    return {
      dueTime,
      roundName: name,
      emoji,
      label: `${emoji ? `${emoji} ` : ''}${name} Compartment`.trim(),
      rows: compartmentRows,
    }
  })
}

export type CompartmentDayCounts = {
  /** Pack member rows in this compartment (includes members not scheduled this day). */
  members: number
  /** Medicines with an administration cell this day (excludes N/A). */
  scheduled: number
  G: number
  R: number
  N: number
  U: number
  due: number
  recorded: number
}

export function cellCode(cell: MarChartCell | undefined): string | null {
  if (!cell) return null
  if (cell.cellState === 'due') return 'Due'
  if (cell.cellState === 'recorded') return cell.statusCode ?? 'G'
  if (cell.cellState === 'na') return 'NA'
  return null
}

/** Codes treated as medicine given for compartment round completion. */
const COMPARTMENT_GIVEN_CODES = new Set(['G', 'F', 'I', 'S', 'T'])

export function compartmentMedicineContentsLine(
  rows: Array<{ medicationName: string }>,
): string {
  return [...new Set(rows.map(r => r.medicationName))]
    .sort((a, b) => a.localeCompare(b))
    .join(' · ')
}

function findCompartmentUniformCell(
  rows: MarChartMedicationRow[],
  day: number,
  counts: CompartmentDayCounts,
): MarChartCell | null {
  const tryCode = (code: string): MarChartCell | null => {
    for (const row of rows) {
      const cell = row.days.find(c => c.day === day)
      if (cellCode(cell) === code && cell) return cell
    }
    return null
  }

  if (counts.G === counts.scheduled) {
    const cell = tryCode('G')
    if (cell) return cell
  }
  if (counts.R === counts.scheduled) {
    const cell = tryCode('R')
    if (cell) return cell
  }
  if (counts.N === counts.scheduled) {
    const cell = tryCode('N')
    if (cell) return cell
  }
  if (counts.U === counts.scheduled) {
    const cell = tryCode('U')
    if (cell) return cell
  }

  if (counts.recorded === counts.scheduled && counts.due === 0) {
    let allGiven = true
    for (const row of rows) {
      const code = cellCode(row.days.find(c => c.day === day))
      if (!code || code === 'NA') continue
      if (!COMPARTMENT_GIVEN_CODES.has(code)) {
        allGiven = false
        break
      }
    }
    if (allGiven) {
      const gCell = tryCode('G')
      if (gCell) return gCell
      for (const row of rows) {
        const cell = row.days.find(c => c.day === day)
        const code = cellCode(cell)
        if (cell && code && COMPARTMENT_GIVEN_CODES.has(code)) return cell
      }
    }
  }

  return null
}

export function summarizeCompartmentDay(
  rows: MarChartMedicationRow[],
  day: number,
): CompartmentDayCounts {
  const counts: CompartmentDayCounts = {
    members: rows.length,
    scheduled: 0,
    G: 0,
    R: 0,
    N: 0,
    U: 0,
    due: 0,
    recorded: 0,
  }
  for (const row of rows) {
    const code = cellCode(row.days.find(c => c.day === day))
    if (!code || code === 'NA') continue
    counts.scheduled++
    if (code === 'Due') counts.due++
    else {
      counts.recorded++
      if (code === 'G') counts.G++
      else if (code === 'R') counts.R++
      else if (code === 'N') counts.N++
      else if (code === 'U') counts.U++
    }
  }
  return counts
}

/**
 * PR (Partial Round) applies only to medicines scheduled this day.
 * N/A (not due that day) is ignored — e.g. 3/3 due medicines given with 2 N/A = Complete, not PR.
 * Aligns with MCA/MAR practice: partial when a scheduled dose was not fully given (still due, refused, missed, etc.).
 */
export function isCompartmentPartialRound(counts: CompartmentDayCounts): boolean {
  if (counts.scheduled === 0) return false
  if (counts.due === counts.scheduled) return false
  if (counts.due > 0) return true
  if (counts.R > 0 || counts.N > 0) return true
  if (counts.G === counts.scheduled && counts.due === 0) return false
  if (counts.recorded === counts.scheduled && counts.due === 0) return false
  return false
}

export type CompartmentHeadline = {
  text: string
  tone: 'open' | 'complete' | 'partial' | 'mixed-due'
  icon: string
}

export function compartmentCollapsedHeadline(counts: CompartmentDayCounts): CompartmentHeadline {
  if (counts.scheduled === 0) {
    return { text: 'Not scheduled', tone: 'complete', icon: '—' }
  }
  if (counts.due === counts.scheduled) {
    return { text: `${counts.scheduled} due`, tone: 'open', icon: '⏳' }
  }
  if (
    counts.recorded === counts.scheduled &&
    counts.due === 0 &&
    counts.R === 0 &&
    counts.N === 0 &&
    counts.U === 0
  ) {
    return { text: 'All given', tone: 'complete', icon: '✓' }
  }
  if (counts.G === counts.scheduled && counts.due === 0) {
    return { text: 'All given', tone: 'complete', icon: '✓' }
  }
  const parts: string[] = []
  if (counts.G) parts.push(`${counts.G} given`)
  if (counts.R) parts.push(`${counts.R} refused`)
  if (counts.N) parts.push(`${counts.N} missed`)
  if (counts.U) parts.push(`${counts.U} unavail`)
  if (counts.due) parts.push(`${counts.due} due`)
  const tone =
    counts.due > 0 && counts.recorded > 0
      ? 'mixed-due'
      : isCompartmentPartialRound(counts)
        ? 'partial'
        : 'complete'
  const icon =
    counts.due > 0 && counts.recorded > 0 ? '◐' : isCompartmentPartialRound(counts) ? '⚠' : '✓'
  return { text: parts.join(' · '), tone, icon }
}

export type CompartmentStatusPill = {
  label: string
  tone: CompartmentHeadline['tone']
  text: string
  icon: string
}

export function compartmentStatusPill(counts: CompartmentDayCounts): CompartmentStatusPill {
  const headline = compartmentCollapsedHeadline(counts)
  const isPartial = isCompartmentPartialRound(counts)
  const label =
    counts.due === counts.scheduled
      ? 'OPEN'
      : counts.recorded === counts.scheduled &&
          counts.due === 0 &&
          counts.R === 0 &&
          counts.N === 0 &&
          counts.U === 0
        ? 'Given'
        : counts.G === counts.scheduled && counts.due === 0
          ? 'Given'
          : isPartial
            ? 'PR'
            : 'Complete'
  return {
    label,
    tone: headline.tone,
    text: isPartial ? 'Partial round' : headline.text,
    icon: isPartial ? 'PR' : headline.icon,
  }
}

/** OPEN is implied by Due day cells — no pill on the compartment band. */
export function showCompartmentStatusPill(
  pill: CompartmentStatusPill | null | undefined,
): pill is CompartmentStatusPill {
  return pill != null && pill.label !== 'OPEN'
}

export type CompartmentAggregateCell =
  | { kind: 'empty' }
  | { kind: 'due' }
  | { kind: 'na' }
  | { kind: 'uniform'; code: string; cell: MarChartCell }
  | { kind: 'partial'; summary: string; tooltip: string; needsReview: boolean }

function partialSummaryText(codes: { code: string; name: string }[]): string {
  const g = codes.filter(c => c.code === 'G').length
  const r = codes.filter(c => c.code === 'R').length
  const n = codes.filter(c => c.code === 'N').length
  const u = codes.filter(c => c.code === 'U').length
  const c = codes.filter(c => c.code === 'C').length
  const due = codes.filter(c => c.code === 'Due').length
  const parts: string[] = []
  if (g) parts.push(`${g}G`)
  if (r) parts.push(`${r}R`)
  if (n) parts.push(`${n}N`)
  if (u) parts.push(`${u}U`)
  if (c) parts.push(`${c}C`)
  if (due) parts.push(`${due} due`)
  return parts.join(' · ') || 'Partial'
}

export function aggregateCompartmentDayCell(
  rows: MarChartMedicationRow[],
  day: number,
  todayDay: number | null,
): CompartmentAggregateCell {
  if (!rows.length) return { kind: 'empty' }

  const counts = summarizeCompartmentDay(rows, day)
  if (counts.scheduled === 0) return { kind: 'na' }

  const isFuture = todayDay != null && day > todayDay
  if (isFuture || counts.due === counts.scheduled) {
    return { kind: 'due' }
  }

  if (!isCompartmentPartialRound(counts)) {
    const uniformCell = findCompartmentUniformCell(rows, day, counts)
    if (uniformCell) {
      const code = cellCode(uniformCell) ?? 'G'
      return { kind: 'uniform', code, cell: uniformCell }
    }
  }

  const medStatuses = rows
    .map(row => {
      const cell = row.days.find(c => c.day === day)
      const code = cellCode(cell)
      if (!code || code === 'NA') return null
      return {
        code,
        name: row.medicationName,
        needsReview: Boolean(cell?.requiresReview),
      }
    })
    .filter(Boolean) as Array<{ code: string; name: string; needsReview: boolean }>

  const summary = partialSummaryText(medStatuses)
  const tooltip = [
    summary,
    '',
    ...medStatuses.map(m => `${m.name}: ${m.code === 'Due' ? 'Due' : m.code}`),
    '',
    'Expand for individual G/R/N per medicine',
  ].join('\n')
  const needsReview = medStatuses.some(s => s.needsReview) && day === todayDay

  return { kind: 'partial', summary, tooltip, needsReview }
}

export function packCompartmentMetaLine(compartments: MarPackCompartmentSlice[]): string {
  return compartments
    .map(c => `${c.rows.length} ${c.roundName.toLowerCase()}`)
    .join(' · ')
}

export function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const formatted = formatOrganisationDate(iso)
  return formatted === '—' ? null : formatted
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000))
}

export function compartmentKey(packName: string, dueTime: string): string {
  return `${packName}:${dueTime}`
}

export function packExportHeaderLabel(
  packName: string,
  rows: Array<{ medicationId: string }>,
): string {
  const medCount = new Set(rows.map(r => r.medicationId)).size
  const compartmentCount = buildPackCompartments(rows as MarChartMedicationRow[]).length
  return `Blister pack — ${packName} · ${medCount} medicine${medCount === 1 ? '' : 's'} · ${compartmentCount} compartment${compartmentCount === 1 ? '' : 's'}`
}

export function compartmentExportHeaderLabel(compartment: MarPackCompartmentSlice): string {
  const medCount = new Set(compartment.rows.map(r => r.medicationId)).size
  return `${compartment.label} · ${compartment.dueTime} · ${medCount} medicine${medCount === 1 ? '' : 's'}`
}

/** Display-only legend entry for collapsed compartment summaries. */
export const PARTIAL_ROUND_LEGEND = {
  code: 'PR',
  label: 'Partial Round — mixed statuses among scheduled medicines',
  color: '#ffedd5',
  textColor: '#c2410c',
} as const

export function chartHasPackMedications(rows: MarChartMedicationRow[]): boolean {
  return rows.some(r => Boolean(r.packName))
}

export function exportChartTodayDay(month: string): number | null {
  const now = new Date()
  const [yStr, mStr] = month.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!y || !m) return null
  if (now.getFullYear() !== y || now.getMonth() + 1 !== m) return null
  return now.getDate()
}

export function compartmentSummaryDisplayCode(aggregate: CompartmentAggregateCell): string {
  switch (aggregate.kind) {
    case 'empty':
      return ''
    case 'due':
      return 'Due'
    case 'na':
      return 'N/A'
    case 'uniform':
      if (aggregate.cell.cellState === 'due') return 'Due'
      if (aggregate.cell.cellState === 'na') return 'N/A'
      if (aggregate.cell.cellState === 'prn') return '+'
      return aggregate.cell.statusCode ?? aggregate.code
    case 'partial':
      return 'PR'
  }
}

/** Full-cell MAR styling for collapsed compartment day columns (matches export / individual rows). */
export function compartmentAggregateCellStyle(
  aggregate: CompartmentAggregateCell,
): CSSProperties | undefined {
  if (aggregate.kind === 'partial') {
    return {
      backgroundColor: '#ffedd5',
      color: '#c2410c',
      fontWeight: 800,
      ...(aggregate.needsReview ? { outline: '2px solid #f97316' } : {}),
    }
  }
  if (aggregate.kind === 'due') {
    return { backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: 700 }
  }
  if (aggregate.kind === 'na' || aggregate.kind === 'empty') {
    return { backgroundColor: '#f8fafc', color: '#94a3b8' }
  }
  if (aggregate.kind === 'uniform') {
    if (aggregate.cell.cellState === 'due') {
      return { backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: 700 }
    }
    if (aggregate.cell.cellState === 'na') {
      return { backgroundColor: '#f8fafc', color: '#94a3b8' }
    }
    if (aggregate.cell.cellState === 'prn') {
      return { backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }
    }
    return marCellInnerStyle(aggregate.cell)
  }
  return undefined
}
