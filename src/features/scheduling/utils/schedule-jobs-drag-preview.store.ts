import type { JobBlockTone } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ScheduleJobsDragPreview = {
  jobId: string
  label: string
  tone: JobBlockTone
  leftPx: number
  widthPx: number
  rowKey: string
  compact: boolean
  /** Fixed-position coordinates (viewport). */
  topPx: number
  heightPx: number
}

let preview: ScheduleJobsDragPreview | null = null
const listeners = new Set<() => void>()

export function getScheduleJobsDragPreview(): ScheduleJobsDragPreview | null {
  return preview
}

export function setScheduleJobsDragPreview(next: ScheduleJobsDragPreview | null): void {
  preview = next
  listeners.forEach((listener) => listener())
}

export function subscribeScheduleJobsDragPreview(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
