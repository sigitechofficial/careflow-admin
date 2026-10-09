import * as React from 'react'
import { Loader2, UserCheck } from 'lucide-react'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { cn } from '@/shared/lib/utils'
import { useSurveyRecipients } from '@/features/surveys/hooks/useSurveys'
import {
  SURVEY_RESPONDENT_RELATION_LABELS,
  type SurveyRecipientStatus,
  type SurveyTargetKind,
} from '@/features/surveys/types'

const STATUS_LABEL: Record<SurveyRecipientStatus, string> = {
  PENDING: 'Not sent',
  SENT: 'Not started',
  STARTED: 'Opened',
  COMPLETED: 'Completed',
}

const STATUS_TONE: Record<SurveyRecipientStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  SENT: 'bg-muted text-muted-foreground',
  STARTED: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  COMPLETED: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
}

type Filter = 'all' | 'pending' | 'completed'

/** Who the survey was sent to and whether each person has completed it. */
export function SurveyRecipientsPanel({
  surveyId,
  targetKind,
  className,
}: {
  surveyId: string
  targetKind: SurveyTargetKind
  className?: string
}) {
  const { data = [], isLoading } = useSurveyRecipients(surveyId)
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const [filter, setFilter] = React.useState<Filter>('all')
  const formatInstant = (iso: string | null) => {
    const day = iso ? dayKeyFromInstant(iso) : ''
    return iso && day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }

  // Shared-link and anonymous answers have no named person — counted separately, not listed.
  const named = data.filter(r => r.employeeId || r.serviceUserId)
  const sharedLinkCount = data.length - named.length
  const completedCount = named.filter(r => r.status === 'COMPLETED').length
  const rows = named.filter(r =>
    filter === 'all' ? true : filter === 'completed' ? r.status === 'COMPLETED' : r.status !== 'COMPLETED',
  )
  const forServiceUsers = targetKind === 'SERVICE_USER'

  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            Recipients
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {completedCount} of {named.length} completed
            {sharedLinkCount > 0 ? ` · ${sharedLinkCount} answered without a name (shared link or anonymous)` : ''}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 text-xs">
          {(
            [
              ['all', 'All'],
              ['pending', 'Not completed'],
              ['completed', 'Completed'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                filter === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading recipients…
        </div>
      ) : named.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          Not sent to anyone yet. Use Send or schedule on the survey page.
        </p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No recipients match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{forServiceUsers ? 'Service user' : 'Employee'}</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Sent</th>
                <th className="px-4 py-2">Completed</th>
                {forServiceUsers ? <th className="px-4 py-2">Answered by</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {r.serviceUserName ?? r.employeeName ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONE[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                    {formatInstant(r.sentAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                    {formatInstant(r.submittedAt)}
                  </td>
                  {forServiceUsers ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.respondentRelation
                        ? `${SURVEY_RESPONDENT_RELATION_LABELS[r.respondentRelation]}${
                            r.respondentName ? ` (${r.respondentName})` : ''
                          }`
                        : '—'}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
