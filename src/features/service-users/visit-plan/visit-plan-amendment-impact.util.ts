import { formatDate } from '@/shared/lib/utils'
import { VISIT_PLAN_DAY_LABELS, type AmendmentImpactAction } from '@/features/service-users/visit-plan/types'

const hm = (time?: string) => (time ? time.slice(0, 5) : '')

function upcoming(count: number | undefined, verb: string) {
  if (count == null) return ''
  if (count === 0) return ' — no upcoming visits on the rota'
  return ` — ${count} upcoming visit${count === 1 ? '' : 's'} will be ${verb}`
}

/** One amendment change in plain words, e.g. "Morning 07:00 visit removed — 4 upcoming visits will be cancelled". */
export function describeAmendmentImpactAction(action: AmendmentImpactAction): string {
  const visit = `${action.slotLabel}${action.startTime ? ` ${hm(action.startTime)}` : ''} visit`
  switch (action.type) {
    case 'cancel_slot_disabled':
      return `${visit} removed${upcoming(action.jobCount, 'cancelled')}`
    case 'cancel_weekdays_removed': {
      const days = (action.removedWeekdays ?? []).map((d) => VISIT_PLAN_DAY_LABELS[d] ?? String(d)).join(', ')
      return `${visit} no longer on ${days}${upcoming(action.jobCount, 'cancelled')}`
    }
    case 'reschedule_time': {
      const from = action.startTime ? `${hm(action.startTime)}–${hm(action.endTime)}` : ''
      const to = `${hm(action.newStartTime)}–${hm(action.newEndTime)}`
      return `${action.slotLabel} visit time changed${from ? ` from ${from}` : ''} to ${to}${upcoming(action.jobCount, 'moved')}`
    }
    case 'skip_exception':
      return `${visit} cancelled on ${formatDate(action.exceptionDate)}${upcoming(action.jobCount, 'cancelled')}`
    case 'extra_exception':
      return `Extra ${action.slotLabel} visit on ${formatDate(action.exceptionDate)}`
    default:
      return `${action.slotLabel}: ${action.type.replace(/_/g, ' ')}${action.jobCount != null ? ` (${action.jobCount})` : ''}`
  }
}
