import * as React from 'react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  confirmJobDropTravelConflict,
  evaluateJobDropTravelPreview,
} from '@/features/scheduling/utils/schedule-job-drag-travel.util'
import {
  type JobDropPayload,
  parseScheduleJobsRowKey,
  resolveScheduleJobsRowKeyAtPoint,
  type ScheduleJobsRowRef,
  scheduleJobsRowKey,
  shiftJobScheduleTimesFromViewportDeltaPx,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  highlightScheduleJobsDropTargetRow,
  markScheduleJobDragSource,
  mountScheduleJobsDragPreview,
  unmountScheduleJobsDragPreview,
  updateScheduleJobsDragPreviewPosition,
  updateScheduleJobsDragPreviewTravel,
} from '@/features/scheduling/utils/schedule-jobs-drag-preview.dom'
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

const DRAG_THRESHOLD_PX = 6

type DragSession = {
  job: TimelineJob
  sourceRow: ScheduleJobsRowRef
  pointerId: number
  originClientX: number
  originClientY: number
  grabOffsetX: number
  grabOffsetY: number
  deltaPx: number
  hoverRowKey: string
  captureTarget: HTMLElement | null
  previewWidthPx: number
  previewHeightPx: number
  label: string
  tone: ReturnType<typeof jobBlockTone>
  lastTravelKey: string | null
  lastClientX: number
  lastClientY: number
}

type Options = {
  date: string
  viewport: ScheduleJobsTimelineViewport
  rowAxis: ScheduleJobsBoardRowAxis
  travelBufferMinutes?: number
  getRowJobsForKey?: (rowKey: string) => TimelineJob[]
  onJobDrop: (payload: JobDropPayload) => void | Promise<void>
}

function travelPreviewKey(session: DragSession, date: string, viewport: ScheduleJobsTimelineViewport): string {
  const times = shiftJobScheduleTimesFromViewportDeltaPx(
    session.job,
    date,
    session.deltaPx,
    viewport,
  )
  return `${session.hoverRowKey}:${times.scheduledStartDateTime}:${times.scheduledEndDateTime}`
}

function publishTravelPreview(
  session: DragSession,
  options: Pick<Options, 'date' | 'travelBufferMinutes' | 'getRowJobsForKey' | 'viewport'>,
): void {
  const travelKey = travelPreviewKey(session, options.date, options.viewport)
  if (travelKey === session.lastTravelKey) return
  session.lastTravelKey = travelKey

  const targetRow = parseScheduleJobsRowKey(session.hoverRowKey)
  const times = shiftJobScheduleTimesFromViewportDeltaPx(
    session.job,
    options.date,
    session.deltaPx,
    options.viewport,
  )
  const travelPreview =
    targetRow?.kind === 'carer' && options.getRowJobsForKey
      ? evaluateJobDropTravelPreview({
          job: session.job,
          targetRow,
          rowJobs: options.getRowJobsForKey(session.hoverRowKey),
          scheduledStartDateTime: times.scheduledStartDateTime,
          scheduledEndDateTime: times.scheduledEndDateTime,
          bufferMinutes: options.travelBufferMinutes,
        })
      : null

  const status =
    travelPreview && travelPreview.status !== 'ok' ? travelPreview.status : null
  updateScheduleJobsDragPreviewTravel(status)
}

