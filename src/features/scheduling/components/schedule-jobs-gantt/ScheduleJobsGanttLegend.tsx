import * as React from 'react'
import type { CSSProperties } from 'react'
import { Clock, Info } from 'lucide-react'
import {
  jobBlockCompletedSurfaceStyle,
  jobBlockUnableToStartSurfaceStyle,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

function LegendPill({
  swatch,
  label,
  striped,
  hatchStyle,
}: {
  swatch?: string
  label: string
  striped?: boolean
  hatchStyle?: CSSProperties
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
      {hatchStyle ? (
        <span
          className="inline-block h-2 w-5 rounded-sm border border-slate-300/80"
          style={hatchStyle}
        />
      ) : striped ? (
        <span
          className="inline-block h-2 w-5 rounded-sm border border-slate-300/80"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(100,116,139,0.18) 2px, rgba(100,116,139,0.18) 4px)',
          }}
        />
      ) : (
        <span className={cn('inline-block h-2 w-5 rounded-full', swatch)} />
      )}
      {label}
    </span>
  )
}

const LEGEND_ITEMS: Array<{
  swatch?: string
  label: string
  striped?: boolean
  hatchStyle?: CSSProperties
}> = [
  { swatch: 'bg-emerald-500', label: 'Available' },
  { swatch: 'bg-rose-500', label: 'Booked' },
  { swatch: 'bg-amber-500', label: 'Possibly available' },
  { striped: true, label: 'Outside hours' },
  { striped: true, label: 'Over weekly contract' },
  { swatch: 'bg-rose-500', label: 'Over booked (extra carers)' },
  { swatch: 'border-2 border-orange-500 bg-orange-100/80', label: 'Travel time conflict' },
  { swatch: 'border-b-4 border-primary bg-background', label: 'Part of a run' },
  { swatch: 'bg-red-600', label: 'Time-sensitive medicine / task' },
  { swatch: 'bg-sky-600', label: 'Medicine / task early' },
  { swatch: 'bg-amber-500', label: 'Medicine / task delayed' },
  { swatch: 'bg-destructive', label: 'Medicine / task missed' },
  { swatch: 'bg-sky-600', label: 'Early start / end' },
  { swatch: 'bg-orange-600', label: 'Late start / end / overrun' },
  { swatch: 'bg-destructive', label: 'Critically late' },
  { hatchStyle: jobBlockCompletedSurfaceStyle, label: 'Completed' },
  { hatchStyle: jobBlockUnableToStartSurfaceStyle, label: 'Unable to start' },
  { swatch: 'border-2 border-red-500 bg-rose-50', label: 'SOS / left visit area' },
  { swatch: 'border-2 border-amber-500 bg-amber-50', label: 'Unable to start / auth request' },
]

export function ScheduleJobsGanttLegend() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-4 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          data-testid="schedule-jobs-legend-button"
          onClick={() => setOpen(true)}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
          Legend
        </Button>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          Click job to open visit workspace · right-click for more actions · drag job to move · double-click period to zoom · Esc for full day
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule board legend</DialogTitle>
            <DialogDescription>
              Colours and markers used on visit blocks, carer availability, and alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 pt-1">
            {LEGEND_ITEMS.map((item) => (
              <LegendPill key={item.label} {...item} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
