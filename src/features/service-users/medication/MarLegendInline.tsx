import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import type { MedicationRegularChartResponse } from '@/features/service-users/api/medication-mar.api'
import { scheduleChipClass } from '@/features/service-users/medication/mar-calendar-layout'
import { cn } from '@/shared/lib/utils'

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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Legend — schedule &amp; status codes</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border bg-muted/10 px-3.5 py-3.5">
          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <span className="legend-item">
                <span className="legend-dot cell-due">Due</span>
                <span className="text-sm text-foreground">Due this day</span>
              </span>
              <span className="legend-item">
                <span className="legend-dot cell-not-scheduled">N/A</span>
                <span className="text-sm text-foreground">Not scheduled</span>
              </span>
              <span className="legend-item">
                <span className="legend-dot cell-prn-log">+</span>
                <span className="text-sm text-foreground">PRN log</span>
              </span>
              <span className="legend-item flex-wrap gap-1.5">
                <span className={scheduleChipClass('daily')}>Daily</span>
                <span className={scheduleChipClass('weekly')}>Weekly</span>
                <span className={scheduleChipClass('prn')}>PRN</span>
              </span>
            </div>
          </section>

          {chart && chart.legend.length > 0 ? (
            <section className="space-y-2 border-t border-border/70 pt-3.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status codes
              </h4>
              <div className="status-legend-scroll">
                {chart.legend.map((item) => (
                  <span key={item.code} className="legend-item min-w-0">
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: item.color, color: item.textColor }}
                    >
                      {item.code}
                    </span>
                    <span className="min-w-0 truncate text-sm text-muted-foreground" title={item.label}>
                      {item.label}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
