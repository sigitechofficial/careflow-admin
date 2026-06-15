import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/utils'
import { JOB_BLOCK_TONE_CLASSES } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  getScheduleJobsDragPreview,
  subscribeScheduleJobsDragPreview,
} from '@/features/scheduling/utils/schedule-jobs-drag-preview.store'

function useDragPreview() {
  return React.useSyncExternalStore(
    subscribeScheduleJobsDragPreview,
    getScheduleJobsDragPreview,
    () => null,
  )
}

export function ScheduleJobsDragOverlay() {
  const preview = useDragPreview()
  if (!preview) return null

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed z-[200] flex items-center gap-0.5 rounded border-2 border-dashed px-1.5 text-[11px] font-semibold leading-tight shadow-lg ring-2 ring-primary/40',
        JOB_BLOCK_TONE_CLASSES[preview.tone],
      )}
      style={{
        left: preview.leftPx,
        top: preview.topPx,
        width: preview.widthPx,
        height: preview.heightPx,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'left, top, width',
      }}
    >
      <span className="whitespace-nowrap">{preview.label}</span>
    </div>,
    document.body,
  )
}
