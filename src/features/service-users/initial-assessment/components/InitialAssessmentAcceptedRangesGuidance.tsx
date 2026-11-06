import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useVitalAcceptedRangeLookup } from '@/features/service-users/initial-assessment/hooks/useVitalAcceptedRangeLookup'
import {
  formatVitalAcceptedRangeValue,
  lookupRowsByColumn,
} from '@/features/service-users/initial-assessment/utils/vital-accepted-ranges.lookup'

function RangeColumn({ rows }: { rows: ReturnType<typeof lookupRowsByColumn> }) {
  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div key={row.fieldKey} className="space-y-0.5">
          <div className="flex flex-wrap gap-x-1.5 text-sm leading-snug">
            <dt className="font-medium text-foreground">{row.label}:</dt>
            <dd className="text-muted-foreground">
              {formatVitalAcceptedRangeValue(row.min, row.max, row.unit)}
            </dd>
          </div>
          {'referenceNote' in row && row.referenceNote ? (
            <dd className="text-xs text-muted-foreground">{row.referenceNote}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

export function InitialAssessmentAcceptedRangesGuidance() {
  const lookupQuery = useVitalAcceptedRangeLookup()
  const rows = lookupQuery.data ?? []
  const [open, setOpen] = React.useState(true)

  const left = lookupRowsByColumn(rows, 'left')
  const right = lookupRowsByColumn(rows, 'right')

  return (
    <div
      className="overflow-hidden rounded-md border border-slate-300 bg-[#f9f9f9] dark:border-slate-600 dark:bg-muted/30"
      data-testid="ia-vitals-accepted-ranges"
    >
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 border-b border-teal-800 px-4 py-2.5 text-left',
          'text-sm font-medium text-foreground transition-colors hover:bg-muted/40',
          !open && 'border-b-0',
        )}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-teal-800 transition-transform dark:text-teal-300', open && 'rotate-180')}
          aria-hidden
        />
        Accepted ranges
      </button>
      {open ? (
        <div className="space-y-3 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            RESTORE2 / NEWS2 score-0 reference ranges (CQC-endorsed for care settings). Compare to the
            person&apos;s baseline; adjust in Settings if your agency uses different thresholds.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <RangeColumn rows={left} />
            <RangeColumn rows={right} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
