import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import type { MedicationRegularChartResponse } from '@/features/service-users/api/medication-mar.api'
import { scheduleChipClass } from '@/features/service-users/medication/mar-calendar-layout'

/** Static collapsible legend for narrow panels (visit workspace) — no absolute popover. */
export function MarLegendInline({
  chart,
  defaultOpen = false,
}: {
  chart: MedicationRegularChartResponse | undefined
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span>Legend — schedule &amp; status codes</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Schedule</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="legend-dot cell-due rounded px-1.5 py-0.5 text-[10px] font-semibold">Due</span>
              Due this day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="legend-dot cell-not-scheduled rounded px-1.5 py-0.5 text-[10px] font-semibold">N/A</span>
              Not scheduled
            </span>
            <span className={scheduleChipClass('daily')}>Daily</span>
            <span className={scheduleChipClass('weekly')}>Weekly</span>
            <span className={scheduleChipClass('prn')}>PRN</span>
          </div>
          {chart && chart.legend.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="w-full font-semibold uppercase tracking-wide text-muted-foreground">Status codes</span>
              {chart.legend.map(item => (
                <span key={item.code} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-flex min-w-[1.75rem] items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: item.color, color: item.textColor }}
                  >
                    {item.code}
                  </span>
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
