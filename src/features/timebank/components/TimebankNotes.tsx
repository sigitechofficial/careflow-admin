import { Link } from '@tanstack/react-router'
import { PiggyBank } from 'lucide-react'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useJobTimebank, useTimebankBalance } from '@/features/timebank/hooks/useTimebank'
import { formatMinutes } from '@/features/timebank/timebank-format'
import type { TimebankEntryReason } from '@/features/timebank/types'

export const TIMEBANK_ENTRY_REASON_LABEL: Record<TimebankEntryReason, string> = {
  NEW_VISIT: 'Visit over the weekly hours',
  LONGER_VISIT: 'Visit made longer',
  VISIT_CANCELLED: 'Visit cancelled',
  VISIT_REMOVED: 'Visit removed',
  WEEK_NEEDED_LESS: 'Week within its hours',
  NOT_DELIVERED: 'Not delivered in full',
}

export function timebankEntryReasonLabel(reason: string): string {
  return TIMEBANK_ENTRY_REASON_LABEL[reason as TimebankEntryReason] ?? reason
}

/**
 * The service user's timebank next to the weekly hours (DOM Care tab, visit plan). With "Use
 * timebank hours automatically" off it shows only when the bank has hours.
 */
export function TimebankBalanceNote({ serviceUserId }: { serviceUserId: string }) {
  const { data } = useTimebankBalance(serviceUserId)
  if (!data) return null
  if (!data.useTimebank && data.availableMinutes <= 0) return null
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" data-testid="timebank-balance-note">
      <PiggyBank className="h-3.5 w-3.5" aria-hidden />
      <span>
        Timebank: <span className="font-medium text-foreground">{formatMinutes(data.availableMinutes)}</span> available
        {data.reservedMinutes > 0 ? ` (${formatMinutes(data.reservedMinutes)} held by visits)` : ''}
        {data.useTimebank ? ' — used automatically for visits over the weekly hours' : ''}
      </span>
      <Link
        to="/reports/timebank/$serviceUserId"
        params={{ serviceUserId }}
        className="text-primary underline-offset-2 hover:underline"
      >
        View
      </Link>
    </p>
  )
}

/** Visit workspace: hours this visit took from the timebank and gave back. Nothing when none. */
export function JobTimebankNote({ scheduledJobId }: { scheduledJobId: string }) {
  const { data } = useJobTimebank(scheduledJobId)
  if (!data?.entries.length) return null
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs" data-testid="visit-timebank-note">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <PiggyBank className="h-3.5 w-3.5" aria-hidden />
        {data.heldMinutes > 0
          ? `Timebank: this visit holds ${formatMinutes(data.heldMinutes)} from the bank`
          : 'Timebank: this visit holds nothing from the bank now'}
      </p>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        {data.entries.map(e => (
          <li key={e.id}>
            {e.kind === 'RESERVED' ? 'Taken' : 'Given back'} {formatMinutes(e.minutes)} ·{' '}
            {timebankEntryReasonLabel(e.reason)} · {formatOrganisationDateTime(e.createdAt)}
          </li>
        ))}
      </ul>
    </div>
  )
}
