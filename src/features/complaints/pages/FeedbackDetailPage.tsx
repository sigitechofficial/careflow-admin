import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Check, Heart, MessageSquareWarning, PenLine, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import {
  useAddFeedbackNote,
  useDeleteFeedback,
  useFeedback,
} from '@/features/complaints/hooks/useComplaints'
import type { FeedbackAction, FeedbackDetail, FeedbackEvent, FeedbackStatus } from '@/features/complaints/types'
import {
  COMPLAINT_OUTCOME_LABEL,
  COMPLAINT_SEVERITY_LABEL,
  FEEDBACK_CHANNEL_LABEL,
  FEEDBACK_EVENT_LABEL,
  FEEDBACK_FROM_LABEL,
  FEEDBACK_STATUS_LABEL,
  feedbackStatusVariant,
  severityVariant,
} from '@/features/complaints/feedback-labels'
import { FeedbackFormDialog, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FEEDBACK_ACTION_LABEL, FeedbackActionDialog } from '@/features/complaints/components/FeedbackActionDialog'
import { FeedbackInvestigationCard } from '@/features/complaints/components/FeedbackInvestigationCard'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

const COMPLAINT_STEPS: FeedbackStatus[] = ['RECEIVED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESPONDED', 'CLOSED']

/** Same rules as the server (feedback-workflow.util): which buttons to show. */
function availableActions(r: FeedbackDetail): FeedbackAction[] {
  if (r.type === 'COMPLIMENT') return r.status === 'CLOSED' ? ['REOPEN'] : ['SHARE', 'CLOSE']
  switch (r.status) {
    case 'RECEIVED':
      return ['ACKNOWLEDGE', 'START_INVESTIGATION', 'RESPOND', 'CLOSE']
    case 'ACKNOWLEDGED':
      return ['START_INVESTIGATION', 'RESPOND', 'CLOSE']
    case 'INVESTIGATING':
      return ['RESPOND', 'CLOSE']
    case 'RESPONDED':
      return ['CLOSE', 'REOPEN']
    case 'CLOSED':
      return ['REOPEN']
  }
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children || '—'}</dd>
    </div>
  )
}

function EmployeeLink({ person }: { person: { id: string; name: string } }) {
  return (
    <Link to="/hr/employees/$employeeId" params={{ employeeId: person.id }} className="text-primary hover:underline">
      {person.name}
    </Link>
  )
}

/** Runs of investigation changes by the same person show as one entry with a list of what changed. */
type TimelineEntry = FeedbackEvent & { changes: string[] }

function groupTimeline(events: FeedbackEvent[]): TimelineEntry[] {
  const out: TimelineEntry[] = []
  for (const e of events) {
    const prev = out[out.length - 1]
    if (e.action === 'INVESTIGATION_UPDATED' && prev?.action === e.action && prev.userName === e.userName) {
      if (e.note) prev.changes.push(e.note)
      continue
    }
    out.push({ ...e, changes: e.action === 'INVESTIGATION_UPDATED' && e.note ? [e.note] : [] })
  }
  return out
}

