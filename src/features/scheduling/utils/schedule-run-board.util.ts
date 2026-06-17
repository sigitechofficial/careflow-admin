import type { ScheduleRunBrief, TimelineJob } from '@/features/scheduling/types/scheduling.types'

export function scheduleRunAccentColor(runId: string): { border: string; bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < runId.length; i += 1) hash = runId.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return {
    border: `hsl(${hue} 55% 42%)`,
    bg: `hsl(${hue} 55% 94%)`,
    text: `hsl(${hue} 50% 28%)`,
  }
}

export function scheduleRunJobLabel(job: TimelineJob): string | null {
  if (!job.scheduleRun) return null
  const seq = job.runSequence != null ? `${job.runSequence}. ` : ''
  return `${seq}${job.scheduleRun.name}`
}

export function scheduleRunJobShortLabel(job: TimelineJob): string | null {
  if (!job.scheduleRun) return null
  if (job.runSequence != null) return String(job.runSequence)
  return '·'
}
