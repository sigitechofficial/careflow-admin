import type { BoardLiveOfficeAlertKind } from '@/features/ecm/utils/ecm-urgent-alert.util'
import {
  liveOfficeAlertForKind,
  type LiveOfficeAlertBoardCounts,
} from '@/features/scheduling/utils/schedule-job-live-office-alerts.util'
import { cn } from '@/shared/lib/utils'

const BANNER_ITEMS: Array<{
  kind: BoardLiveOfficeAlertKind
  countKey: keyof Pick<LiveOfficeAlertBoardCounts, 'sos' | 'leftArea' | 'unableToStart' | 'checkIn'>
}> = [
  { kind: 'CARER_SOS', countKey: 'sos' },
  { kind: 'LEFT_VISIT_AREA', countKey: 'leftArea' },
  { kind: 'UNABLE_TO_START', countKey: 'unableToStart' },
  { kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', countKey: 'checkIn' },
]

type Props = {
  counts: LiveOfficeAlertBoardCounts
  onSelectKind: (kind: BoardLiveOfficeAlertKind) => void
}

export function ScheduleJobsLiveAlertsBanner({ counts, onSelectKind }: Props) {
  if (counts.visitCount === 0) return null

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5"
      data-testid="schedule-jobs-live-alerts-banner"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
        Live office alerts
      </span>
      {BANNER_ITEMS.map(({ kind, countKey }) => {
        const count = counts[countKey]
        if (count <= 0) return null
        const meta = liveOfficeAlertForKind(kind)
        return (
          <button
            key={kind}
            type="button"
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none',
              meta.chipClass,
            )}
            onClick={() => onSelectKind(kind)}
            title={`Scroll to ${meta.label}`}
          >
            {meta.shortLabel} {count}
          </button>
        )
      })}
    </div>
  )
}
