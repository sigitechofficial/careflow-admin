import { formatDisplayTimeHm } from '@/shared/lib/display-format.util'
import type { TimeDisplayFormat } from '@/shared/lib/display-format.util'

/** HH:mm or HH:mm:ss → organisation time display (wall clock already in org TZ). */
export function formatReconClock(
  value: string | null | undefined,
  timeDisplayFormat: TimeDisplayFormat,
): string {
  const raw = value?.trim()
  if (!raw || raw === '—') return '—'
  if (raw === '00:00:00') return formatDisplayTimeHm('00:00', timeDisplayFormat)

  const range = /^(\d{1,2}:\d{2})(?::\d{2})?\s*[–-]\s*(\d{1,2}:\d{2})(?::\d{2})?$/.exec(raw)
  if (range) {
    return `${formatDisplayTimeHm(range[1]!, timeDisplayFormat)}–${formatDisplayTimeHm(range[2]!, timeDisplayFormat)}`
  }

  const single = /^(\d{1,2}:\d{2})(?::\d{2})?$/.exec(raw)
  if (single) return formatDisplayTimeHm(single[1]!, timeDisplayFormat)
  return raw
}
