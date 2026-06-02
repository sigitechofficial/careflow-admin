import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import type { MedicationRegularChartResponse } from '@/features/service-users/api/medication-mar.api'
import { scheduleChipClass } from '@/features/service-users/medication/mar-calendar-layout'

export function MarLegendPopover({
  chart,
}: {
  chart: MedicationRegularChartResponse | undefined
}) {
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="legend-popover-wrap" ref={wrapRef}>
      <button
        type="button"
        className="filter-expand-btn inline-flex items-center gap-1"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        Legend
      </button>
      <div className={`legend-popover ${open ? 'open' : ''}`} role="dialog" aria-label="MAR legend">
        <div className="schedule-legend-row schedule-row-inline">
          <span className="schedule-legend-title">Schedule</span>
          <span className="legend-item">
            <span className="legend-dot cell-due">Due</span>
            <span>Due this day</span>
          </span>
          <span className="legend-item">
            <span className="legend-dot cell-not-scheduled">N/A</span>
            <span>Not scheduled</span>
          </span>
          <span className="legend-item">
            <span className="legend-dot cell-prn-log">+</span>
            <span>PRN log</span>
          </span>
          <span className="legend-item">
            <span className={scheduleChipClass('daily')}>Daily</span>
          </span>
          <span className="legend-item">
            <span className={scheduleChipClass('weekly')}>Weekly</span>
          </span>
          <span className="legend-item">
            <span className={scheduleChipClass('specific')}>Specific</span>
          </span>
          <span className="legend-item">
            <span className={scheduleChipClass('prn')}>PRN</span>
          </span>
        </div>
        {chart && chart.legend.length > 0 && (
          <div className="schedule-legend-row">
            <span className="schedule-legend-title">Status codes</span>
            <div className="status-legend-scroll">
              {chart.legend.map(item => (
                <span key={item.code} className="legend-item">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: item.color, color: item.textColor }}
                  >
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
