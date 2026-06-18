import type { MarChartCell, MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'

export type VisitMarSlot = {
  row: MarChartMedicationRow
  cell: MarChartCell
}

const ADMINISTRABLE: MarChartCell['cellState'][] = ['due', 'recorded', 'prn']

export function normalizeVisitDate(value: string): string {
  return value.trim().slice(0, 10)
}

export function visitDateChartMonth(visitDate: string): string {
  return normalizeVisitDate(visitDate).slice(0, 7)
}

export function chartCellForVisitDate(
  row: MarChartMedicationRow | undefined,
  visitDate: string,
): MarChartCell | undefined {
  if (!row) return undefined
  const target = normalizeVisitDate(visitDate)
  return row.days.find(d => normalizeVisitDate(d.date) === target)
}

export function collectVisitDateMarSlots(
  medications: MarChartMedicationRow[],
  visitDate: string,
): VisitMarSlot[] {
  const target = normalizeVisitDate(visitDate)
  const items: VisitMarSlot[] = []
  for (const row of medications) {
    const cell = row.days.find(d => normalizeVisitDate(d.date) === target)
    if (!cell || cell.cellState === 'na') continue
    if (!ADMINISTRABLE.includes(cell.cellState)) continue
    items.push({ row, cell })
  }
  return items.sort((a, b) => {
    const ta = a.row.dueTime ?? '99:99'
    const tb = b.row.dueTime ?? '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return a.row.medicationName.localeCompare(b.row.medicationName)
  })
}

export function summarizeVisitDateMarSlots(slots: VisitMarSlot[]): {
  due: number
  recorded: number
  prn: number
} {
  let due = 0
  let recorded = 0
  let prn = 0
  for (const { cell } of slots) {
    if (cell.cellState === 'due') due++
    else if (cell.cellState === 'recorded') recorded++
    else if (cell.cellState === 'prn') prn++
  }
  return { due, recorded, prn }
}
