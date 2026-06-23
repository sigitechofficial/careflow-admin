import * as React from 'react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  type JobDropPayload,
  jobBlockLayoutPxWithDragOffset,
  parseScheduleJobsRowKey,
  resolveScheduleJobsRowKeyAtPoint,
  type ScheduleJobsRowRef,
  scheduleJobsRowKey,
  shiftJobScheduleTimesFromViewportDeltaPx,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  scheduleJobBlockDisplayLabel,
  type ScheduleJobsBoardRowAxis,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import {
  jobBlockLayoutPxInViewport,
  type ScheduleJobsTimelineViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import {
  jobBlockLayoutPx,
  jobBlockTone,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { setScheduleJobsDragPreview } from '@/features/scheduling/utils/schedule-jobs-drag-preview.store'

const DRAG_THRESHOLD_PX = 6

type DragSession = {
  job: TimelineJob
  sourceRow: ScheduleJobsRowRef
  pointerId: number
  originClientX: number
  originClientY: number
  deltaPx: number
  hoverRowKey: string
  captureTarget: Element | null
  baseLeftPx: number
  baseWidthPx: number
  label: string
  tone: ReturnType<typeof jobBlockTone>
  compact: boolean
  blockTopOffset: number
  blockHeight: number
}

type Options = {
  date: string
  viewport: ScheduleJobsTimelineViewport
  rowAxis: ScheduleJobsBoardRowAxis
  onJobDrop: (payload: JobDropPayload) => void | Promise<void>
}

function timelineTrackElement(rowKey: string): HTMLElement | null {
  const row = document.querySelector<HTMLElement>(`[data-schedule-row-id="${rowKey}"]`)
  return row?.querySelector<HTMLElement>('[data-schedule-timeline-track]') ?? null
}

/** Comfortable, consistent preview height so the dragged card is always readable. */
const DRAG_PREVIEW_MIN_HEIGHT = 26
const DRAG_PREVIEW_MAX_HEIGHT = 36

function publishDragPreview(session: DragSession, viewport: ScheduleJobsTimelineViewport): void {
  const track = timelineTrackElement(session.hoverRowKey)
  if (!track) {
    setScheduleJobsDragPreview(null)
    return
  }

  const trackRect = track.getBoundingClientRect()
  const baseLayout =
    jobBlockLayoutPxInViewport(session.job, viewport) ?? jobBlockLayoutPx(session.job)
  const { leftPx, widthPx } = jobBlockLayoutPxWithDragOffset(
    baseLayout.leftPx,
    baseLayout.widthPx,
    session.deltaPx,
    viewport.gridWidth,
  )

  // Center a fixed-height card in the hovered row instead of reusing the source
  // block's offset — this keeps the preview clearly inside the target carer row
  // (varying row heights / stacked lanes would otherwise push it onto the edge).
  const heightPx = Math.min(
    DRAG_PREVIEW_MAX_HEIGHT,
    Math.max(DRAG_PREVIEW_MIN_HEIGHT, Math.min(session.blockHeight, trackRect.height - 4)),
  )
  const topPx = trackRect.top + Math.max(0, (trackRect.height - heightPx) / 2)

  setScheduleJobsDragPreview({
    jobId: session.job.id,
    label: session.label,
    tone: session.tone,
    leftPx: trackRect.left + leftPx,
    widthPx,
    rowKey: session.hoverRowKey,
    compact: session.compact,
    topPx,
    heightPx,
  })
}

export function useScheduleJobsDrag({ date, viewport, rowAxis, onJobDrop }: Options) {
  const [hoverRowKey, setHoverRowKey] = React.useState<string | null>(null)
  const [draggingJobId, setDraggingJobId] = React.useState<string | null>(null)
  const [listenPointerId, setListenPointerId] = React.useState<number | null>(null)

  const isDraggingRef = React.useRef(false)
  const dragMovedRef = React.useRef(false)
  const sessionRef = React.useRef<DragSession | null>(null)
  const rafRef = React.useRef<number | null>(null)

  const endDrag = React.useCallback(
    async (active: DragSession, clientY: number) => {
      const hoverKey =
        (isDraggingRef.current ? active.hoverRowKey : null) ??
        resolveScheduleJobsRowKeyAtPoint(clientY) ??
        active.hoverRowKey
      const targetRow = parseScheduleJobsRowKey(hoverKey) ?? active.sourceRow
      const times = shiftJobScheduleTimesFromViewportDeltaPx(active.job, date, active.deltaPx, viewport)

      await onJobDrop({
        job: active.job,
        sourceRow: active.sourceRow,
        targetRow,
        scheduledStartDateTime: times.scheduledStartDateTime,
        scheduledEndDateTime: times.scheduledEndDateTime,
      })
    },
    [date, onJobDrop, viewport],
  )

  const flushPreview = React.useCallback(() => {
    rafRef.current = null
    const active = sessionRef.current
    if (!active || !isDraggingRef.current) return
    publishDragPreview(active, viewport)
  }, [viewport])

  const schedulePreview = React.useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = window.requestAnimationFrame(flushPreview)
  }, [flushPreview])

  React.useEffect(() => {
    if (listenPointerId == null) return

    const handleMove = (event: PointerEvent) => {
      const active = sessionRef.current
      if (!active || event.pointerId !== active.pointerId) return

      const deltaPx = event.clientX - active.originClientX
      const deltaY = Math.abs(event.clientY - active.originClientY)
      if (!isDraggingRef.current && Math.abs(deltaPx) < DRAG_THRESHOLD_PX && deltaY < DRAG_THRESHOLD_PX) {
        return
      }

      if (!isDraggingRef.current) {
        isDraggingRef.current = true
        setDraggingJobId(active.job.id)
      }
      dragMovedRef.current = true

      const nextRowKey = resolveScheduleJobsRowKeyAtPoint(event.clientY) ?? active.hoverRowKey
      const next: DragSession = { ...active, deltaPx, hoverRowKey: nextRowKey }
      sessionRef.current = next

      if (nextRowKey !== active.hoverRowKey) {
        setHoverRowKey(nextRowKey)
      }

      schedulePreview()
    }

    const handleUp = (event: PointerEvent) => {
      const active = sessionRef.current
      if (!active || event.pointerId !== active.pointerId) return

      const moved =
        isDraggingRef.current ||
        Math.abs(event.clientX - active.originClientX) >= DRAG_THRESHOLD_PX ||
        Math.abs(event.clientY - active.originClientY) >= DRAG_THRESHOLD_PX

      if (moved) {
        void endDrag(active, event.clientY)
      }

      try {
        active.captureTarget?.releasePointerCapture(active.pointerId)
      } catch {
        // Pointer capture may already be released.
      }

      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      sessionRef.current = null
      setListenPointerId(null)
      setHoverRowKey(null)
      setDraggingJobId(null)
      setScheduleJobsDragPreview(null)
      isDraggingRef.current = false
      if (moved) {
        window.setTimeout(() => {
          dragMovedRef.current = false
        }, 0)
      } else {
        dragMovedRef.current = false
      }
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)

    const scrollEl = document.querySelector('[data-schedule-jobs-scroll]')
    const onScroll = () => {
      if (!isDraggingRef.current) return
      schedulePreview()
    }
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      scrollEl?.removeEventListener('scroll', onScroll)
    }
  }, [endDrag, listenPointerId, schedulePreview, viewport])

  const startDrag = React.useCallback(
    (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => {
      if (event.button !== 0) return
      if (isScheduleJobReadOnly(job)) return
      const target = event.currentTarget
      if (!(target instanceof HTMLElement)) return

      const baseLayout =
        jobBlockLayoutPxInViewport(job, viewport) ?? jobBlockLayoutPx(job)
      const { leftPx, widthPx } = baseLayout
      const labelMode = rowAxis === 'service-users' ? 'service-user-row' : 'carer-row'
      const label = scheduleJobBlockDisplayLabel(job, labelMode)
      const rowKey = scheduleJobsRowKey(sourceRow)
      const targetRect = target.getBoundingClientRect()
      const trackRect = timelineTrackElement(rowKey)?.getBoundingClientRect()
      const blockTopOffset = trackRect ? targetRect.top - trackRect.top : 0
      const blockHeight = targetRect.height

      const next: DragSession = {
        job,
        sourceRow,
        pointerId: event.pointerId,
        originClientX: event.clientX,
        originClientY: event.clientY,
        deltaPx: 0,
        hoverRowKey: rowKey,
        captureTarget: target,
        baseLeftPx: leftPx,
        baseWidthPx: widthPx,
        label,
        tone: jobBlockTone(job),
        compact: blockHeight <= 30,
        blockTopOffset,
        blockHeight,
      }
      sessionRef.current = next
      isDraggingRef.current = false
      dragMovedRef.current = false
      setHoverRowKey(rowKey)
      setListenPointerId(event.pointerId)
      target.setPointerCapture(event.pointerId)
    },
    [viewport, rowAxis],
  )

  return {
    startDrag,
    hoverRowKey,
    draggingJobId,
    shouldIgnoreClick: () => dragMovedRef.current,
  }
}