/** A small titled group inside a card. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <dl className="space-y-3">{children}</dl>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function FeedbackDetailPage() {
  const { feedbackId } = useParams({ strict: false }) as { feedbackId: string }
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('complaints.manage'))
  const query = useFeedback(feedbackId)
  const noteMutation = useAddFeedbackNote(feedbackId)
  const deleteMutation = useDeleteFeedback(feedbackId)
  const [action, setAction] = React.useState<FeedbackAction | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [note, setNote] = React.useState('')

  const r = query.data
  const backTab = r?.type === 'COMPLIMENT' ? 'compliments' : 'complaints'

  if (query.isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>
  if (!r) {
    return (
      <div className="space-y-2 p-4">
        <p className="text-sm text-destructive">
          {query.error instanceof ApiError ? query.error.message : 'Record not found.'}
        </p>
        <Link to="/incidents/feedback" className="text-sm text-primary hover:underline">
          Back to Complaints & Compliments
        </Link>
      </div>
    )
  }

  const isComplaint = r.type === 'COMPLAINT'
  const actions = canManage ? availableActions(r) : []
  const stepIndex = COMPLAINT_STEPS.indexOf(r.status)

  const onAddNote = async () => {
    if (!note.trim()) return
    try {
      await noteMutation.mutateAsync(note.trim())
      setNote('')
    } catch (e) {
      toastApiError(e, 'Could not add note.')
    }
  }

  const onDelete = async () => {
    const reason = window.prompt(`Why is ${r.referenceNumber} being deleted?`)
    if (!reason?.trim()) return
    try {
      await deleteMutation.mutateAsync(reason.trim())
      toastSuccess('Deleted', `${r.referenceNumber} removed.`)
      void navigate({ to: '/incidents/feedback', search: { tab: backTab } })
    } catch (e) {
      toastApiError(e, 'Delete failed.')
    }
  }

  const fromText =
    r.fromKind === 'ANONYMOUS'
      ? 'Anonymous'
      : (r.fromServiceUser?.name ?? r.fromEmployee?.name ?? r.fromName ?? '—')

  return (
    <div className="flex flex-col gap-4" data-testid="feedback-detail-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/incidents/feedback"
            search={{ tab: backTab }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Complaints & Compliments
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            {isComplaint ? (
              <MessageSquareWarning className="h-5 w-5 text-warning" />
            ) : (
              <Heart className="h-5 w-5 text-success" />
            )}
            {r.referenceNumber} · {r.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5" data-testid="feedback-status">
            <Badge variant={feedbackStatusVariant(r.status)}>
              {!isComplaint && r.status === 'CLOSED'
                ? r.sharedWithStaffAt
                  ? 'Shared with staff'
                  : 'Closed'
                : FEEDBACK_STATUS_LABEL[r.status]}
            </Badge>
            {r.severity ? (
              <Badge variant={severityVariant(r.severity)}>{COMPLAINT_SEVERITY_LABEL[r.severity]} severity</Badge>
            ) : null}
            {r.outcome ? <Badge variant="outline">{COMPLAINT_OUTCOME_LABEL[r.outcome]}</Badge> : null}
            {r.acknowledgeOverdue ? <Badge variant="destructive">Acknowledgement overdue</Badge> : null}
            {r.responseOverdue ? <Badge variant="destructive">Response overdue</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(a => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={a === 'REOPEN' || a === 'CLOSE' ? 'outline' : 'default'}
              onClick={() => setAction(a)}
              data-testid={`feedback-action-${a.toLowerCase()}`}
            >
              {FEEDBACK_ACTION_LABEL[a]}
            </Button>
          ))}
          {canManage ? (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditOpen(true)} data-testid="feedback-edit">
                <PenLine className="mr-1 h-4 w-4" /> Edit
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete()} title="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isComplaint ? (
        <ol
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
          aria-label="Complaint progress"
        >
          {COMPLAINT_STEPS.map((s, i) => {
            const done = i < stepIndex || r.status === 'CLOSED'
            const current = i === stepIndex && r.status !== 'CLOSED'
            return (
              <li key={s} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    done && 'bg-primary text-primary-foreground',
                    current && 'border-2 border-primary text-primary',
                    !done && !current && 'border border-border text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-xs sm:inline',
                    current ? 'font-semibold text-foreground' : done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {FEEDBACK_STATUS_LABEL[s]}
                </span>
                {i < COMPLAINT_STEPS.length - 1 ? (
                  <span className={cn('h-px flex-1', i < stepIndex ? 'bg-primary' : 'bg-border')} />
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={isComplaint ? 'Complaint' : 'Compliment'}>
            <div className="space-y-3 rounded-lg bg-muted/40 p-3">
              <Item label="What happened">
                <p className="whitespace-pre-wrap">{r.details}</p>
              </Item>
              {isComplaint && r.desiredOutcome ? (
                <Item label="What they would like to happen">
                  <p className="whitespace-pre-wrap">{r.desiredOutcome}</p>
                </Item>
              ) : null}
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <Group title="Raised by">
                <Item label="Name">
                  {fromText}
                  <div className="text-xs text-muted-foreground">{FEEDBACK_FROM_LABEL[r.fromKind]}</div>
                </Item>
                <Item label="Contact">{r.fromContact}</Item>
              </Group>
              <Group title="About">
                <Item label="Service user">
                  {r.aboutServiceUser ? (
                    <Link
                      to="/service-users/$serviceUserId/profile"
                      params={{ serviceUserId: r.aboutServiceUser.id }}
                      className="text-primary hover:underline"
                    >
                      {r.aboutServiceUser.name}
                    </Link>
                  ) : null}
                </Item>
                <Item label="Staff">
                  {r.aboutEmployees.map((e, i) => (
                    <React.Fragment key={e.id}>
                      {i > 0 ? ', ' : null}
                      <EmployeeLink person={e} />
                    </React.Fragment>
                  ))}
                </Item>
                <Item label="Branch">{r.location?.name}</Item>
              </Group>
              <Group title="Details">
                <Item label="Received">
                  {formatOrganisationDateTime(r.receivedAt)}
                  <div className="text-xs text-muted-foreground">by {FEEDBACK_CHANNEL_LABEL[r.channel].toLowerCase()}</div>
                </Item>
                <Item label="Category">{r.category}</Item>
                {isComplaint ? (
                  <Item label="Handled by">{r.handler ? <EmployeeLink person={r.handler} /> : null}</Item>
                ) : null}
              </Group>
            </div>
          </Card>

          {isComplaint && (r.status === 'INVESTIGATING' || r.investigation) ? (
            <Card title="Investigation">
              <FeedbackInvestigationCard record={r} canEdit={canManage && r.status === 'INVESTIGATING'} />
            </Card>
          ) : null}

          {isComplaint ? (
            <Card title="Response">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Item label="Acknowledge by">
                  {formatOrganisationDate(r.acknowledgeDueAt)}
                  {r.acknowledgedAt ? (
                    <div className="text-xs text-muted-foreground">
                      Acknowledged {formatOrganisationDateTime(r.acknowledgedAt)}
                    </div>
                  ) : null}
                </Item>
                <Item label="Respond by">
                  {formatOrganisationDate(r.responseDueAt)}
                  {r.respondedAt ? (
                    <div className="text-xs text-muted-foreground">
                      Responded {formatOrganisationDateTime(r.respondedAt)}
                    </div>
                  ) : null}
                </Item>
              </dl>
              <div className="mt-3 space-y-3">
                <Item label="Response sent">
                  {r.responseSummary ? <p className="whitespace-pre-wrap">{r.responseSummary}</p> : null}
                </Item>
                <Item label="Lessons learned / actions taken">
                  {r.lessonsLearned ? <p className="whitespace-pre-wrap">{r.lessonsLearned}</p> : null}
                </Item>
                {r.closedAt ? <Item label="Closed">{formatOrganisationDateTime(r.closedAt)}</Item> : null}
              </div>
            </Card>
          ) : null}
        </div>

        <Card title="Timeline">
          <ol className="space-y-3" data-testid="feedback-timeline">
            {groupTimeline(r.events).map(e => (
              <li key={e.id} className="border-l-2 border-border pl-3">
                <div className="text-sm font-medium text-foreground">{FEEDBACK_EVENT_LABEL[e.action] ?? e.action}</div>
                <div className="text-xs text-muted-foreground">
                  {formatOrganisationDateTime(e.createdAt)}
                  {e.userName ? ` · ${e.userName}` : ''}
                </div>
                {e.changes.length ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-foreground">
                    {e.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : e.note ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{e.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
          {canManage ? (
            <div className="mt-4 space-y-2">
              <textarea
                rows={2}
                className={feedbackTextareaClass}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note (call made, meeting held…)"
                data-testid="feedback-note-input"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!note.trim() || noteMutation.isPending}
                onClick={() => void onAddNote()}
                data-testid="feedback-note-add"
              >
                Add note
              </Button>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">Recorded by {r.recordedByName ?? '—'}</p>
        </Card>
      </div>

      <FeedbackActionDialog record={r} action={action} onOpenChange={open => !open && setAction(null)} />
      <FeedbackFormDialog open={editOpen} onOpenChange={setEditOpen} type={r.type} editing={r} />
    </div>
  )
}
