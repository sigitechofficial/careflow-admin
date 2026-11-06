import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Loader2, Lock, PenLine, Play, Plus, XCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import {
  addSupervisionAction,
  addSupervisionAddendum,
  cancelSupervisionSession,
  employeeName,
  employeeRef,
  personName,
  signSupervisionAttendee,
  signSupervisionSession,
  startSupervisionSession,
  SUPERVISION_FORMAT_LABELS,
  SUPERVISION_OWNER_LABELS,
  updateSupervisionAction,
  updateSupervisionSession,
  type SupervisionActionOwner,
  type SupervisionFormSnapshot,
  type SupervisionSessionDetail,
} from '@/features/supervision/api'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import { isEmptyRichText } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { useOpenSupervisionActions, useSessionMutation, useSupervisionSession } from '@/features/supervision/hooks'
import { SupervisionStatusBadge } from '@/features/supervision/components/SupervisionStatusBadge'
import { SupervisionRichTextEditor, SupervisionRichTextView } from '@/features/supervision/components/SupervisionRichText'
import { DictationTextControl } from '@/shared/ui/dictation'
import { CarerChip } from '@/features/supervision/components/CarerChip'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'
import { ContentCard } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { SignaturePad } from '@/shared/ui/signature-pad'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const TEXTAREA =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'


/** One supervision meeting: the Care Pathway form, agreed actions, signatures and addenda. */
export default function SupervisionSessionPage() {
  const { sessionId } = useParams({ strict: false }) as { sessionId: string }
  const query = useSupervisionSession(sessionId)
  const session = query.data

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!session) {
    return <p className="p-6 text-sm text-destructive">Supervision session not found.</p>
  }
  return <SessionView session={session} />
}

function SessionView({ session }: { session: SupervisionSessionDetail }) {
  const canManage = useAuthStore(s => s.can('supervision.manage'))
  const carers = session.attendees
    .map(a => `${employeeName(a.employee)} (${employeeRef(a.employee)})`)
    .join(', ')
  const firstCarer = session.attendees[0]?.employeeId
  const editable = canManage && session.permissions.canEdit
  const start = useSessionMutation(session.id, () => startSupervisionSession(session.id))
  const cancel = useSessionMutation(session.id, (reason: string) => cancelSupervisionSession(session.id, reason))

  const onCancel = () => {
    const reason = window.prompt('Why is this session cancelled?')
    if (!reason?.trim()) return
    cancel.mutate(reason.trim(), { onError: e => toastApiError(e, 'Could not cancel') })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-5 md:p-6" data-testid="supervision-session-page">
      <PageHeader
        title={`${session.reviewType.name} — ${carers}`}
        description={`${SUPERVISION_FORMAT_LABELS[session.format]} with ${personName(session.supervisor)}`}
        breadcrumb={[
          { label: 'Home', href: '/' },
          ...(firstCarer
            ? [{ label: 'Staff reviews', href: `/employee/${firstCarer}/edit?tab=staff-reviews` }]
            : []),
          { label: 'Supervision session' },
        ]}
      >
          <div className="flex flex-wrap items-center gap-2">
            <SupervisionStatusBadge status={session.status} />
            {canManage && session.status === 'SCHEDULED' ? (
              <Button size="sm" onClick={() => start.mutate(undefined, { onError: e => toastApiError(e, 'Could not start') })}>
                <Play className="mr-1 h-4 w-4" />
                Start session
              </Button>
            ) : null}
            {canManage && session.status !== 'COMPLETED' && session.status !== 'CANCELLED' ? (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <XCircle className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            ) : null}
          </div>
      </PageHeader>

      <ProgressCard session={session} />

      {!session.permissions.canEdit && session.status !== 'CANCELLED' ? (
        <p className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Signed by the supervisor: the record can no longer be edited. Add an addendum below to record a correction.
        </p>
      ) : null}

      <section id="details" className="scroll-mt-20">
        <DetailsCard session={session} editable={editable} />
      </section>
      <PreviousActionsCard session={session} canManage={canManage} />
      <section id="form" className="scroll-mt-20">
        <FormCard session={session} editable={editable} />
      </section>
      <section id="actions" className="scroll-mt-20">
        <ActionsCard session={session} canManage={canManage} />
      </section>
      <section id="sign-off" className="scroll-mt-20">
        <SignOffCard session={session} canManage={canManage} />
      </section>
      <section id="addenda" className="scroll-mt-20">
        <AddendaCard session={session} canManage={canManage} />
      </section>
    </div>
  )
}

