import { MapPin } from 'lucide-react'
import type { MarChartCell } from '@/features/service-users/api/medication-mar.api'
import type { MarCalendarFilters } from '@/features/service-users/medication/mar-calendar-filters'
import {
  cellDisplayLabel,
  cellShouldDim,
  marCellInnerClass,
  marCellInnerStyle,
} from '@/features/service-users/medication/mar-calendar-layout'

export function MarGridCell({
  cell,
  filters,
  isTodayCol,
  isOverdue = false,
  missingBodyMapSite = false,
  onClick,
}: {
  cell: MarChartCell
  filters: MarCalendarFilters
  isTodayCol: boolean
  isOverdue?: boolean
  /** M3.8 — topical/patch due with no linked body map site */
  missingBodyMapSite?: boolean
  onClick: () => void
}) {
  const label = cellDisplayLabel(cell)
  const dimmed = cellShouldDim(cell, filters)
  const interactive =
    cell.cellState === 'due' || cell.cellState === 'recorded' || cell.cellState === 'prn'

  const innerClass = [
    marCellInnerClass(cell),
    isOverdue && cell.cellState === 'due' ? 'cell-overdue' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const innerStyle = marCellInnerStyle(cell)

  return (
    <td
      className={[
        'mar-cell',
        dimmed ? 'filter-dimmed' : '',
        cell.cellState === 'na' ? 'is-not-scheduled' : '',
        isTodayCol ? 'col-today' : '',
        isOverdue ? 'col-overdue' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        disabled={!interactive}
        onClick={onClick}
        className="h-full w-full border-0 bg-transparent p-0"
        title={
          missingBodyMapSite && cell.cellState === 'due'
            ? `${cell.statusLabel ?? label} — no body map site on file (CQC)`
            : isOverdue
              ? `${cell.statusLabel ?? label} — administration window has passed`
              : (cell.statusLabel ?? label)
        }
      >
        <div className={innerClass} style={innerStyle}>
          {missingBodyMapSite && cell.cellState === 'due' ? (
            <span className="mar-cell-bodymap-warn" aria-hidden>
              <MapPin className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {label}
        </div>
      </button>
    </td>
  )
}
