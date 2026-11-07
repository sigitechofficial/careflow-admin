import * as React from 'react'
import { EyeOff, Loader2, UserCheck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useSurveyRecipients } from '@/features/surveys/hooks/useSurveys'
import {
  SURVEY_RESPONDENT_RELATION_LABELS,
  type SurveyRecipientStatus,
  type SurveyTargetKind,
} from '@/features/surveys/types'
import { formatSurveyDate, formatSurveyDateTime } from '@/features/surveys/survey-datetime'
import { RemindOneButton } from '@/features/surveys/reminders/RemindOneButton'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { LinksCopiedHistory, PersonalLinkRowActions, PersonalLinksToolbar, type PersonalLinksContext } from '@/features/surveys/sharing/SurveyPersonalLinks'

const STATUS_LABEL: Record<SurveyRecipientStatus, string> = {
  PENDING: 'Not sent',
  SENT: 'Not started',
  STARTED: 'Opened',
  COMPLETED: 'Completed',
  LAPSED: 'No longer sent',
}

const STATUS_TONE: Record<SurveyRecipientStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  SENT: 'bg-muted text-muted-foreground',
  STARTED: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  COMPLETED: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  LAPSED: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
}

type Filter = 'all' | 'pending' | 'completed'

/**
 * Who the survey was sent to and whether each person has completed it. Anonymous surveys show
 * status counts only — never names, and never times that could be matched to an answer.
 */
export function SurveyRecipientsPanel({
  surveyId,
  targetKind,
  className,
  personalLinks,
}: {
  surveyId: string
  targetKind: SurveyTargetKind
  className?: string
  /** Managers, named survey open for answers: copy people's own links (null = not offered). */
  personalLinks?: PersonalLinksContext | null
}) {
  const { data, isLoading } = useSurveyRecipients(surveyId)
  const [filter, setFilter] = React.useState<Filter>('all')
  const forServiceUsers = targetKind === 'SERVICE_USER'
  const forPublic = targetKind === 'PUBLIC'
  const counts = data?.counts ?? { total: 0, notStarted: 0, opened: 0, completed: 0 }
  const countsOnly = Boolean(data?.isAnonymous || data?.byPeriod || data?.recipientsRestricted)
  // Never on an anonymous survey (the API refuses too), nor for totals only.
  const links = personalLinks && !data?.isAnonymous && !countsOnly && counts.total > 0 ? personalLinks : null
  const rows = (data?.recipients ?? []).filter(r =>
    filter === 'all' ? true : filter === 'completed' ? r.status === 'COMPLETED' : r.status !== 'COMPLETED',
  )

  return (
    <section className={cn('rounded-xl border border-border bg-card', className)} data-testid="survey-recipients">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            Recipients
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {counts.completed} of {counts.total} completed
          </p>
        </div>
        {!countsOnly && counts.total > 0 ? (
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
        ) : null}
      </div>

      {links ? <PersonalLinksToolbar ctx={links} canSeeAnswered /> : null}
      {links ? <LinksCopiedHistory surveyId={links.surveyId} /> : null}

      {isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading recipients…
        </div>
      ) : countsOnly ? (
        <div className="space-y-3 p-4">
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['Not started', counts.notStarted],
              ['Opened', counts.opened],
              ['Completed', counts.completed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-muted/40 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            {data?.isAnonymous ? (
              <>
                <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                This survey is anonymous, so only totals are shown — not who has or hasn’t answered, or when.
              </>
            ) : data?.recipientsRestricted ? (
              'Who has answered is limited to the people who may see this survey’s individual responses, so only totals are shown.'
            ) : (
              'Totals across every period. Choose a period above to see who has answered it.'
            )}
          </p>
        </div>
      ) : counts.total === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {forPublic
            ? 'This is a public link survey — responses come in through the shared link and are not tied to named recipients.'
            : 'Not sent to anyone yet. Use Send or schedule on the survey page.'}
        </p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No recipients match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{forServiceUsers ? 'Service user' : forPublic ? 'Person' : 'Employee'}</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Sent</th>
                <th className="px-4 py-2">Completed</th>
                {forServiceUsers ? <th className="px-4 py-2">Answered by</th> : null}
                {links ? <th className="px-4 py-2"><span className="sr-only">Their link</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {r.serviceUserName ?? r.employeeName ?? r.externalName ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONE[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                    {formatSurveyDateTime(r.sentAt)}
                    {r.reminderCount ? (
                      <span className="block text-xs">
                        {r.reminderCount === 1 ? 'Reminded once' : `Reminded ${r.reminderCount} times`}
                        {r.remindedAt ? `, last ${formatSurveyDate(r.remindedAt)}` : ''}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                    {formatSurveyDateTime(r.submittedAt)}
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
                  {links ? (
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {r.status === 'SENT' || r.status === 'STARTED' ? (
                          <RemindOneButton
                            surveyId={links.surveyId}
                            recipientId={r.id}
                            name={r.serviceUserName ?? r.employeeName ?? 'this person'}
                            reminderCount={r.reminderCount ?? 0}
                            remindedAt={r.remindedAt ?? null}
                          />
                        ) : null}
                        {r.status === 'LAPSED' ? (
                          <ResendLapsedButton surveyId={links.surveyId} recipientId={r.id} name={r.serviceUserName ?? r.employeeName ?? 'this person'} />
                        ) : null}
                        <PersonalLinkRowActions
                          ctx={links}
                          recipientId={r.id}
                          name={r.serviceUserName ?? r.employeeName ?? 'this person'}
                          answered={r.status === 'COMPLETED'}
                        />
                      </div>
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

/**
 * A lapsed invitation (the person could no longer be sent it): sent again by staff once they can be (e.g. their
 * care restarted). Named surveys only; the API checks they can be sent it now.
 */
function ResendLapsedButton({ surveyId, recipientId, name }: { surveyId: string; recipientId: string; name: string }) {
  const qc = useQueryClient()
  // Outside people on a survey about someone who has died: sent again only with a reason (asked for when needed).
  const [askReason, setAskReason] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const resend = useMutation({
    mutationFn: (why?: string) =>
      apiJson(`/surveys/${surveyId}/recipients/${recipientId}/resend`, { method: 'POST', ...(why ? { body: JSON.stringify({ reason: why }) } : {}) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['surveys'] }),
  })
  const go = (why?: string) =>
    void resend.mutateAsync(why).then(
      () => {
        setAskReason(false)
        toastSuccess('Sent again')
      },
      e => {
        if (!why && /has died\. Say why/i.test(e instanceof Error ? e.message : String(e))) setAskReason(true)
        else toastApiError(e, 'Could not send it again')
      },
    )
  if (askReason) {
    return (
      <span className="flex items-center gap-2">
        <Input
          value={reason}
          maxLength={300}
          onChange={e => setReason(e.target.value)}
          placeholder="Why ask them now (kept in the audit trail)"
          aria-label={`Why send it again to ${name} now that the person has died`}
          className="h-8 w-56"
        />
        <Button type="button" size="sm" variant="outline" disabled={resend.isPending || reason.trim().length < 5} onClick={() => go(reason.trim())}>
          Send again
        </Button>
      </span>
    )
  }
  return (
    <Button type="button" size="sm" variant="ghost" disabled={resend.isPending} aria-label={`Send it again to ${name}`} onClick={() => go()}>
      Send again
    </Button>
  )
}
