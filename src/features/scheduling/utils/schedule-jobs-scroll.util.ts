import type { WheelEvent } from 'react'

export const SCHEDULE_JOB_HOVER_SCROLL_ATTR = 'data-schedule-job-hover-scroll'

/** Forward mouse wheel from portaled overlays to the schedule jobs scroll container. */
export function forwardWheelToScheduleJobsScroll(event: WheelEvent): boolean {
  const scroller = document.querySelector('[data-schedule-jobs-scroll]')
  if (!(scroller instanceof HTMLElement)) return false
  scroller.scrollTop += event.deltaY
  scroller.scrollLeft += event.deltaX
  return true
}

function findScheduleJobHoverScrollRegion(
  target: EventTarget | null,
  root: EventTarget | null,
): HTMLElement | null {
  if (target instanceof HTMLElement) {
    const fromTarget = target.closest(`[${SCHEDULE_JOB_HOVER_SCROLL_ATTR}]`)
    if (fromTarget instanceof HTMLElement) return fromTarget
  }
  if (root instanceof HTMLElement) {
    const fromRoot = root.querySelector(`[${SCHEDULE_JOB_HOVER_SCROLL_ATTR}]`)
    if (fromRoot instanceof HTMLElement) return fromRoot
  }
  return null
}

/** Scroll the hover panel when it overflows; otherwise scroll the rota board. */
export function handleScheduleJobHoverWheel(event: WheelEvent) {
  const scrollable = findScheduleJobHoverScrollRegion(event.target, event.currentTarget)
  if (scrollable) {
    const canScroll = scrollable.scrollHeight > scrollable.clientHeight + 1
    if (canScroll) {
      const { scrollTop, scrollHeight, clientHeight } = scrollable
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1
      const dy = event.deltaY
      if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) {
        scrollable.scrollTop += dy
        event.preventDefault()
        event.stopPropagation()
        return
      }
    }
  }

  if (forwardWheelToScheduleJobsScroll(event)) {
    event.preventDefault()
    event.stopPropagation()
  }
}

/** @deprecated Use handleScheduleJobHoverWheel */
export const handleScheduleJobsOverlayWheel = handleScheduleJobHoverWheel

/** Scroll the schedule jobs board so a gantt row is visible. */
export function scrollScheduleJobsBoardToRow(rowKey: string): void {
  requestAnimationFrame(() => {
    const row = document.querySelector(`[data-schedule-row-id="${rowKey}"]`)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

/** Scroll the schedule jobs board so a visit block is visible. */
export function scrollScheduleJobsBoardToJob(jobId: string): void {
  requestAnimationFrame(() => {
    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(jobId) : jobId
    const block = document.querySelector(`[data-job-id="${escaped}"]`)
    block?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
  })
}
