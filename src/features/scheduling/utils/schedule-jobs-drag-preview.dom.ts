import type { JobBlockTone } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { JOB_BLOCK_TONE_CLASSES } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import type { TravelTimingStatus } from '@/features/scheduling/utils/schedule-job-travel-timing.util'

const DROP_TARGET_ATTR = 'data-schedule-drop-target'
const ROOT_ID = 'schedule-jobs-drag-preview-root'

type MountOptions = {
  label: string
  tone: JobBlockTone
  widthPx: number
  heightPx: number
}

let rootEl: HTMLDivElement | null = null
let cardEl: HTMLDivElement | null = null
let labelEl: HTMLSpanElement | null = null
let warningEl: HTMLSpanElement | null = null
let dropTargetRowEl: HTMLElement | null = null
let lastTravelStatus: TravelTimingStatus | 'ok' | null = null

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function ensureRoot(): HTMLDivElement {
  if (rootEl?.isConnected) return rootEl

  rootEl = document.getElementById(ROOT_ID) as HTMLDivElement | null
  if (rootEl) return rootEl

  rootEl = document.createElement('div')
  rootEl.id = ROOT_ID
  rootEl.className = 'pointer-events-none fixed left-0 top-0 z-[200]'
  rootEl.style.display = 'none'
  rootEl.style.willChange = 'transform'

  cardEl = document.createElement('div')
  labelEl = document.createElement('span')
  labelEl.className = 'min-w-0 truncate'

  warningEl = document.createElement('span')
  warningEl.className = 'mt-0.5 hidden truncate text-[10px] font-medium leading-tight'

  cardEl.append(labelEl, warningEl)
  rootEl.append(cardEl)
  document.body.append(rootEl)
  return rootEl
}

function travelBorderClasses(status: TravelTimingStatus | 'ok' | null): string {
  if (status === 'conflict') {
    return 'border-orange-500 ring-2 ring-orange-500/60 dark:border-orange-400'
  }
  if (status === 'tight') {
    return 'border-amber-500 ring-2 ring-amber-500/50 dark:border-amber-400'
  }
  return 'border-primary/70 ring-2 ring-primary/50'
}

export function mountScheduleJobsDragPreview(options: MountOptions): void {
  ensureRoot()
  if (!rootEl || !cardEl || !labelEl || !warningEl) return

  cardEl.dataset.tone = options.tone
  labelEl.textContent = options.label
  cardEl.className = cn(
    'flex flex-col justify-center overflow-hidden rounded-md border-2 border-dashed px-2 text-xs font-semibold leading-snug antialiased shadow-xl',
    JOB_BLOCK_TONE_CLASSES[options.tone],
    travelBorderClasses(null),
  )
  warningEl.textContent = ''
  warningEl.className = 'mt-0.5 hidden truncate text-[10px] font-medium leading-tight'
  lastTravelStatus = null

  rootEl.style.display = 'block'
  rootEl.style.width = `${options.widthPx}px`
  rootEl.style.height = `${options.heightPx}px`
  cardEl.style.height = `${options.heightPx}px`
}

export function updateScheduleJobsDragPreviewPosition(
  clientX: number,
  clientY: number,
  grabOffsetX: number,
  grabOffsetY: number,
): void {
  if (!rootEl) return
  rootEl.style.transform = `translate3d(${clientX - grabOffsetX}px, ${clientY - grabOffsetY}px, 0)`
}

export function updateScheduleJobsDragPreviewTravel(status: TravelTimingStatus | 'ok' | null): void {
  if (!cardEl || !warningEl) return
  if (status === lastTravelStatus) return
  lastTravelStatus = status

  const tone = (cardEl.dataset.tone as JobBlockTone | undefined) ?? 'neutral'
  cardEl.className = cn(
    'flex flex-col justify-center overflow-hidden rounded-md border-2 border-dashed px-2 text-xs font-semibold leading-snug antialiased shadow-xl',
    JOB_BLOCK_TONE_CLASSES[tone],
    travelBorderClasses(status === 'ok' ? null : status),
  )

  if (status === 'conflict') {
    warningEl.textContent = 'Not enough travel time'
    warningEl.className =
      'mt-0.5 truncate text-[10px] font-medium leading-tight text-orange-950 dark:text-orange-100'
    return
  }
  if (status === 'tight') {
    warningEl.textContent = 'Tight travel time'
    warningEl.className =
      'mt-0.5 truncate text-[10px] font-medium leading-tight text-amber-950 dark:text-amber-100'
    return
  }
  warningEl.textContent = ''
  warningEl.className = 'mt-0.5 hidden truncate text-[10px] font-medium leading-tight'
}

export function highlightScheduleJobsDropTargetRow(rowKey: string | null): void {
  if (dropTargetRowEl) {
    dropTargetRowEl.removeAttribute(DROP_TARGET_ATTR)
    dropTargetRowEl = null
  }
  if (!rowKey) return
  const row = document.querySelector<HTMLElement>(`[data-schedule-row-id="${rowKey}"]`)
  if (!row) return
  row.setAttribute(DROP_TARGET_ATTR, '')
  dropTargetRowEl = row
}

export function markScheduleJobDragSource(element: HTMLElement | null, dragging: boolean): void {
  if (!element) return
  element.classList.toggle('opacity-25', dragging)
  element.classList.toggle('pointer-events-none', dragging)
}

export function unmountScheduleJobsDragPreview(): void {
  if (rootEl) rootEl.style.display = 'none'
  highlightScheduleJobsDropTargetRow(null)
  lastTravelStatus = null
}