const STEPS: Array<{ key: string; label: string }> = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'form', label: 'Form filled in' },
  { key: 'supervisor', label: 'Supervisor signed' },
  { key: 'carers', label: 'Carer signed' },
  { key: 'done', label: 'Completed' },
]

/** The page scrolls inside the app shell, so hash links are not enough; scroll the section into view. */
function jumpTo(hash: string) {
  document.getElementById(hash.replace(/^#/, ''))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function currentStep(s: SupervisionSessionDetail): number {
  if (s.status === 'COMPLETED') return 5
  if (s.status === 'AWAITING_SIGN_OFF') return 3
  if (s.status === 'IN_PROGRESS') return 1
  return 0
}

/**
 * Top-of-page summary: who it is with (with carer IDs), where the session is in its lifecycle,
 * the one thing to do next, counts, and jump links to each part of the page.
 */
function ProgressCard({ session }: { session: SupervisionSessionDetail }) {
  const step = currentStep(session)
  const progress = session.formProgress
  const missing = session.settings.requireFormAnswers ? session.missingRequired : []
  const openActions = session.actions.filter(a => a.status === 'OPEN').length
  const signedCarers = session.attendees.filter(a => a.signedAt).length
  const nextUnsigned = session.attendees.find(a => !a.signedAt)
  const nextDue =
    session.status === 'COMPLETED' && session.reviewType.defaultIntervalDays
      ? new Date(new Date(session.heldAt ?? session.completedAt ?? Date.now()).getTime() + session.reviewType.defaultIntervalDays * 86_400_000)
      : null

  let next: { tone: 'info' | 'warn' | 'done' | 'stop'; text: React.ReactNode; href?: string }
  if (session.status === 'CANCELLED') {
    next = { tone: 'stop', text: `Cancelled ${formatDateTime(session.cancelledAt)}: ${session.cancelReason}` }
  } else if (session.status === 'COMPLETED') {
    next = {
      tone: 'done',
      text: nextDue ? `Completed. Next ${session.reviewType.name.toLowerCase()} due ${formatDate(nextDue.toISOString())}.` : 'Completed.',
    }
  } else if (session.status === 'SCHEDULED') {
    next = { tone: 'info', text: 'Start the session when you meet, then fill in the form together.', href: '#form' }
  } else if (session.status === 'IN_PROGRESS' && missing.length) {
    next = {
      tone: 'warn',
      text: `Answer ${missing.length} required question${missing.length === 1 ? '' : 's'}: ${missing.map(m => m.label).join(', ')}.`,
      href: '#form',
    }
  } else if (session.status === 'IN_PROGRESS') {
    next = {
      tone: 'info',
      text: session.permissions.isSupervisor
        ? 'The form is complete. Agree any actions, then sign as supervisor.'
        : `Waiting for ${personName(session.supervisor)} to sign.`,
      href: '#sign-off',
    }
  } else {
    next = {
      tone: 'info',
      text: nextUnsigned ? `Hand the device to ${employeeName(nextUnsigned.employee)} (${employeeRef(nextUnsigned.employee)}) to read and sign.` : 'Waiting for carer signatures.',
      href: '#sign-off',
    }
  }
  const toneClass = {
    info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200',
    warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
    done: 'border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200',
    stop: 'border-destructive/40 bg-destructive/5 text-destructive',
  }[next.tone]

  return (
    <ContentCard className="space-y-4" data-testid="supervision-progress">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {session.attendees.length > 1 ? 'Carers' : 'Carer'}
        </span>
        {session.attendees.map(a => (
          <CarerChip key={a.id} employee={a.employee} />
        ))}
        <span className="text-xs text-muted-foreground">
          Supervisor: <span className="font-medium text-foreground">{personName(session.supervisor)}</span>
        </span>
      </div>

      {session.status !== 'CANCELLED' ? (
        <ol className="grid grid-cols-5 gap-1" aria-label="Session progress">
          {STEPS.map((s, i) => {
            const done = i < step || step === 5
            const current = i === step && step < 5
            return (
              <li key={s.key} className="space-y-1">
                <div className={cn('h-1.5 rounded-full', done ? 'bg-green-600' : current ? 'bg-sky-500' : 'bg-muted')} />
                <p className={cn('text-[11px] sm:text-xs', done || current ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {done ? <CheckCircle2 className="mr-0.5 inline h-3 w-3 text-green-600" /> : null}
                  {s.label}
                </p>
              </li>
            )
          })}
        </ol>
      ) : null}

      <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm', toneClass)} data-testid="supervision-next-step">
        <span className="flex items-start gap-2">
          {next.tone === 'warn' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : null}
          <span>
            <span className="font-semibold">Next: </span>
            {next.text}
          </span>
        </span>
        {next.href ? (
          <button type="button" onClick={() => jumpTo(next.href!)} className="text-xs font-medium underline underline-offset-2">
            Go there
          </button>
        ) : null}
      </div>

      <nav className="flex flex-wrap gap-2 text-xs" aria-label="Jump to section">
        {[
          { href: '#details', label: 'Details' },
          { href: '#form', label: `Form ${progress.answered}/${progress.total}${missing.length ? ` · ${missing.length} required left` : ''}`, warn: missing.length > 0 },
          { href: '#actions', label: `Actions${openActions ? ` · ${openActions} open` : ''}` },
          { href: '#sign-off', label: `Sign-off ${(session.supervisorSignedAt ? 1 : 0) + signedCarers}/${1 + session.attendees.length}` },
          ...(session.addenda.length ? [{ href: '#addenda', label: `Addenda · ${session.addenda.length}` }] : []),
        ].map(link => (
          <button
            key={link.href}
            type="button"
            onClick={() => jumpTo(link.href)}
            className={cn(
              'rounded-full border px-3 py-1 hover:bg-muted',
              'warn' in link && link.warn ? 'border-amber-400 text-amber-800 dark:text-amber-300' : 'border-border text-muted-foreground',
            )}
          >
            {link.label}
          </button>
        ))}
      </nav>
    </ContentCard>
  )
}

function DetailsCard({ session, editable }: { session: SupervisionSessionDetail; editable: boolean }) {
  const save = useSessionMutation(session.id, (body: Parameters<typeof updateSupervisionSession>[1]) =>
    updateSupervisionSession(session.id, body),
  )
  const [duration, setDuration] = React.useState(session.durationMinutes ? String(session.durationMinutes) : '')
  const [location, setLocation] = React.useState(session.location ?? '')
  React.useEffect(() => {
    setDuration(session.durationMinutes ? String(session.durationMinutes) : '')
    setLocation(session.location ?? '')
  }, [session.durationMinutes, session.location])

  const onSave = () =>
    save.mutate(
      { durationMinutes: duration ? Math.max(1, Number.parseInt(duration, 10)) : null, location: location.trim() || null },
      { onSuccess: () => toastSuccess('Saved'), onError: e => toastApiError(e, 'Could not save') },
    )

  return (
    <ContentCard className="space-y-3">
      <h2 className="text-sm font-semibold">Details</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Scheduled</dt>
          <dd>{formatDateTime(session.scheduledAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Held</dt>
          <dd>{formatDateTime(session.heldAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Next due after this</dt>
          <dd>
            {session.reviewType.defaultIntervalDays
              ? `${session.reviewType.defaultIntervalDays} days after the held date`
              : 'No repeat'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration (minutes)</dt>
          <dd>
            {editable ? (
              <Input type="number" min={1} max={600} value={duration} onChange={e => setDuration(e.target.value)} className="h-8 w-28" />
            ) : (
              session.durationMinutes ?? '—'
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Location</dt>
          <dd>
            {editable ? (
              <DictationTextControl>
                <Input value={location} onChange={e => setLocation(e.target.value)} className="h-8 pr-9" aria-label="Location" />
              </DictationTextControl>
            ) : (
              session.location ?? '—'
            )}
          </dd>
        </div>
      </dl>
      {editable ? (
        <Button size="sm" variant="outline" onClick={onSave} disabled={save.isPending}>
          Save details
        </Button>
      ) : null}
    </ContentCard>
  )
}

/** Open actions from earlier sessions, reviewed at the start of this one. */
function PreviousActionsCard({ session, canManage }: { session: SupervisionSessionDetail; canManage: boolean }) {
  const employeeId = session.attendees.length === 1 ? (session.attendees[0]?.employeeId ?? '') : ''
  const query = useOpenSupervisionActions(employeeId, Boolean(employeeId))
  const done = useSessionMutation(session.id, (actionId: string) => updateSupervisionAction(actionId, { status: 'DONE' }))
  const rows = (query.data ?? []).filter(a => a.sessionId !== session.id)
  if (!employeeId || rows.length === 0) return null
  return (
    <ContentCard className="space-y-2">
      <h2 className="text-sm font-semibold">Open actions from earlier sessions ({rows.length})</h2>
      <ul className="space-y-2 text-sm">
        {rows.map(a => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-2">
            <span>
              {a.description}
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDate(a.session.heldAt ?? a.session.scheduledAt)}
                {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ''}
              </span>
            </span>
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => done.mutate(a.id, { onError: e => toastApiError(e, 'Could not update') })}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Done
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </ContentCard>
  )
}

/** The renderer takes a Care Pathway form; a session keeps its own copy of one. */
function snapshotAsForm(snapshot: SupervisionFormSnapshot): CareFormDetail {
  return {
    id: snapshot.formId,
    name: snapshot.name,
    description: snapshot.description,
    formType: 'STAFF_FORM',
    status: 'PUBLISHED',
    lastPublishedAt: snapshot.publishedAt,
    publishedById: null,
    versionLabel: '',
    pictureUrl: null,
    currentVersionId: snapshot.formVersionId,
    sections: snapshot.sections,
  }
}

type FormDraft = { answers: CarePlanDraftValues; summary: string; confidential: string }

function draftFrom(session: SupervisionSessionDetail): FormDraft {
  return {
    answers: session.answers ?? {},
    summary: session.summary ?? '',
    confidential: session.confidentialNotes ?? '',
  }
}

/**
 * Answers without the empty ones: editors report "<p></p>" as soon as they mount, which is not an
 * answer and must not count as an unsaved change.
 */
function answered(values: CarePlanDraftValues): CarePlanDraftValues {
  const out: CarePlanDraftValues = {}
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' && isEmptyRichText(value)) continue
    out[key] = value
  }
  return out
}

const sameDraft = (a: FormDraft, b: FormDraft) =>
  a.summary === b.summary &&
  a.confidential === b.confidential &&
  JSON.stringify(answered(a.answers)) === JSON.stringify(answered(b.answers))

/** Answers that differ from what is saved (null clears one on the server). */
function changedAnswers(saved: CarePlanDraftValues, draft: CarePlanDraftValues): Record<string, string | boolean | null> {
  const before = answered(saved)
  const after = answered(draft)
  const out: Record<string, string | boolean | null> = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] !== after[key]) out[key] = after[key] ?? null
  }
  return out
}

/**
 * The session's Care Pathway form (fixed when the session was set up), plus the summary and
 * confidential notes. Unsaved answers survive other updates to the page (adding an action, a
 * signature) and the browser warns before leaving with unsaved changes.
 */
function FormCard({ session, editable }: { session: SupervisionSessionDetail; editable: boolean }) {
  const saved = React.useMemo(() => draftFrom(session), [session])
  const [draft, setDraft] = React.useState(saved)
  const lastSaved = React.useRef(saved)
  React.useEffect(() => {
    // Take the server copy only when nothing is being edited.
    setDraft(prev => (sameDraft(prev, lastSaved.current) ? saved : prev))
    lastSaved.current = saved
  }, [saved])
  const dirty = !sameDraft(draft, saved)
  const showConfidential = session.settings.confidentialNotesEnabled && session.permissions.canReadConfidential
  const snapshot = session.formSnapshot
  const form = React.useMemo(() => (snapshot ? snapshotAsForm(snapshot) : null), [snapshot])
  const missing = session.missingRequired
  const progress = session.formProgress

  React.useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useSessionMutation(session.id, () =>
    updateSupervisionSession(session.id, {
      answers: changedAnswers(saved.answers, draft.answers),
      ...(draft.summary !== saved.summary ? { summary: draft.summary || null } : {}),
      ...(showConfidential && draft.confidential !== saved.confidential
        ? { confidentialNotes: draft.confidential || null }
        : {}),
    }),
  )
  const onSave = () =>
    save.mutate(undefined, {
      onSuccess: result => {
        if (result && typeof result === 'object' && 'answers' in result) {
          setDraft(draftFrom(result as SupervisionSessionDetail))
        }
        toastSuccess('Saved')
      },
      onError: e => toastApiError(e, 'Could not save'),
    })

  return (
    <ContentCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{snapshot?.name ?? 'Form'}</h2>
          {snapshot ? (
            <p className="text-xs text-muted-foreground">
              Care Pathway staff form
              {snapshot.publishedAt ? `, published ${formatDate(snapshot.publishedAt)}` : ''} · {progress.answered} of{' '}
              {progress.total} answered · {progress.requiredAnswered} of {progress.required} required
            </p>
          ) : null}
        </div>
        {editable ? (
          <Button size="sm" onClick={onSave} disabled={!dirty || save.isPending} data-testid="save-form">
            {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {dirty ? 'Save' : 'Saved'}
          </Button>
        ) : null}
      </div>

      {missing.length && session.status !== 'COMPLETED' && session.status !== 'CANCELLED' ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Required, not answered yet ({missing.length})</p>
          <p className="mt-0.5">{missing.map(m => `${m.section}: ${m.label}`).join(' · ')}</p>
        </div>
      ) : null}

      {form ? (
        <CarePathwayFormRenderer
          form={form}
          values={draft.answers}
          onChange={answers => setDraft(d => ({ ...d, answers }))}
          disabled={!editable}
          dictation={editable}
        />
      ) : (
        <p className="text-sm text-muted-foreground">This session has no form.</p>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium">Summary</p>
        {editable ? (
          <SupervisionRichTextEditor
            value={draft.summary}
            onChange={html => setDraft(d => ({ ...d, summary: html }))}
            placeholder="Overall summary of the session (type or dictate)…"
          />
        ) : (
          <SupervisionRichTextView html={session.summary} />
        )}
      </div>
      {showConfidential ? (
        <div className="space-y-1 rounded-md border border-dashed border-border p-3">
          <p className="flex items-center gap-1 text-sm font-medium">
            <Lock className="h-3.5 w-3.5" />
            Confidential notes
          </p>
          <p className="text-xs text-muted-foreground">Only people with confidential access can see this (e.g. health or personal matters).</p>
          {editable ? (
            <SupervisionRichTextEditor
              value={draft.confidential}
              onChange={html => setDraft(d => ({ ...d, confidential: html }))}
              minHeight={96}
            />
          ) : (
            <SupervisionRichTextView html={session.confidentialNotes} />
          )}
        </div>
      ) : null}

      {editable && dirty ? (
        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 shadow-sm dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
          <span>Unsaved changes</span>
          <Button size="sm" onClick={onSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      ) : null}
    </ContentCard>
  )
}

function ActionsCard({ session, canManage }: { session: SupervisionSessionDetail; canManage: boolean }) {
  const [employeeId, setEmployeeId] = React.useState(session.attendees[0]?.employeeId ?? '')
  const [description, setDescription] = React.useState('')
  const [owner, setOwner] = React.useState<SupervisionActionOwner>('CARER')
  const [dueDate, setDueDate] = React.useState('')
  const add = useSessionMutation(session.id, () =>
    addSupervisionAction(session.id, {
      employeeId,
      description: description.trim(),
      owner,
      ...(dueDate ? { dueDate: `${dueDate}T12:00:00.000Z` } : {}),
    }),
  )
  const setStatus = useSessionMutation(session.id, (vars: { id: string; status: 'OPEN' | 'DONE' | 'CANCELLED' }) =>
    updateSupervisionAction(vars.id, { status: vars.status }),
  )
  const canAdd = canManage && session.status !== 'CANCELLED' && session.permissions.canEdit

  const onAdd = () =>
    add.mutate(undefined, {
      onSuccess: () => {
        setDescription('')
        setDueDate('')
        toastSuccess('Action added')
      },
      onError: e => toastApiError(e, 'Could not add the action'),
    })

  return (
    <ContentCard className="space-y-3">
      <h2 className="text-sm font-semibold">Agreed actions</h2>
      {session.actions.length === 0 ? <p className="text-sm text-muted-foreground">No actions yet.</p> : null}
      <ul className="space-y-2">
        {session.actions.map(a => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border p-2 text-sm" data-testid="supervision-action">
            <div>
              <p className={a.status === 'OPEN' ? '' : 'text-muted-foreground line-through'}>{a.description}</p>
              <p className="text-xs text-muted-foreground">
                {session.attendees.length > 1 ? `${employeeName(a.employee)} (${employeeRef(a.employee)}) · ` : ''}
                Owner: {a.ownerName || SUPERVISION_OWNER_LABELS[a.owner]}
                {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ''}
                {a.status !== 'OPEN' ? ` · ${a.status === 'DONE' ? 'Done' : 'Cancelled'} ${formatDate(a.completedAt)}` : ''}
              </p>
            </div>
            {canManage && session.status !== 'CANCELLED' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus.mutate({ id: a.id, status: a.status === 'OPEN' ? 'DONE' : 'OPEN' }, { onError: e => toastApiError(e, 'Could not update') })}
              >
                {a.status === 'OPEN' ? 'Mark done' : 'Reopen'}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canAdd ? (
        <div className="grid gap-2 rounded-md bg-muted/30 p-3 sm:grid-cols-[1fr_auto_auto_auto]">
          {session.attendees.length > 1 ? (
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="sm:col-span-4" aria-label="Carer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {session.attendees.map(a => (
                  <SelectItem key={a.employeeId} value={a.employeeId}>
                    {employeeName(a.employee)} ({employeeRef(a.employee)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <DictationTextControl>
            <Input
              placeholder="What was agreed (type or dictate)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              aria-label="Action"
              className="pr-9"
            />
          </DictationTextControl>
          <Select value={owner} onValueChange={v => setOwner(v as SupervisionActionOwner)}>
            <SelectTrigger className="w-36" aria-label="Owner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SUPERVISION_OWNER_LABELS) as SupervisionActionOwner[]).map(o => (
                <SelectItem key={o} value={o}>
                  {SUPERVISION_OWNER_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-40" aria-label="Due date" />
          <Button onClick={onAdd} disabled={description.trim().length < 2 || add.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}
    </ContentCard>
  )
}

function SignOffCard({ session, canManage }: { session: SupervisionSessionDetail; canManage: boolean }) {
  const [supervisorSig, setSupervisorSig] = React.useState<string | null>(null)
  const sign = useSessionMutation(session.id, (signature: string) => signSupervisionSession(session.id, signature))
  const canSupervisorSign = canManage && session.permissions.canEdit && session.permissions.isSupervisor
  const missing = session.settings.requireFormAnswers ? session.missingRequired : []
  if (session.status === 'CANCELLED') return null

  return (
    <ContentCard className="space-y-4">
      <h2 className="text-sm font-semibold">Sign-off</h2>
      <div className="space-y-2">
        <p className="text-sm font-medium">Supervisor: {personName(session.supervisor)}</p>
        {session.supervisorSignedAt ? (
          <SignedBlock signature={session.supervisorSignature} at={session.supervisorSignedAt} />
        ) : canSupervisorSign ? (
          <>
            {missing.length ? (
              <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Answer the required questions before signing: {missing.map(m => m.label).join(', ')}.
              </p>
            ) : null}
            <SignaturePad onChange={setSupervisorSig} width={420} height={140} />
            <Button
              size="sm"
              disabled={!supervisorSig || missing.length > 0 || sign.isPending}
              onClick={() =>
                supervisorSig &&
                sign.mutate(supervisorSig, { onSuccess: () => toastSuccess('Signed'), onError: e => toastApiError(e, 'Could not sign') })
              }
              data-testid="supervisor-sign"
            >
              <PenLine className="mr-1 h-4 w-4" />
              Sign as supervisor
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {session.permissions.isSupervisor ? 'Not signed yet.' : `Waiting for ${personName(session.supervisor)} to sign.`}
          </p>
        )}
      </div>
      {session.attendees.map(a => (
        <AttendeeSignBlock key={a.id} session={session} attendee={a} canManage={canManage} />
      ))}
      {session.status === 'COMPLETED' ? (
        <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Completed {formatDateTime(session.completedAt)}. The carer's {session.reviewType.name} review has moved on.
        </p>
      ) : null}
    </ContentCard>
  )
}

function AttendeeSignBlock({
  session,
  attendee,
  canManage,
}: {
  session: SupervisionSessionDetail
  attendee: SupervisionSessionDetail['attendees'][number]
  canManage: boolean
}) {
  const [sig, setSig] = React.useState<string | null>(null)
  const [disagree, setDisagree] = React.useState(false)
  const [comment, setComment] = React.useState('')
  const sign = useSessionMutation(session.id, () =>
    signSupervisionAttendee(session.id, attendee.employeeId, {
      agrees: !disagree,
      ...(sig ? { signature: sig } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    }),
  )
  const name = employeeName(attendee.employee)
  const ready = disagree ? comment.trim().length > 0 : Boolean(sig)

  return (
    <div className="space-y-2 border-t border-border pt-3" data-testid="attendee-sign">
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
        Carer: <CarerChip employee={attendee.employee} link={false} />
      </p>
      {attendee.signedAt ? (
        <>
          {attendee.signature ? <SignedBlock signature={attendee.signature} at={attendee.signedAt} /> : null}
          {attendee.agrees === false ? (
            <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Does not agree with the record: {attendee.comment}
            </p>
          ) : attendee.comment ? (
            <p className="text-sm text-muted-foreground">Comment: {attendee.comment}</p>
          ) : null}
          {!attendee.signature ? <p className="text-xs text-muted-foreground">Recorded {formatDateTime(attendee.signedAt)}</p> : null}
        </>
      ) : session.status === 'AWAITING_SIGN_OFF' && canManage ? (
        <>
          <p className="text-xs text-muted-foreground">Hand the device to {name} to read the record and sign.</p>
          <SignaturePad onChange={setSig} width={420} height={140} />
          {session.settings.allowCarerDisagree ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={disagree} onChange={e => setDisagree(e.target.checked)} />
              I do not agree with this record
            </label>
          ) : null}
          <DictationTextControl multiline>
            <textarea
              className={`${TEXTAREA} pr-9`}
              rows={2}
              placeholder={disagree ? 'What do you not agree with? (required)' : 'Comment (optional)'}
              value={comment}
              onChange={e => setComment(e.target.value)}
              aria-label="Carer comment"
            />
          </DictationTextControl>
          <Button
            size="sm"
            disabled={!ready || sign.isPending}
            onClick={() => sign.mutate(undefined, { onSuccess: () => toastSuccess('Carer signed'), onError: e => toastApiError(e, 'Could not sign') })}
            data-testid="carer-sign"
          >
            <PenLine className="mr-1 h-4 w-4" />
            {disagree ? 'Record disagreement' : `Sign as ${name}`}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {session.settings.requireCarerSignature ? 'Signs after the supervisor.' : 'Carer signature not required.'}
        </p>
      )}
    </div>
  )
}

function SignedBlock({ signature, at }: { signature: string | null; at: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {signature ? (
        <img src={signature} alt="Signature" className="h-16 rounded border border-border bg-white" />
      ) : null}
      <span className="text-xs text-muted-foreground">Signed {formatDateTime(at)}</span>
    </div>
  )
}

function AddendaCard({ session, canManage }: { session: SupervisionSessionDetail; canManage: boolean }) {
  const [text, setText] = React.useState('')
  const add = useSessionMutation(session.id, () => addSupervisionAddendum(session.id, text.trim()))
  const canAdd = canManage && !session.permissions.canEdit && session.status !== 'CANCELLED'
  if (!canAdd && session.addenda.length === 0) return null
  return (
    <ContentCard className="space-y-3">
      <h2 className="text-sm font-semibold">Addenda</h2>
      <p className="text-xs text-muted-foreground">Corrections or later notes on the signed record, with who added them and when.</p>
      {session.addenda.map(a => (
        <div key={a.id} className="rounded-md bg-muted/30 p-2 text-sm">
          <p className="whitespace-pre-wrap">{a.text}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
        </div>
      ))}
      {canAdd ? (
        <div className="space-y-2">
          <DictationTextControl multiline>
            <textarea
              className={`${TEXTAREA} pr-9`}
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a correction or note (type or dictate)"
              aria-label="Addendum"
            />
          </DictationTextControl>
          <Button
            size="sm"
            variant="outline"
            disabled={text.trim().length < 3 || add.isPending}
            onClick={() => add.mutate(undefined, { onSuccess: () => { setText(''); toastSuccess('Addendum added') }, onError: e => toastApiError(e, 'Could not add') })}
          >
            Add addendum
          </Button>
        </div>
      ) : null}
    </ContentCard>
  )
}
