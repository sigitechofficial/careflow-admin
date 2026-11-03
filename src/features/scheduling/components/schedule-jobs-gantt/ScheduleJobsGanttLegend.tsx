import * as React from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  AlertTriangle,
  BedDouble,
  CalendarClock,
  Car,
  Clock,
  Info,
  Siren,
  Users,
} from 'lucide-react'
import {
  JOB_BLOCK_TONE_CLASSES,
  jobBlockCancelledSurfaceStyle,
  jobBlockCompletedSurfaceStyle,
  jobBlockUnableToStartSurfaceStyle,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

/** Mini visit card drawn with the same classes the rota board uses, so the legend matches the board. */
function CardSwatch({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={cn('inline-block h-5 w-10 shrink-0 rounded-md border', className)} style={style} />
}

function BarSwatch({ className }: { className: string }) {
  return (
    <span className="relative inline-block h-5 w-10 shrink-0 rounded-md border border-border bg-background">
      <span className={cn('absolute inset-x-0 bottom-0 h-1.5 rounded-b-md', className)} />
    </span>
  )
}

function ChipSwatch({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex w-10 shrink-0 justify-center">
      <span className={cn('rounded px-1 text-[9px] font-bold leading-4', className)}>{children}</span>
    </span>
  )
}

function IconSwatch({ children }: { children: ReactNode }) {
  return <span className="inline-flex w-10 shrink-0 justify-center">{children}</span>
}

type LegendRow = { swatch: ReactNode; label: string; detail: string }

const STRIPED_OVER_CONTRACT =
  'border-amber-600 bg-[repeating-linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.22)_6px,rgba(255,255,255,0.45)_6px,rgba(255,255,255,0.45)_12px)] ring-2 ring-amber-500/70'

const LEGEND_SECTIONS: Array<{ title: string; hint: string; rows: LegendRow[] }> = [
  {
    title: 'Visit card colour',
    hint: 'The fill of the card shows where the visit stands.',
    rows: [
      {
        swatch: <CardSwatch className={JOB_BLOCK_TONE_CLASSES.green} />,
        label: 'Covered',
        detail: 'Carers are assigned, confirmed or the visit is in progress.',
      },
      {
        swatch: <CardSwatch className={JOB_BLOCK_TONE_CLASSES.red} />,
        label: 'Needs carers',
        detail: 'Fewer carers assigned than the visit needs, or the visit needs attention.',
      },
      {
        swatch: <CardSwatch className={JOB_BLOCK_TONE_CLASSES.orange} />,
        label: 'Check this visit',
        detail: 'Pending, needs cover, carer on leave, or outside the carer’s working pattern.',
      },
      {
        swatch: <CardSwatch className={JOB_BLOCK_TONE_CLASSES.completed} style={jobBlockCompletedSurfaceStyle} />,
        label: 'Completed',
        detail: 'The visit has been delivered.',
      },
      {
        swatch: (
          <CardSwatch className={JOB_BLOCK_TONE_CLASSES.unableToStart} style={jobBlockUnableToStartSurfaceStyle} />
        ),
        label: 'Unable to start',
        detail: 'Care could not be delivered at this visit.',
      },
      {
        swatch: <CardSwatch className={JOB_BLOCK_TONE_CLASSES.cancelled} style={jobBlockCancelledSurfaceStyle} />,
        label: 'Cancelled',
        detail: 'The visit was cancelled. Right-click to reinstate.',
      },
    ],
  },
  {
    title: 'Card outline warnings',
    hint: 'A thick border or stripes on top of the colour means a planning problem.',
    rows: [
      {
        swatch: <CardSwatch className={STRIPED_OVER_CONTRACT} />,
        label: 'Over weekly contract',
        detail: 'This visit takes the client over the weekly hours in their visit plan.',
      },
      {
        swatch: <CardSwatch className={cn(JOB_BLOCK_TONE_CLASSES.green, 'border-rose-600 ring-2 ring-rose-500/80')} />,
        label: 'Over booked',
        detail: 'More carers assigned than the visit needs.',
      },
      {
        swatch: <CardSwatch className={cn(JOB_BLOCK_TONE_CLASSES.green, 'border-orange-600 ring-2 ring-orange-500/80')} />,
        label: 'Travel or working-pattern conflict',
        detail: 'Not enough travel time from the previous visit, or outside the carer’s working pattern.',
      },
      {
        swatch: <CardSwatch className={cn(JOB_BLOCK_TONE_CLASSES.green, 'border-l-[3px] border-l-violet-600')} />,
        label: 'Part of a run',
        detail: 'The coloured left edge shows which run the visit belongs to.',
      },
    ],
  },
  {
    title: 'Live alerts',
    hint: 'The card grows and pulses until the office deals with it.',
    rows: [
      {
        swatch: (
<CardSwatch className="border-2 border-red-500 bg-rose-50" />
        ),
        label: 'SOS or left visit area',
        detail: 'The carer sent an SOS or left the visit area. Act now.',
      },
      {
        swatch: <CardSwatch className="border-2 border-amber-500 bg-amber-50" />,
        label: 'Unable to start or authorisation request',
        detail: 'The carer cannot start, or is asking to clock in outside the visit area.',
      },
    ],
  },
  {
    title: 'Badges on the card',
    hint: 'Small markers next to the client or carer name.',
    rows: [
      {
        swatch: <ChipSwatch className="bg-slate-900/85 text-white">2/3</ChipSwatch>,
        label: 'Overlapping visits',
        detail: 'Visit 2 of 3 that sit at the same time in this row. Not a carer count.',
      },
      {
        swatch: (
          <IconSwatch>
            <Users className="h-3.5 w-3.5" />
          </IconSwatch>
        ),
        label: 'Double-up',
        detail: 'The visit needs 2 or more carers.',
      },
      {
        swatch: (
          <IconSwatch>
            <AlertTriangle className="h-3.5 w-3.5 text-sky-600" />
          </IconSwatch>
        ),
        label: 'Needs cover',
        detail: 'A carer is still needed for this visit.',
      },
      {
        swatch: (
          <IconSwatch>
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </IconSwatch>
        ),
        label: 'Carer on leave',
        detail: 'An assigned carer is on leave at this time.',
      },
      {
        swatch: (
          <IconSwatch>
            <BedDouble className="h-3.5 w-3.5 text-rose-600" />
          </IconSwatch>
        ),
        label: 'Client absent',
        detail: 'The client is away (for example in hospital).',
      },
      {
        swatch: (
          <IconSwatch>
            <CalendarClock className="h-3.5 w-3.5 text-orange-600" />
          </IconSwatch>
        ),
        label: 'Outside working pattern',
        detail: 'The visit falls outside the carer’s working pattern.',
      },
      {
        swatch: (
          <IconSwatch>
            <Car className="h-3.5 w-3.5 opacity-70" />
          </IconSwatch>
        ),
        label: 'Travel method',
        detail: 'Shown on run visits when travel icons are switched on.',
      },
      {
        swatch: (
          <IconSwatch>
            <Siren className="h-3.5 w-3.5 text-red-600" />
          </IconSwatch>
        ),
        label: 'SOS chip',
        detail: 'Red chip with a siren shows an open carer SOS.',
      },
    ],
  },
  {
    title: 'Medicine, task and timing chips',
    hint: 'Coloured chips for time-sensitive medicine or tasks and for clock-in timing.',
    rows: [
      {
        swatch: <ChipSwatch className="bg-sky-600 text-white">Early</ChipSwatch>,
        label: 'Early',
        detail: 'Medicine or task given early, or the visit started or ended early.',
      },
      {
        swatch: <ChipSwatch className="bg-amber-600 text-white">Delay</ChipSwatch>,
        label: 'Medicine or task delayed',
        detail: 'A time-sensitive medicine or task is late.',
      },
      {
        swatch: <ChipSwatch className="bg-orange-600 text-white">Late</ChipSwatch>,
        label: 'Late start, end or overrun',
        detail: 'The carer clocked in or out late, or the visit ran over.',
      },
      {
        swatch: <ChipSwatch className="bg-destructive text-destructive-foreground">Miss</ChipSwatch>,
        label: 'Missed or critically late',
        detail: 'A time-sensitive medicine or task was missed, or the visit is critically late.',
      },
      {
        swatch: (
          <IconSwatch>
            <Clock className="h-3.5 w-3.5 text-red-600" />
          </IconSwatch>
        ),
        label: 'Time-sensitive visit',
        detail: 'Clock in the card corner: this visit must start within its time tolerance.',
      },
      {
        swatch: <ChipSwatch className="bg-orange-700 text-white">NFC</ChipSwatch>,
        label: 'Clock-in method',
        detail: 'How the carer clocked in. Hover for the reason or notes.',
      },
    ],
  },
  {
    title: 'Carer availability (carer rows)',
    hint: 'The thin bar at the bottom of each carer row.',
    rows: [
      {
        swatch: <BarSwatch className="bg-[#5a9f5e]" />,
        label: 'Available',
        detail: 'The carer is free to take visits.',
      },
      {
        swatch: <BarSwatch className="bg-[#e8a54b]" />,
        label: 'Possibly available',
        detail: 'The carer may be free. Check before booking.',
      },
      {
        swatch: <BarSwatch className="bg-red-500" />,
        label: 'Booked',
        detail: 'The carer already has a visit at this time.',
      },
      {
        swatch: <CardSwatch className="border-border bg-muted/60" />,
        label: 'Not available',
        detail: 'Grey shading: outside the carer’s available hours.',
      },
    ],
  },
]

function LegendSection({ title, hint, rows }: (typeof LEGEND_SECTIONS)[number]) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex">{row.swatch}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{row.label}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

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
        <DialogContent size="xl" className="max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Schedule board legend</DialogTitle>
            <DialogDescription>
              What each colour, border and badge on the rota board means.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5 divide-y divide-border/70 [&>section:not(:first-child)]:pt-5">
            {LEGEND_SECTIONS.map((section) => (
              <LegendSection key={section.title} {...section} />
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
