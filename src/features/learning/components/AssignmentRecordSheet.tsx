import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Award, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, Loader2, Play, RotateCcw, UserCheck, XCircle } from 'lucide-react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { formatOrganisationDate, formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { useApplicablePolicies } from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import {
  useExtendLearningAssignment,
  useLearningAssignmentRecord,
  useLearningReviewOptions,
  useAssignLearningAgain,
  useRecordLearningAssignmentReview,
  useRecordLearningOutcome,
  useMarkLearningLessons,
  useStartLearningAssignment,
} from '@/features/learning/hooks/useLearning'
import type { LearningAssignmentRecord } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { CertificateViewDialog } from '@/features/learning/components/CertificateViewDialog'
import { PracticalSignoffCard } from '@/features/learning/components/PracticalSignoffCard'

type Props = { assignmentId: string | null; onOpenChange: (open: boolean) => void }
type Mode = 'extend' | 'reason' | 'not-completed' | null

/** Policy for overdue training: linked in Policies to Training › section "overdue-actions". */
const POLICY_CONTEXT = { moduleType: 'TRAINING', scope: 'SECTION', sectionKey: 'overdue-actions' } as const
const OUTCOME_POLICY_CONTEXT = { moduleType: 'TRAINING', scope: 'SECTION', sectionKey: 'outcomes' } as const

const err = (e: unknown, fallback: string) => toastApiError(e instanceof ApiError ? e : new Error(fallback))
const when = (iso?: string | null) => (iso ? formatOrganisationDateTime(iso) : '—')
const minutes = (s?: number | null) => (s == null ? '' : s < 60 ? `${s}s` : `${Math.round(s / 60)} min`)

/** Plain tags for assignment statuses (17 Nov 2026): Scheduled, In progress, Passed, Not passed, Incomplete. */
const ASSIGNMENT_TAG: Record<string, string> = {
  ASSIGNED: 'SCHEDULED',
  NOT_STARTED: 'SCHEDULED',
  COMPLETED: 'PASSED',
  PASSED: 'PASSED',
  FAILED: 'NOT_PASSED',
  EXPIRED: 'INCOMPLETE',
}
export function assignmentStatusForBadge(status: string) {
  return ASSIGNMENT_TAG[status] ?? status
}

/** One assignment: everything recorded, plus the overdue / late review (16 Nov 2026). */
export function AssignmentRecordSheet({ assignmentId, onOpenChange }: Props) {
  const canManage = useAuthStore(s => s.can('learning.assignments.manage'))
  const recordQuery = useLearningAssignmentRecord(assignmentId)
  const r = recordQuery.data
  const [certOpen, setCertOpen] = React.useState(false)

  return (
    <Sheet open={!!assignmentId} onOpenChange={onOpenChange}>
      <SheetContent size="xl" data-testid="assignment-record-sheet">
        <SheetHeader>
          <SheetTitle>{r ? `${r.employeeName ?? 'Carer'} · ${r.course.title}` : 'Assignment'}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {recordQuery.isLoading || !r ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Summary r={r} />
              {canManage && r.practical ? (
                <PracticalSignoffCard r={r} onChanged={() => void recordQuery.refetch()} />
              ) : canManage && r.needsOutcome ? (
                <Outcome r={r} onChanged={() => void recordQuery.refetch()} />
              ) : null}
              {canManage && (r.status === 'FAILED' || r.status === 'EXPIRED') ? (
                <AssignAgain r={r} onChanged={() => void recordQuery.refetch()} />
              ) : null}
              {canManage && (r.status === 'OVERDUE' || r.completedLate || r.reviews.length > 0) ? (
                <Review r={r} onChanged={() => void recordQuery.refetch()} />
              ) : null}
              <Lessons r={r} canManage={canManage} onChanged={() => void recordQuery.refetch()} />
              <Quizzes r={r} />
              {r.sessions.length ? <Sessions r={r} /> : null}
              <section>
                <h3 className="mb-2 text-sm font-semibold">Certificate</h3>
                {r.certificate ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <p className="text-sm">
                      {r.certificate.certificateNumber} · issued {formatOrganisationDate(r.certificate.issuedAt)}
                      {r.certificate.expiresAt ? ` · expires ${formatOrganisationDate(r.certificate.expiresAt)}` : ''}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setCertOpen(true)} data-testid="view-certificate">
                      <Award className="mr-1 h-4 w-4" /> View certificate
                    </Button>
                    <CertificateViewDialog
                      open={certOpen}
                      onOpenChange={setCertOpen}
                      certificate={{ id: r.certificate.id, assignmentId: r.id }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not issued</p>
                )}
              </section>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function Summary({ r }: { r: LearningAssignmentRecord }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <LearningStatusBadge status={assignmentStatusForBadge(r.status)} size="sm" />
        {r.status === 'OVERDUE' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">
            <AlertTriangle className="h-3 w-3" /> Overdue · carer can still finish (late)
          </span>
        ) : null}
        {r.completedLate ? (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Completed late
          </span>
        ) : null}
        <span className="font-mono text-xs text-muted-foreground">{r.course.code}</span>
      </div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <span>Assigned: {when(r.assignedAt)}{r.assignedByName ? ` by ${r.assignedByName}` : ''}</span>
        <span>Due: {when(r.dueAt)}</span>
        <span>Started: {when(r.startedAt)}</span>
        <span>Completed: {when(r.completedAt)}</span>
        <span>Last opened: {when(r.lastAccessedAt)}</span>
        <span>Lessons: {Math.round(r.progressPercentage)}%</span>
      </div>
      {r.source?.type === 'Incident' ? (
        <Link
          to="/incidents/$incidentId"
          params={{ incidentId: r.source.id }}
          search={{ tab: 'actions' } as never}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 hover:underline dark:bg-amber-950/40 dark:text-amber-200"
          data-testid="assignment-source-incident"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          From incident {r.source.reference ?? ''}
        </Link>
      ) : null}
      {r.assignmentReason ? <p className="mt-2 text-xs text-muted-foreground">Reason: {r.assignmentReason}</p> : null}
    </div>
  )
}

