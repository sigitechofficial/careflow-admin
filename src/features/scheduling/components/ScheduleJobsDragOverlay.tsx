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
        'pointer-events-none fixed z-[200] flex items-center overflow-hidden rounded-md border-2 border-dashed px-2 text-xs font-semibold leading-snug antialiased shadow-xl ring-2 ring-primary/50',
        JOB_BLOCK_TONE_CLASSES[preview.tone],
      )}
      style={{
        left: preview.leftPx,
        top: preview.topPx,
        width: preview.widthPx,
        height: preview.heightPx,
        transform: 'translate3d(0, 0, 0)',
        willChange: 'left, top',
      }}
    >
      <span className="min-w-0 flex-1 truncate">{preview.label}</span>
    </div>,
    document.body,
  )
}
