import type { ClientRect } from '@/features/scheduling/utils/schedule-jobs-marquee-select.util'

type Props = {
  rect: ClientRect | null
}

export function ScheduleJobsMarqueeOverlay({ rect }: Props) {
  if (!rect) return null

  const width = rect.right - rect.left
  const height = rect.bottom - rect.top

  return (
    <div
      className="pointer-events-none fixed z-[60] rounded-sm border-2 border-primary bg-primary/15"
      style={{
        left: rect.left,
        top: rect.top,
        width,
        height,
      }}
      aria-hidden
    />
  )
}