const OPEN_STATUSES = ['ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS', 'AWAITING_ASSESSMENT', 'AWAITING_APPROVAL', 'OVERDUE']

/** Lessons; for face to face the office starts the course and marks lessons done (16 Nov 2026). */
function Lessons({ r, canManage, onChanged }: { r: LearningAssignmentRecord; canManage: boolean; onChanged: () => void }) {
  const start = useStartLearningAssignment()
  const mark = useMarkLearningLessons()
  const byTrainer = !!r.lessonsMarkedByTrainer && canManage && OPEN_STATUSES.includes(r.status)
  const notStarted = r.status === 'ASSIGNED' || r.status === 'NOT_STARTED'
  const left = r.lessons.filter(l => l.isRequired && !l.completedAt).length
  const [busy, setBusy] = React.useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toastSuccess(ok)
      onChanged()
    } catch (e) {
      err(e, 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section data-testid="assignment-lessons">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Lessons{r.lessonsMarkedByTrainer ? <span className="ml-1 font-normal text-muted-foreground">· marked by the trainer</span> : null}
        </h3>
        {byTrainer ? (
          <div className="flex flex-wrap gap-2">
            {notStarted ? (
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void run('start', () => start.mutateAsync(r.id), 'Course started')}>
                {busy === 'start' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                Start course
              </Button>
            ) : null}
            {left > 0 ? (
              <Button size="sm" disabled={!!busy} onClick={() => void run('all', () => mark.mutateAsync({ id: r.id, body: { done: true } }), 'All lessons marked done')}>
                {busy === 'all' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-1 h-4 w-4" />}
                Mark all lessons done
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {r.lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lessons in this course.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {r.lessons.map(l => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0">
                <span className="text-muted-foreground">{l.moduleTitle} · </span>
                {l.title}
                {!l.isRequired ? <span className="ml-1 text-xs text-muted-foreground">(optional)</span> : null}
              </span>
              <span className="flex items-center gap-2">
                <span className={l.completedAt ? 'text-xs' : 'text-xs text-muted-foreground'}>
                  {l.completedAt
                    ? `Done ${when(l.completedAt)}${l.markedByName ? ` · by ${l.markedByName}` : l.timeSpentSeconds ? ` · ${minutes(l.timeSpentSeconds)}` : ''}`
                    : 'Not done'}
                </span>
                {byTrainer ? (
                  <Button
                    size="sm"
                    variant={l.completedAt ? 'ghost' : 'outline'}
                    disabled={!!busy}
                    onClick={() =>
                      void run(
                        l.id,
                        () => mark.mutateAsync({ id: r.id, body: { lessonIds: [l.id], done: !l.completedAt } }),
                        l.completedAt ? 'Lesson marked not done' : 'Lesson marked done',
                      )
                    }
                  >
                    {busy === l.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    {l.completedAt ? 'Undo' : 'Mark done'}
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Quizzes({ r }: { r: LearningAssignmentRecord }) {
  const [openAttempt, setOpenAttempt] = React.useState<string | null>(null)
  if (!r.quizzes.length) return null
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Quizzes</h3>
      <ul className="space-y-2 text-sm">
        {r.quizzes.map(q => (
          <li key={q.id} className="rounded-lg border border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5 font-medium">
              {q.title}
              <span className="text-xs font-normal text-muted-foreground">
                {q.isFinal ? 'Final assessment' : 'Module quiz'} · pass {q.passingScore}%
                {q.maximumAttempts ? ` · ${q.maximumAttempts} tries` : ''}
              </span>
              {!q.isRequired ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Optional</span>
              ) : null}
            </div>
            {q.attempts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not started</p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs">
                {q.attempts.map(t => (
                  <li key={t.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        Try {t.attemptNumber}:{' '}
                        {t.result === 'IN_PROGRESS' ? 'in progress' : `${t.percentage ?? 0}% · ${t.result.toLowerCase()}`} ·{' '}
                        {t.correct} of {t.questions.length} correct · {when(t.submittedAt ?? t.startedAt)}
                      </span>
                      {t.result !== 'IN_PROGRESS' ? (
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => setOpenAttempt(openAttempt === t.id ? null : t.id)}
                          aria-expanded={openAttempt === t.id}
                        >
                          {openAttempt === t.id ? 'Hide answers' : 'View answers'}
                        </button>
                      ) : null}
                    </div>
                    {openAttempt === t.id ? <Answers questions={t.questions} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Each question: the carer's answer, the right answer, right / wrong (16 Nov 2026). */
function Answers({ questions }: { questions: LearningAssignmentRecord['quizzes'][number]['attempts'][number]['questions'] }) {
  return (
    <ol className="mt-2 space-y-2 border-l-2 border-border pl-3">
      {questions.map((q, i) => (
        <li key={q.id}>
          <div className="flex items-start gap-1.5">
            {q.isCorrect ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Right" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-label="Wrong" />
            )}
            <span className="font-medium text-foreground">
              {i + 1}. {q.questionText}
            </span>
          </div>
          {!q.answered ? <p className="ml-5 text-muted-foreground">Not answered</p> : null}
          {q.textAnswer ? <p className="ml-5">Answer: “{q.textAnswer}”</p> : null}
          {q.options.length ? (
            <ul className="ml-5 mt-0.5 space-y-0.5">
              {q.options.map(o => (
                <li
                  key={o.id}
                  className={
                    o.chosen && o.isCorrect
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : o.chosen
                        ? 'text-red-700 dark:text-red-300'
                        : o.isCorrect
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-muted-foreground'
                  }
                >
                  {o.chosen ? '● ' : '○ '}
                  {o.optionText}
                  {o.chosen ? ' (carer’s answer)' : ''}
                  {o.isCorrect ? ' ✓ right answer' : ''}
                </li>
              ))}
            </ul>
          ) : null}
          {q.explanation ? <p className="ml-5 text-muted-foreground">Why: {q.explanation}</p> : null}
        </li>
      ))}
    </ol>
  )
}

function Sessions({ r }: { r: LearningAssignmentRecord }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Sessions</h3>
      <ul className="divide-y divide-border rounded-lg border border-border text-sm">
        {r.sessions.map(s => (
          <li key={s.attendeeId} className="px-3 py-2">
            <div className="font-medium">{s.title}</div>
            <div className="text-xs text-muted-foreground">
              {when(s.startAt)} ·{' '}
              {s.bookingStatus === 'CANCELLED'
                ? `can't attend${s.cantAttendAt ? ` (told ${when(s.cantAttendAt)})` : ''}${s.cantAttendReason ? `: “${s.cantAttendReason}”` : ''}`
                : s.attendanceStatus.replace(/_/g, ' ').toLowerCase()}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Review({ r, onChanged }: { r: LearningAssignmentRecord; onChanged: () => void }) {
  const [mode, setMode] = React.useState<Mode>(null)
  const optionsQuery = useLearningReviewOptions()
  const policiesQuery = useApplicablePolicies({ ...POLICY_CONTEXT })
  const policy = policiesQuery.data?.rows?.[0]
  const policyVersionId = policy?.currentVersionId ?? undefined
  const closed = ['COMPLETED', 'PASSED', 'CANCELLED', 'EXEMPT', 'EXPIRED', 'FAILED'].includes(r.status)

  return (
    <section className="space-y-3 rounded-lg border border-amber-300 p-4 dark:border-amber-800" data-testid="assignment-review">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 text-amber-600" /> Review
      </h3>
      {policy ? (
        <p className="flex flex-wrap items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950/30">
          <BookOpen className="h-4 w-4" aria-hidden />
          Policy: {policy.title}
          <Link to={POLICY_PATHS.detail} params={{ policyId: policy.id }} className="font-medium text-primary hover:underline">
            Open policy
          </Link>
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          No policy linked yet. Link one in Policies (Training › overdue-actions).
          <Link to={POLICY_PATHS.library} className="font-medium text-primary hover:underline">Open policy library</Link>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!closed ? (
          <Button size="sm" variant={mode === 'extend' ? 'default' : 'outline'} onClick={() => setMode(mode === 'extend' ? null : 'extend')}>
            <CalendarClock className="mr-1 h-4 w-4" /> Extend due date
          </Button>
        ) : null}
        {r.status === 'OVERDUE' || r.completedLate ? (
          <Button size="sm" variant={mode === 'reason' ? 'default' : 'outline'} onClick={() => setMode(mode === 'reason' ? null : 'reason')}>
            Take action
          </Button>
        ) : null}
        {r.status === 'OVERDUE' ? (
          <Button size="sm" variant={mode === 'not-completed' ? 'default' : 'outline'} onClick={() => setMode(mode === 'not-completed' ? null : 'not-completed')}>
            Mark as incomplete
          </Button>
        ) : null}
      </div>

      {mode === 'extend' ? (
        <ExtendForm r={r} policyVersionId={policyVersionId} onDone={() => { setMode(null); onChanged() }} />
      ) : null}
      {mode === 'reason' || mode === 'not-completed' ? (
        <ReviewForm
          r={r}
          closing={mode === 'not-completed'}
          policyVersionId={policyVersionId}
          options={optionsQuery.data}
          onDone={() => { setMode(null); onChanged() }}
        />
      ) : null}

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h4>
        {r.reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {r.reviews.map(v => (
              <li key={v.id} className="rounded-md border border-border px-3 py-2">
                <div className="font-medium">
                  {v.kind === 'EXTENDED'
                    ? `Due date extended to ${when(v.newDueAt)}`
                    : v.kind === 'CARER_LATE_REASON'
                      ? 'Carer’s reason (from the app)'
                      : v.kind === 'OUTCOME_PASSED'
                        ? 'Outcome: Passed'
                        : v.kind === 'OUTCOME_PASSED_AFTER_QUIZ'
                          ? 'Outcome: Practical passed, quiz to pass'
                        : v.kind === 'OUTCOME_NOT_PASSED'
                          ? 'Outcome: Not passed'
                          : v.kind === 'ASSIGNED_AGAIN'
                            ? `Course given again, due ${when(v.newDueAt)}`
                      : v.kind === 'NOT_COMPLETED'
                        ? 'Marked as incomplete'
                        : 'Action taken'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[
                    v.reasonLabel ? `Reason: ${v.reasonLabel}` : null,
                    v.actionLabels.length ? `Action: ${v.actionLabels.join(', ')}` : null,
                    v.kind === 'NOT_COMPLETED' && v.newDueAt ? `Re-assigned, due ${when(v.newDueAt)}` : null,
                    v.followUpAt ? `Follow up ${formatOrganisationDate(v.followUpAt)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {v.note ? <p className="mt-1 text-xs">“{v.note}”</p> : null}
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {when(v.createdAt)}{v.createdByName ? ` · by ${v.createdByName}` : ''}
                  {v.policy ? ` · ${v.policy.title} v${v.policy.version}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ExtendForm({
  r,
  policyVersionId,
  onDone,
}: {
  r: LearningAssignmentRecord
  policyVersionId?: string
  onDone: () => void
}) {
  const mut = useExtendLearningAssignment()
  const [dueAt, setDueAt] = React.useState('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const submit = async () => {
    if (!dueAt) return setError('Choose the new due date')
    if (note.trim().length < 3) return setError('Write why the due date is extended')
    setError(null)
    try {
      await mut.mutateAsync({
        id: r.id,
        body: {
          dueAt: orgDatetimeLocalToIso(dueAt) || dueAt,
          note: note.trim(),
          policyVersionId,
        },
      })
      toastSuccess(r.status === 'OVERDUE' ? 'Due date extended. The course is no longer overdue.' : 'Due date extended')
      onDone()
    } catch (e) {
      err(e, 'Could not extend the due date')
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="New due date" required>
          <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Why is it extended?" required>
        <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Off sick 25–29 Nov" />
      </FormField>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button size="sm" onClick={() => void submit()} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
        Save new due date
      </Button>
    </div>
  )
}

function ReviewForm({
  r,
  closing,
  policyVersionId,
  options,
  onDone,
}: {
  r: LearningAssignmentRecord
  closing: boolean
  policyVersionId?: string
  options?: { reasons: Array<{ code: string; label: string }>; actions: Array<{ code: string; label: string; group?: string; formal?: boolean }> }
  onDone: () => void
}) {
  const mut = useRecordLearningAssignmentReview()
  const [actions, setActions] = React.useState<string[]>([])
  const [note, setNote] = React.useState('')
  const [followUpAt, setFollowUpAt] = React.useState('')
  const [reassign, setReassign] = React.useState(false)
  const [reassignDueAt, setReassignDueAt] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const actionList = (options?.actions ?? []).filter(a => a.code !== 'REASSIGN' || closing)
  const groups = [...new Set(actionList.map(a => a.group ?? 'Other'))]
  const formalChosen = actionList.some(a => a.formal && actions.includes(a.code))

  const submit = async () => {
    // The carer gives the reason in the app; the office records the action (16 Nov 2026).
    if (!closing && actions.length === 0) return setError('Choose at least one action')
    if (reassign && !reassignDueAt) return setError('Choose the new due date for the re-assigned course')
    setError(null)
    try {
      const res = await mut.mutateAsync({
        id: r.id,
        body: {
          kind: closing ? 'NOT_COMPLETED' : 'REASON',
          actionCodes: actions.filter(a => a !== 'REASSIGN' || reassign),
          note: note.trim() || undefined,
          followUpAt: followUpAt ? `${followUpAt}T12:00:00.000Z` : undefined,
          reassignDueAt: closing && reassign ? orgDatetimeLocalToIso(reassignDueAt) || reassignDueAt : undefined,
          policyVersionId,
        },
      })
      toastSuccess(
        closing
          ? res.reassignedAssignmentId
            ? 'Marked as incomplete and given again'
            : 'Marked as incomplete'
          : 'Action recorded',
      )
      onDone()
    } catch (e) {
      err(e, 'Could not save')
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="space-y-2">
        <p className="text-sm font-medium">Action taken</p>
        {groups.map(g => (
          <div key={g}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {actionList
                .filter(a => (a.group ?? 'Other') === g)
                .map(a => (
                  <label key={a.code} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={actions.includes(a.code)}
                      onCheckedChange={v => {
                        setActions(prev => (v ? [...prev, a.code] : prev.filter(x => x !== a.code)))
                        if (a.code === 'REASSIGN') setReassign(!!v)
                      }}
                    />
                    {a.label}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
      {formalChosen ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Formal actions need a meeting, the right to be accompanied and a right of appeal (Acas Code). This only records your decision.
        </p>
      ) : null}
      {closing && reassign ? (
        <FormField label="Due date for the re-assigned course" required>
          <Input type="datetime-local" value={reassignDueAt} onChange={e => setReassignDueAt(e.target.value)} />
        </FormField>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Follow-up date (optional)">
          <Input type="date" value={followUpAt} onChange={e => setFollowUpAt(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Note">
        <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
      </FormField>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button size="sm" variant={closing ? 'destructive' : 'default'} onClick={() => void submit()} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
        {closing ? 'Mark as incomplete' : 'Save'}
      </Button>
    </div>
  )
}

type OutcomeChoice = 'PASSED' | 'PASSED_AFTER_QUIZ' | 'NOT_PASSED'

/** Manager's outcome for a face to face / workplace course: 3 options (16 Nov 2026). */
function Outcome({ r, onChanged }: { r: LearningAssignmentRecord; onChanged: () => void }) {
  const mut = useRecordLearningOutcome()
  const policiesQuery = useApplicablePolicies({ ...OUTCOME_POLICY_CONTEXT })
  const policy = policiesQuery.data?.rows?.[0]
  const policyVersionId = policy?.currentVersionId ?? undefined
  const [choice, setChoice] = React.useState<OutcomeChoice | null>(null)
  const [note, setNote] = React.useState('')
  const [failOpen, setFailOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const decided = r.reviews.find(
    v => v.kind === 'OUTCOME_PASSED' || v.kind === 'OUTCOME_PASSED_AFTER_QUIZ' || v.kind === 'OUTCOME_NOT_PASSED',
  )
  const open = !['COMPLETED', 'PASSED', 'CANCELLED', 'EXEMPT', 'EXPIRED', 'FAILED'].includes(r.status)
  const blocked = r.outcomeBlockedReason ?? null

  const save = async (result: OutcomeChoice, extra?: { note?: string; reassignDueAt?: string }) => {
    try {
      const res = await mut.mutateAsync({
        id: r.id,
        body: { result, note: extra?.note ?? (note.trim() || undefined), reassignDueAt: extra?.reassignDueAt, policyVersionId },
      })
      toastSuccess(
        result === 'PASSED'
          ? res.status === 'COMPLETED'
            ? 'Passed. The course is complete and the certificate is issued.'
            : 'Passed. The course completes when the carer finishes the rest.'
          : result === 'PASSED_AFTER_QUIZ'
            ? 'Practical passed. The carer now takes the quiz in the app.'
            : res.reassignedAssignmentId
              ? 'Not passed. The course is given again and the history is kept.'
              : 'Recorded as not passed.',
      )
      setChoice(null)
      setFailOpen(false)
      onChanged()
    } catch (e) {
      err(e, 'Could not save the outcome')
    }
  }

  const options: Array<{ value: OutcomeChoice; label: string; hint: string; show: boolean }> = [
    { value: 'PASSED', label: 'Passed', hint: 'The course is complete and the certificate is issued.', show: true },
    {
      value: 'PASSED_AFTER_QUIZ',
      label: 'Practical passed – quiz to pass',
      hint: 'The carer takes the quiz in the app. The course completes when they pass it.',
      show: !!r.hasRequiredQuiz,
    },
    { value: 'NOT_PASSED', label: 'Not passed', hint: 'Give a reason and give the course again.', show: true },
  ]

  return (
    <section className="space-y-3 rounded-lg border border-sky-300 p-4 dark:border-sky-800" data-testid="assignment-outcome">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <UserCheck className="h-4 w-4 text-sky-600" /> Outcome
      </h3>
      {policy ? (
        <p className="flex flex-wrap items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950/30">
          <BookOpen className="h-4 w-4" aria-hidden />
          Policy: {policy.title}
          <Link to={POLICY_PATHS.detail} params={{ policyId: policy.id }} className="font-medium text-primary hover:underline">
            Open policy
          </Link>
        </p>
      ) : null}
      {decided ? (
        <p className={decided.kind === 'OUTCOME_NOT_PASSED' ? 'text-sm font-medium text-red-700 dark:text-red-300' : 'text-sm font-medium text-emerald-700 dark:text-emerald-300'}>
          {decided.kind === 'OUTCOME_PASSED'
            ? 'Passed'
            : decided.kind === 'OUTCOME_PASSED_AFTER_QUIZ'
              ? 'Practical passed – quiz to pass'
              : 'Not passed'}{' '}
          · {when(decided.createdAt)}
          {decided.createdByName ? ` · by ${decided.createdByName}` : ''}
          {decided.note ? ` · “${decided.note}”` : ''}
          {decided.kind === 'OUTCOME_PASSED_AFTER_QUIZ' && open ? (
            <span className="block text-xs font-normal text-muted-foreground">Waiting for the carer to pass the quiz in the app.</span>
          ) : null}
        </p>
      ) : open ? (
        blocked ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" data-testid="outcome-blocked">
            {blocked}
          </p>
        ) : (
          <>
            <div className="grid gap-2" role="radiogroup" aria-label="Outcome">
              {options.filter(o => o.show).map(o => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={choice === o.value}
                  onClick={() => {
                    setError(null)
                    if (o.value === 'NOT_PASSED') setFailOpen(true)
                    else setChoice(o.value)
                  }}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    choice === o.value
                      ? o.value === 'NOT_PASSED'
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/30'
                        : 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {o.value === 'NOT_PASSED' ? <XCircle className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
            {choice && choice !== 'NOT_PASSED' ? (
              <div className="space-y-3 rounded-md border border-border p-3">
                <FormField label="Note (optional)">
                  <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
                </FormField>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button size="sm" onClick={() => void save(choice)} disabled={mut.isPending}>
                  {mut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Save outcome
                </Button>
              </div>
            ) : null}
          </>
        )
      ) : (
        <p className="text-sm text-muted-foreground">No outcome recorded.</p>
      )}
      <NotPassedDialog
        open={failOpen}
        pending={mut.isPending}
        onOpenChange={setFailOpen}
        onSave={(reason, dueAt) => save('NOT_PASSED', { note: reason, reassignDueAt: dueAt })}
      />
    </section>
  )
}

/** Not passed: reason (required) and give the course again with a new due date (16 Nov 2026). */
function NotPassedDialog({
  open,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (reason: string, dueAt?: string) => Promise<void>
}) {
  const [reason, setReason] = React.useState('')
  const [again, setAgain] = React.useState(true)
  const [dueAt, setDueAt] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (open) {
      setReason('')
      setAgain(true)
      setDueAt('')
      setError(null)
    }
  }, [open])

  const submit = () => {
    if (reason.trim().length < 3) return setError('Write why the carer has not passed')
    if (again && !dueAt) return setError('Choose the due date for the course given again')
    setError(null)
    void onSave(reason.trim(), again ? orgDatetimeLocalToIso(dueAt) || dueAt : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="not-passed-dialog">
        <DialogHeader>
          <DialogTitle>Not passed</DialogTitle>
          <DialogDescription>The reason and this record stay in the course history.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <FormField label="Why has the carer not passed?" required>
            <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} autoFocus />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={again} onCheckedChange={v => setAgain(!!v)} />
            Give the course again
          </label>
          {again ? (
            <FormField label="New due date" required>
              <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
            </FormField>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {again ? 'Save and give again' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Failed or not completed: give the course to the carer again; the old record stays (16 Nov 2026). */
function AssignAgain({ r, onChanged }: { r: LearningAssignmentRecord; onChanged: () => void }) {
  const mut = useAssignLearningAgain()
  const [open, setOpen] = React.useState(false)
  const [dueAt, setDueAt] = React.useState('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const givenAgain = r.reviews.find(v => v.kind === 'ASSIGNED_AGAIN')

  const submit = async () => {
    if (!dueAt) return setError('Choose the due date')
    setError(null)
    try {
      await mut.mutateAsync({ id: r.id, body: { dueAt: orgDatetimeLocalToIso(dueAt) || dueAt, note: note.trim() || undefined } })
      toastSuccess('Course given again. It is in the carer’s To do list.')
      setOpen(false)
      onChanged()
    } catch (e) {
      err(e, 'Could not give the course again')
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4" /> Give the course again
      </h3>
      {givenAgain ? (
        <p className="text-sm text-muted-foreground">Already given again on {when(givenAgain.createdAt)}, due {when(givenAgain.newDueAt)}.</p>
      ) : null}
      {givenAgain ? null : !open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Assign again
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border border-border p-3">
          <FormField label="New due date" required>
            <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </FormField>
          <FormField label="Note (optional)">
            <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="More practice with the hoist first" />
          </FormField>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button size="sm" onClick={() => void submit()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Give again
          </Button>
        </div>
      )}
    </section>
  )
}
