import * as React from 'react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  collectJobIdsInMarqueeRect,
  isMarqueePointerTarget,
  normalizeClientRect,
  type ClientRect,
} from '@/features/scheduling/utils/schedule-jobs-marquee-select.util'
import { toastWarning } from '@/shared/lib/toast'

const MARQUEE_THRESHOLD_PX = 8

type Options = {
  jobsById: Map<string, TimelineJob>
  /** Editable visits in the box (some may already be in a run) and where the pointer let go. */
  onSelectionComplete: (jobs: TimelineJob[], point: { x: number; y: number }) => void
  minJobs?: number
}

type MarqueeSession = {
  pointerId: number
  originX: number
  originY: number
  currentX: number
  currentY: number
}

export function useScheduleJobsMarqueeSelect({
  jobsById,
  onSelectionComplete,
  minJobs = 2,
}: Options) {
  const [marqueeRect, setMarqueeRect] = React.useState<ClientRect | null>(null)
  const [previewJobIds, setPreviewJobIds] = React.useState<Set<string>>(new Set())
  const sessionRef = React.useRef<MarqueeSession | null>(null)
  const activeRef = React.useRef(false)

  const boardRoot = React.useCallback(
    () => document.querySelector('[data-schedule-jobs-board]'),
    [],
  )

  const updatePreview = React.useCallback(
    (rect: ClientRect) => {
      const root = boardRoot()
      if (!root) {
        setPreviewJobIds(new Set())
        return
      }
      const ids = collectJobIdsInMarqueeRect(root, rect)
      setPreviewJobIds(new Set(ids))
    },
    [boardRoot],
  )

  const finishMarquee = React.useCallback(
    (rect: ClientRect | null, point: { x: number; y: number }) => {
      if (!rect) return
      const root = boardRoot()
      if (!root) return
      const ids = collectJobIdsInMarqueeRect(root, rect)
      const eligible = ids
        .map((id) => jobsById.get(id))
        .filter((job): job is TimelineJob => Boolean(job))
        .filter((job) => !isScheduleJobReadOnly(job))

      if (ids.length >= minJobs && eligible.length < minJobs) {
        toastWarning('Select more visits', `Drag to select at least ${minJobs} visits that can still be changed.`)
        return
      }

      if (eligible.length >= minJobs) {
        onSelectionComplete(eligible, point)
      }
    },
    [boardRoot, jobsById, minJobs, onSelectionComplete],
  )

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (!isMarqueePointerTarget(event.target)) return

      sessionRef.current = {
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
      }
      activeRef.current = false
    }

    const handlePointerMove = (event: PointerEvent) => {
      const session = sessionRef.current
      if (!session || event.pointerId !== session.pointerId) return

      const dx = Math.abs(event.clientX - session.originX)
      const dy = Math.abs(event.clientY - session.originY)
      if (!activeRef.current && dx < MARQUEE_THRESHOLD_PX && dy < MARQUEE_THRESHOLD_PX) return

      activeRef.current = true
      const next: MarqueeSession = {
        ...session,
        currentX: event.clientX,
        currentY: event.clientY,
      }
      sessionRef.current = next
      const rect = normalizeClientRect(
        next.originX,
        next.originY,
        next.currentX,
        next.currentY,
      )
      setMarqueeRect(rect)
      updatePreview(rect)
    }

    const handlePointerUp = (event: PointerEvent) => {
      const session = sessionRef.current
      if (!session || event.pointerId !== session.pointerId) return

      const rect = activeRef.current
        ? normalizeClientRect(session.originX, session.originY, event.clientX, event.clientY)
        : null

      sessionRef.current = null
      activeRef.current = false
      setMarqueeRect(null)
      setPreviewJobIds(new Set())

      if (rect) {
        finishMarquee(rect, { x: event.clientX, y: event.clientY })
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [finishMarquee, updatePreview])

  return {
    marqueeRect,
    previewJobIds,
    isMarqueeActive: marqueeRect != null,
  }
}
