import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'

export type MarCellTypeFilter = 'due' | 'na' | 'prn' | 'recorded'
export type MarScheduleFilter =
  | 'all'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'interval'
  | 'specific'
  | 'prn'

export type MarCalendarFilters = {
  statusCodes: Set<string>
  scheduleType: MarScheduleFilter
  cellTypes: Set<MarCellTypeFilter>
  search: string
}

export const DEFAULT_MAR_FILTERS: MarCalendarFilters = {
  statusCodes: new Set(),
  scheduleType: 'all',
  cellTypes: new Set(),
  search: '',
}

export function rowMatchesFilters(row: MarChartMedicationRow, filters: MarCalendarFilters): boolean {
  if (filters.scheduleType !== 'all' && row.scheduleType !== filters.scheduleType) return false
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    const hay = `${row.medicationName} ${row.packName ?? ''} ${row.timeSlot}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (filters.statusCodes.size > 0 || filters.cellTypes.size > 0) {
    const anyCellMatch = row.days.some(cell => cellMatchesCellFilters(cell, filters))
    if (!anyCellMatch) return false
  }
  return true
}

export function cellMatchesCellFilters(cell: MarChartCell, filters: MarCalendarFilters): boolean {
  if (filters.cellTypes.size > 0 && !filters.cellTypes.has(cell.cellState)) return false
  if (filters.statusCodes.size > 0) {
    if (cell.cellState === 'recorded' && cell.statusCode) {
      if (!filters.statusCodes.has(cell.statusCode)) return false
    } else if (cell.cellState === 'due' && !filters.statusCodes.has('Due')) {
      return false
    } else if (cell.cellState === 'prn' && !filters.statusCodes.has('PRN')) {
      return false
    } else if (cell.cellState === 'na') {
      return false
    }
  }
  return true
}

export function getWeekDayRange(
  lastDay: number,
  month: string,
  anchorDay: number,
): { start: number; end: number; days: number[] } {
  const half = 3
  let start = Math.max(1, anchorDay - half)
  let end = Math.min(lastDay, start + 6)
  start = Math.max(1, end - 6)
  const days: number[] = []
  for (let d = start; d <= end; d++) days.push(d)
  return { start, end, days }
}

export function todayDayInMonth(month: string): number | null {
  const today = new Date().toISOString().slice(0, 10)
  if (!today.startsWith(month)) return null
  return Number(today.slice(8, 10))
}
