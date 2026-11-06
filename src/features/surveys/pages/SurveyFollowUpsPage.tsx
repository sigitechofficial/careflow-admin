import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  OUTCOME_LABELS,
  RECORD_LABELS,
  RECORD_PAGES,
  useFollowUpOwners,
  useFollowUps,
  useUpdateFollowUp,
  type AlertOutcomeKind,
  type FollowUpView,
  type SurveyFollowUp,
} from '@/features/surveys/alerts/survey-alerts'

const VIEWS: Array<{ value: FollowUpView; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'contact', label: 'Asked to be contacted' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
]

const STATUS_LABEL: Record<SurveyFollowUp['status'], string> = {
  OPEN: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
  NO_ROLE: 'No role yet',
}

const fieldClass =
  'mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/**
 * Survey follow-ups: every alert raised from survey answers and every contact-me request, with
 * owner, due date, outcome and any record started from it. `?alert=` opens one (task links).
 */
export default function SurveyFollowUpsPage() {
  const search = useSearch({ strict: false }) as { alert?: string; view?: FollowUpView; surveyId?: string }
  const navigate = useNavigate()
  const view: FollowUpView = search.view ?? 'open'
  const { data, isLoading, isError } = useFollowUps(view, search.surveyId)
  const single = useFollowUps('all', undefined, search.alert)
  const [openId, setOpenId] = React.useState<string | null>(search.alert ?? null)
  const { formatDate } = useOrganisationDisplayFormat()

  React.useEffect(() => {
    if (search.alert) setOpenId(search.alert)
  }, [search.alert])

  const items = data?.items ?? []
  const openItem = items.find(i => i.id === openId) ?? single.data?.items.find(i => i.id === openId) ?? null

  const setView = (v: FollowUpView) =>
    void navigate({ to: '/surveys/follow-ups', search: { view: v, ...(search.surveyId ? { surveyId: search.surveyId } : {}) } })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link to="/surveys" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Surveys
      </Link>
      <h1 className="text-xl font-semibold text-foreground">Survey follow-ups</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Answers that need action and people who asked to be contacted. Each one is a task for a role, due by the
        timescale in the survey’s alerts. Answers given without a name are grouped and never say who gave them.
      </p>

      {/* Filters, so toggle buttons (aria-pressed), not tabs: tabs promise arrow keys and a tab panel. */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Which follow-ups">
        {VIEWS.map(v => {
          const count =
            v.value === 'open' ? data?.counts.open : v.value === 'overdue' ? data?.counts.overdue : v.value === 'contact' ? data?.counts.contact : undefined
          return (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                view === v.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted',
              )}
              onClick={() => setView(v.value)}
            >
              {v.label}
              {count !== undefined ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      <div className="mt-4" aria-busy={isLoading}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-destructive" role="alert">
            Follow-ups could not be loaded.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing here.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card" data-testid="follow-up-list">
            {items.map(item => (
              <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.urgent ? <Badge variant="destructive">Urgent</Badge> : null}
                    {item.contactRequest ? <Badge variant="outline">Asked to be contacted</Badge> : null}
                    {item.unlinked ? <Badge variant="outline">{item.matchCount} answers, no names</Badge> : null}
                    <Badge variant={item.status === 'DONE' ? 'success' : item.status === 'NO_ROLE' ? 'warning' : 'outline'}>
                      {STATUS_LABEL[item.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        'font-medium',
                        item.dueState === 'overdue' ? 'text-destructive' : item.dueState === 'today' ? 'text-warning' : undefined,
                      )}
                    >
                      {item.dueState === 'overdue'
                        ? `Overdue · was due ${formatDate(item.dueDate)}`
                        : item.dueState === 'today'
                          ? 'Due today'
                          : item.status === 'DONE'
                            ? `Was due ${formatDate(item.dueDate)}`
                            : `Due ${formatDate(item.dueDate)}`}
                    </span>
                    <span>· {item.survey.title}{item.survey.periodKey ? ` (${item.survey.periodKey})` : ''}</span>
                    <span>· {item.role?.name ?? 'No role'}</span>
                    {item.owner ? <span>· Owner: {item.owner.name}</span> : null}
                    {item.outcomeKind ? <span>· {OUTCOME_LABELS[item.outcomeKind]}</span> : null}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(item.id)}>
                  {item.canAct ? 'Open' : 'View'}
                  <span className="sr-only">: {item.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openItem ? <FollowUpDialog item={openItem} onClose={() => setOpenId(null)} /> : null}
    </div>
  )
}

function FollowUpDialog({ item, onClose }: { item: SurveyFollowUp; onClose: () => void }) {
  const update = useUpdateFollowUp()
  const owners = useFollowUpOwners(item.canAct && item.role ? item.id : undefined)
  const { formatDate } = useOrganisationDisplayFormat()
  const [ownerUserId, setOwnerUserId] = React.useState(item.owner?.id ?? '')
  const [outcomeKind, setOutcomeKind] = React.useState<AlertOutcomeKind | ''>(item.outcomeKind ?? '')
  const [outcome, setOutcome] = React.useState(item.outcome ?? '')
  const [reference, setReference] = React.useState(item.linkedRecord?.reference ?? '')
  const id = React.useId()
  const done = item.status === 'DONE'

  const save = async (status?: 'OPEN' | 'IN_PROGRESS' | 'DONE') => {
    try {
      await update.mutateAsync({
        id: item.id,
        input: {
          ...(status ? { status } : {}),
          ownerUserId: ownerUserId || null,
          outcomeKind: outcomeKind || null,
          outcome: outcome.trim() || null,
          linkedReference: reference.trim() || null,
        },
      })
      toastSuccess(status === 'DONE' ? 'Follow-up done' : status === 'OPEN' ? 'Follow-up reopened' : 'Follow-up saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save the follow-up')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            {item.survey.title} · raised {formatDate(item.raisedOn)} · due {formatDate(item.dueDate)} ·{' '}
            {item.role?.name ?? 'no role yet'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {item.unlinked ? (
            <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
              These answers are not linked to anyone. Do not try to find out who gave them: act on what they tell you
              about the service, and read the written answers in the survey results.
            </p>
          ) : null}
          <pre className="whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 font-sans text-sm text-foreground">{item.details}</pre>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              to="/surveys/$surveyId/responses"
              params={{ surveyId: item.survey.id }}
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              Survey results <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {item.person?.kind === 'SERVICE_USER' ? (
              <Link
                to="/service-users/$serviceUserId"
                params={{ serviceUserId: item.person.id }}
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
              >
                {item.person.name ?? 'Person'}’s record <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>

          {item.canAct ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground" htmlFor={`${id}-owner`}>
                    Owner
                  </label>
                  <select
                    id={`${id}-owner`}
                    className={fieldClass}
                    value={ownerUserId}
                    onChange={e => setOwnerUserId(e.target.value)}
                    disabled={!item.role}
                  >
                    <option value="">Anyone in {item.role?.name ?? 'the role'}</option>
                    {(owners.data ?? []).map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground" htmlFor={`${id}-outcome-kind`}>
                    What happened
                  </label>
                  <select
                    id={`${id}-outcome-kind`}
                    className={fieldClass}
                    value={outcomeKind}
                    onChange={e => setOutcomeKind(e.target.value as AlertOutcomeKind | '')}
                  >
                    <option value="">Not yet</option>
                    {(Object.keys(OUTCOME_LABELS) as AlertOutcomeKind[]).map(k => (
                      <option key={k} value={k}>
                        {OUTCOME_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground" htmlFor={`${id}-outcome`}>
                  Outcome notes
                </label>
                <textarea
                  id={`${id}-outcome`}
                  rows={3}
                  maxLength={4000}
                  className={fieldClass}
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  placeholder="What was agreed or done"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground" htmlFor={`${id}-ref`}>
                  Linked record (reference)
                </label>
                <input
                  id={`${id}-ref`}
                  className={fieldClass}
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. CMP-2026-0004"
                  aria-describedby={`${id}-ref-hint`}
                />
                <p id={`${id}-ref-hint`} className="mt-0.5 text-xs text-muted-foreground">
                  {item.recordKind ? `This alert may need a ${RECORD_LABELS[item.recordKind].toLowerCase()}. ` : ''}
                  Start it in its own area, then type its reference here.{' '}
                  {item.recordKind ? (
                    <a
                      href={RECORD_PAGES[item.recordKind]}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Open {RECORD_LABELS[item.recordKind].toLowerCase()}s (new tab)
                    </a>
                  ) : null}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-1 text-sm">
              {item.owner ? <p>Owner: {item.owner.name}</p> : null}
              {item.outcomeKind ? <p>What happened: {OUTCOME_LABELS[item.outcomeKind]}</p> : null}
              {item.outcome ? <p>Outcome: {item.outcome}</p> : null}
              {item.linkedRecord?.reference ? <p>Linked record: {item.linkedRecord.reference}</p> : null}
            </div>
          )}
          {done ? (
            <p className="text-xs text-muted-foreground">
              Done{item.completedByName ? ` by ${item.completedByName}` : ''}
              {item.taskNote && item.taskNote !== item.outcome ? ` — ${item.taskNote}` : ''}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {item.canAct ? (
            <>
              <Button type="button" variant="outline" disabled={update.isPending} onClick={() => void save()}>
                Save
              </Button>
              {done ? (
                <Button type="button" variant="outline" disabled={update.isPending} onClick={() => void save('OPEN')}>
                  Reopen
                </Button>
              ) : item.status !== 'NO_ROLE' ? (
                <Button type="button" disabled={update.isPending} onClick={() => void save('DONE')}>
                  Mark done
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
