import { cn } from '@/shared/lib/utils'
import type { ScheduleJobTravelConnector } from '@/features/scheduling/utils/schedule-job-travel-connector.util'

type Props = {
  connectors: ScheduleJobTravelConnector[]
  gridWidth: number
  rowHeightPx: number
}

export function ScheduleJobTravelConnectors({ connectors, gridWidth, rowHeightPx }: Props) {
  if (connectors.length === 0) return null

  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 z-[3] overflow-visible"
      style={{ width: gridWidth, height: rowHeightPx }}
    >
      {connectors.map((connector) =>
        connector.widthPx >= 40 ? (
          <div
            key={`${connector.id}-label`}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none shadow-md',
              connector.hasTravelConflict
                ? 'border-orange-400 bg-orange-500 text-white shadow-orange-500/25 dark:border-orange-500 dark:bg-orange-600'
                : 'border-sky-700 bg-sky-600 text-white shadow-sky-600/30 ring-1 ring-sky-400/50 dark:border-sky-500 dark:bg-sky-500',
            )}
            style={{ left: connector.midX, top: connector.y }}
          >
            {connector.label}
          </div>
        ) : (
          <div
            key={`${connector.id}-label`}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm',
              connector.hasTravelConflict
                ? 'border-orange-400 bg-orange-500'
                : 'border-sky-700 bg-sky-600 dark:border-sky-500 dark:bg-sky-500',
            )}
            style={{ left: connector.midX, top: connector.y }}
            title={connector.label}
          >
            ···
          </div>
        ),
      )}
    </div>
  )
}