export function useScheduleJobsDrag({
  date,
  viewport,
  rowAxis,
  travelBufferMinutes = 0,
  getRowJobsForKey,
  onJobDrop,
}: Options) {
  const [draggingJobId, setDraggingJobId] = React.useState<string | null>(null)
  const [listenPointerId, setListenPointerId] = React.useState<number | null>(null)

  const isDraggingRef = React.useRef(false)
  const dragMovedRef = React.useRef(false)
  const sessionRef = React.useRef<DragSession | null>(null)
  const travelRafRef = React.useRef<number | null>(null)

  const previewOptions = React.useMemo(
    () => ({ date, travelBufferMinutes, getRowJobsForKey, viewport }),
    [date, getRowJobsForKey, travelBufferMinutes, viewport],
  )

  const scheduleTravelPreview = React.useCallback(() => {
    if (travelRafRef.current != null) return
    travelRafRef.current = window.requestAnimationFrame(() => {
      travelRafRef.current = null
      const active = sessionRef.current
      if (!active || !isDraggingRef.current) return
      publishTravelPreview(active, previewOptions)
    })
  }, [previewOptions])

  const endDrag = React.useCallback(
    async (active: DragSession, clientY: number) => {
      const hoverKey =
        (isDraggingRef.current ? active.hoverRowKey : null) ??
        resolveScheduleJobsRowKeyAtPoint(clientY) ??
        active.hoverRowKey
      const targetRow = parseScheduleJobsRowKey(hoverKey) ?? active.sourceRow
      const times = shiftJobScheduleTimesFromViewportDeltaPx(active.job, date, active.deltaPx, viewport)

      if (targetRow.kind === 'carer' && getRowJobsForKey) {
        const travelPreview = evaluateJobDropTravelPreview({
          job: active.job,
          targetRow,
          rowJobs: getRowJobsForKey(hoverKey),
          scheduledStartDateTime: times.scheduledStartDateTime,
          scheduledEndDateTime: times.scheduledEndDateTime,
          bufferMinutes: travelBufferMinutes,
        })
        if (travelPreview.status === 'conflict' && travelPreview.message) {
          if (!confirmJobDropTravelConflict(travelPreview.message)) {
            return
          }
        }
      }

      await onJobDrop({
        job: active.job,
        sourceRow: active.sourceRow,
        targetRow,
        scheduledStartDateTime: times.scheduledStartDateTime,
        scheduledEndDateTime: times.scheduledEndDateTime,
      })
    },
    [date, getRowJobsForKey, onJobDrop, travelBufferMinutes, viewport],
  )

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
        markScheduleJobDragSource(active.captureTarget, true)
        mountScheduleJobsDragPreview({
          label: active.label,
          tone: active.tone,
          widthPx: active.previewWidthPx,
          heightPx: active.previewHeightPx,
        })
        highlightScheduleJobsDropTargetRow(active.hoverRowKey)
        document.body.classList.add('cursor-grabbing')
        document.body.style.userSelect = 'none'
      }
      dragMovedRef.current = true

      const nextRowKey = resolveScheduleJobsRowKeyAtPoint(event.clientY) ?? active.hoverRowKey
      const rowChanged = nextRowKey !== active.hoverRowKey
      active.deltaPx = deltaPx
      active.hoverRowKey = nextRowKey
      active.lastClientX = event.clientX
      active.lastClientY = event.clientY
      if (rowChanged) {
        active.lastTravelKey = null
        highlightScheduleJobsDropTargetRow(nextRowKey)
      }

      updateScheduleJobsDragPreviewPosition(
        event.clientX,
        event.clientY,
        active.grabOffsetX,
        active.grabOffsetY,
      )
      scheduleTravelPreview()
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

      if (travelRafRef.current != null) {
        window.cancelAnimationFrame(travelRafRef.current)
        travelRafRef.current = null
      }

      markScheduleJobDragSource(active.captureTarget, false)
      unmountScheduleJobsDragPreview()
      document.body.classList.remove('cursor-grabbing')
      document.body.style.removeProperty('user-select')
      sessionRef.current = null
      setListenPointerId(null)
      setDraggingJobId(null)
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
      const active = sessionRef.current
      if (!active || !isDraggingRef.current) return
      updateScheduleJobsDragPreviewPosition(
        active.lastClientX,
        active.lastClientY,
        active.grabOffsetX,
        active.grabOffsetY,
      )
    }
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      scrollEl?.removeEventListener('scroll', onScroll)
    }
  }, [endDrag, listenPointerId, scheduleTravelPreview])

  const startDrag = React.useCallback(
    (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => {
      if (event.button !== 0) return
      if (isScheduleJobReadOnly(job)) return
      const target = event.currentTarget
      if (!(target instanceof HTMLElement)) return

      const targetRect = target.getBoundingClientRect()
      const labelMode = rowAxis === 'service-users' ? 'service-user-row' : 'carer-row'
      const label = scheduleJobBlockDisplayLabel(job, labelMode)
      const rowKey = scheduleJobsRowKey(sourceRow)

      sessionRef.current = {
        job,
        sourceRow,
        pointerId: event.pointerId,
        originClientX: event.clientX,
        originClientY: event.clientY,
        grabOffsetX: event.clientX - targetRect.left,
        grabOffsetY: event.clientY - targetRect.top,
        deltaPx: 0,
        hoverRowKey: rowKey,
        captureTarget: target,
        previewWidthPx: targetRect.width,
        previewHeightPx: targetRect.height,
        label,
        tone: jobBlockTone(job),
        lastTravelKey: null,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      }
      isDraggingRef.current = false
      dragMovedRef.current = false
      setListenPointerId(event.pointerId)
      target.setPointerCapture(event.pointerId)
    },
    [rowAxis],
  )

  return {
    startDrag,
    draggingJobId,
    shouldIgnoreClick: () => dragMovedRef.current,
  }
}
