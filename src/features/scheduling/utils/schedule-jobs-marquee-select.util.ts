export type ClientRect = {
  left: number
  top: number
  right: number
  bottom: number
}

export function normalizeClientRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): ClientRect {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  }
}

export function rectsIntersect(a: ClientRect, b: ClientRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function collectJobIdsInMarqueeRect(root: ParentNode, rect: ClientRect): string[] {
  const nodes = root.querySelectorAll<HTMLElement>('[data-schedule-job-block]')
  const ids: string[] = []
  nodes.forEach((node) => {
    const jobId = node.dataset.jobId
    if (!jobId) return
    const box = node.getBoundingClientRect()
    if (
      rectsIntersect(rect, {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
      })
    ) {
      ids.push(jobId)
    }
  })
  return [...new Set(ids)]
}

export function isMarqueePointerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('[data-schedule-job-block]')) return false
  if (target.closest('[data-schedule-carer-label]')) return false
  if (target.closest('[data-schedule-timeline-header]')) return false
  if (target.closest('[data-schedule-jobs-legend]')) return false
  if (target.closest('[data-schedule-run-legend]')) return false
  return Boolean(target.closest('[data-schedule-jobs-board]'))
}
