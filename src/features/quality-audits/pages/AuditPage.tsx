import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, PlayCircle, PlusCircle, XCircle } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import type { AnswerInput, AuditDetail } from '../types'
import {
  useAnswerStandard,
  useAudit,
  useBeginAudit,
  useCancelAudit,
  useCompleteAudit,
  useUpdateAudit,
  useUpdateAuditAction,
} from '../hooks'
import { LEVEL_LABEL, levelVariant, statusText, statusVariant } from '../labels'
import { HELP } from '../help'
import { StandardRow } from '../components/StandardRow'
import { AuditActionDialog, type ActionStandard } from '../components/AuditActionDialog'
import { PersonChip } from '../components/AuditTable'

const ukDate = (d: string | null | undefined) => (d ? formatOrganisationDate(d) : '—')

/** Governance → Audits → one audit: begin, answer each standard, add actions and complete it. */
export default function AuditPage() {
  const { auditId } = useParams({ strict: false }) as { auditId: string }
  const query = useAudit(auditId)
  const audit = query.data

  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (!audit)
    return (
      <p className="p-6 text-sm text-destructive">
        {query.error instanceof ApiError ? query.error.message : 'Could not load the audit.'}
      </p>
    )
  return <AuditView audit={audit} />
}

function AuditView({ audit }: { audit: AuditDetail }) {
  const canManage = useAuthStore(s => s.can('quality_audits.manage'))
  const editable = canManage && (audit.status === 'IN_PROGRESS' || audit.status === 'DUE')
  const canAct = canManage && ['IN_PROGRESS', 'COMPLETED', 'MISSED'].includes(audit.status)
  const answer = useAnswerStandard(audit.id)
  const begin = useBeginAudit(audit.id)
  const update = useUpdateAudit(audit.id)
  const complete = useCompleteAudit(audit.id)
  const cancel = useCancelAudit(audit.id)
  const updateAction = useUpdateAuditAction(audit.id)
  const [error, setError] = React.useState<string | null>(null)
  const [showMissing, setShowMissing] = React.useState(false)
  const [actionFor, setActionFor] = React.useState<ActionStandard | null | undefined>(undefined)
  const [item, setItem] = React.useState(audit.auditedItem?.value ?? '')
  const [summary, setSummary] = React.useState(audit.summary ?? '')
  const result = audit.result
  const branchName = audit.location?.name ?? 'Whole organisation'

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(e instanceof ApiError ? e.message : fallback)
      return false
    }
  }
  // The last answer or note being saved, so Complete waits for it (a note is saved when its box loses focus).
  const lastSave = React.useRef<Promise<unknown>>(Promise.resolve())
  const onAnswer = (standardId: string, body: AnswerInput) => {
    lastSave.current = run(() => answer.mutateAsync({ standardId, body }), 'Could not save the answer.')
  }
  const saveItem = () => {
    if (!audit.auditedItem || (audit.auditedItem.value ?? '') === item.trim() || audit.status !== 'IN_PROGRESS') return
    void run(() => update.mutateAsync({ auditedItemValue: item.trim() }), 'Could not save.')
  }
  const saveSummary = () => {
    if ((audit.summary ?? '') === summary.trim()) return
    void run(() => update.mutateAsync({ summary: summary.trim() }), 'Could not save.')
  }
  const onComplete = async () => {
    setShowMissing(true)
    await lastSave.current
    if (await run(() => complete.mutateAsync(), 'Could not complete the audit.')) toastSuccess('Audit completed', audit.title)
  }
  const onBegin = () =>
    void run(() => begin.mutateAsync(audit.auditedItem ? item.trim() || undefined : undefined), 'Could not start the audit.')

  const actionsFor = (id: string) => audit.actions.filter(a => a.standardId === id)

  return (
    <div className="flex flex-col gap-4" data-testid="audit-page">
      <div>
        <Link to="/governance/audits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Audits
        </Link>
      </div>

      <div className="rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
              {audit.title}
            </h1>
            <p className="mt-0.5 text-sm text-primary-foreground/80">
              {audit.template.area?.name ?? 'Audit'} · {branchName}
              {audit.template.code.startsWith('OWN') ? ' · your own template' : ''}
            </p>
          </div>
          <Badge variant={statusVariant(audit.status, audit.timing?.state ?? null)} className="bg-background">
            {statusText(audit.status, audit.timing?.state ?? null)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-sm sm:grid-cols-2" data-testid="audit-facts">
            <Fact label="Person accountable">
              <PersonChip name={audit.accountable?.name} />
            </Fact>
            <Fact label="Auditor">{audit.auditor?.name ?? (audit.status === 'DUE' ? 'Whoever starts it' : '—')}</Fact>
            {audit.dueDate ? (
              <Fact label="Due" info={HELP.window}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {ukDate(audit.dueDate)}
                </span>
                {audit.timing ? (
                  <span className="block text-xs text-muted-foreground" data-testid="audit-window">
                    Can be completed from {ukDate(audit.timing.opensOn)}; missed after {ukDate(audit.timing.closesOn)}
                  </span>
                ) : null}
              </Fact>
            ) : null}
            <Fact label={audit.status === 'COMPLETED' ? 'Completed' : 'Carried out'}>
              {audit.status === 'COMPLETED' ? ukDate(audit.completedAt) : ukDate(audit.auditDate)}
            </Fact>
            {audit.auditedItem ? (
              <div className="sm:col-span-2">
                <label htmlFor="audit-item" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {audit.auditedItem.label}
                  <InfoTip label="audited item">{HELP.auditedItem}</InfoTip>
                </label>
                {editable ? (
                  <Input
                    id="audit-item"
                    className="mt-1 max-w-md"
                    value={item}
                    onChange={e => setItem(e.target.value)}
                    onBlur={saveItem}
                    data-testid="audit-item"
                  />
                ) : (
                  <p className="mt-1 text-foreground">{audit.auditedItem.value || '—'}</p>
                )}
              </div>
            ) : null}
          </section>

          {audit.template.introduction ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground" data-testid="audit-intro">
              {audit.template.introduction}
            </p>
          ) : null}

          {audit.status === 'DUE' && canManage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm" data-testid="audit-due-banner">
              <span>
                This audit is due on <b>{ukDate(audit.dueDate)}</b>. Start it to become the auditor, or just answer the
                first standard.
              </span>
              <Button size="sm" onClick={onBegin} disabled={begin.isPending} data-testid="audit-begin">
                <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden />
                {begin.isPending ? 'Starting…' : 'Start audit'}
              </Button>
            </div>
          ) : null}
          {audit.status === 'MISSED' ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              This audit was missed: it was not completed by {ukDate(audit.timing?.closesOn ?? audit.dueDate)}. You can still add
              actions.
            </p>
          ) : null}

          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-foreground">Standards</h2>
            <InfoTip label="standards">{HELP.standards}</InfoTip>
          </div>
          {audit.sections.map((s, si) => {
            const sec = result.sections[si]
            return (
              <section key={s.title} className="space-y-2" data-testid="audit-section">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
                  <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                  {sec && sec.answered ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {sec.met}/{sec.answered} met{sec.percent !== null ? ` · ${sec.percent}%` : ''}
                    </span>
                  ) : null}
                </div>
                {s.standards.map(st => (
                  <StandardRow
                    key={st.id}
                    standard={st}
                    editable={editable}
                    canAct={canAct}
                    saving={answer.isPending}
                    showMissing={showMissing}
                    actions={actionsFor(st.id)}
                    onAnswer={body => onAnswer(st.id, body)}
                    onCreateAction={() =>
                      setActionFor({
                        id: st.id,
                        number: st.number,
                        text: st.text,
                        answer: st.answer?.answer ?? null,
                        note: st.answer?.note ?? null,
                      })
                    }
                  />
                ))}
              </section>
            )
          })}

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="audit-actions">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Actions</h2>
              {canAct ? (
                <Button size="sm" variant="outline" onClick={() => setActionFor(null)} data-testid="audit-add-action">
                  <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
                  Add action
                </Button>
              ) : null}
            </div>
            {audit.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {[...audit.actions]
                  .sort((a, b) => Number(b.urgent && b.status === 'OPEN') - Number(a.urgent && a.status === 'OPEN'))
                  .map(a => (
                    <li key={a.id} className="flex items-start justify-between gap-3 py-2.5" data-testid="audit-action-row">
                      <label className="flex min-w-0 items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={a.status === 'DONE'}
                          disabled={!canAct || updateAction.isPending}
                          onChange={e =>
                            void run(
                              () => updateAction.mutateAsync({ actionId: a.id, body: { status: e.target.checked ? 'DONE' : 'OPEN' } }),
                              'Could not update the action.',
                            )
                          }
                          aria-label={`Done: ${a.title}`}
                        />
                        <span className="min-w-0">
                          <span className={a.status === 'DONE' ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}>
                            {a.title}
                          </span>
                          {a.urgent && a.status === 'OPEN' ? (
                            <Badge size="sm" variant="destructive" className="ml-1.5">
                              Urgent
                            </Badge>
                          ) : null}
                          <span className="block text-xs text-muted-foreground">
                            {a.standardNumber ? `Standard ${a.standardNumber}` : 'Whole audit'}
                            {a.assignedEmployee ? ` · for ${a.assignedEmployee.name ?? 'a staff member'}` : ''}
                            {a.detail ? ` · ${a.detail}` : ''}
                          </span>
                        </span>
                      </label>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {a.status === 'DONE' ? `Done ${ukDate(a.completedAt)}` : a.dueAt ? `Due ${ukDate(a.dueAt)}` : ''}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="audit-score">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">Score</h2>
              <InfoTip label="score">{HELP.score}</InfoTip>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground" data-testid="audit-percent">
              {result.percent === null ? '—' : `${result.percent}%`}
            </p>
            {audit.level ? (
              <Badge className="mt-1" variant={levelVariant(audit.level)}>
                {LEVEL_LABEL[audit.level]}
              </Badge>
            ) : null}
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Answered</dt>
              <dd className="text-right tabular-nums" data-testid="audit-answered">
                {result.answered} of {result.total}
              </dd>
              <dt className="text-muted-foreground">Met</dt>
              <dd className="text-right tabular-nums text-success">{result.met}</dd>
              <dt className="text-muted-foreground">Not met</dt>
              <dd className="text-right tabular-nums text-destructive">{result.notMet}</dd>
              <dt className="text-muted-foreground">Celebrated</dt>
              <dd className="text-right tabular-nums">{result.celebrated}</dd>
            </dl>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${result.total ? Math.round((result.answered / result.total) * 100) : 0}%` }}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <label htmlFor="audit-summary" className="text-sm font-semibold text-foreground">
              Auditor&apos;s summary
            </label>
            {editable ? (
              <textarea
                id="audit-summary"
                className={`${feedbackTextareaClass} mt-2`}
                rows={4}
                placeholder="Overall findings, what went well and what needs work"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                onBlur={saveSummary}
                data-testid="audit-summary"
              />
            ) : (
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{audit.summary || 'No summary.'}</p>
            )}
            {error ? (
              <p className="mt-3 text-sm text-destructive" data-testid="audit-error">
                {error}
              </p>
            ) : null}
            {canManage && audit.status === 'IN_PROGRESS' ? (
              <div className="mt-3 flex flex-col gap-2">
                <Button onClick={() => void onComplete()} disabled={complete.isPending} data-testid="audit-complete">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                  {complete.isPending ? 'Completing…' : 'Complete audit'}
                </Button>
              </div>
            ) : null}
            {canManage && (audit.status === 'IN_PROGRESS' || audit.status === 'DUE') ? (
              <InlineConfirm
                title="Cancel this audit?"
                description={audit.scheduleId ? 'The next one on its schedule will be made.' : 'Its answers are kept but it cannot be completed.'}
                confirmLabel="Cancel audit"
                destructive
                onConfirm={() => void run(() => cancel.mutateAsync(), 'Could not cancel the audit.')}
              >
                <Button variant="ghost" className={cn('mt-2 w-full text-destructive')} data-testid="audit-cancel">
                  <XCircle className="mr-1.5 h-4 w-4" aria-hidden />
                  Cancel audit
                </Button>
              </InlineConfirm>
            ) : null}
          </section>
        </aside>
      </div>

      {actionFor !== undefined ? (
        <AuditActionDialog
          auditId={audit.id}
          auditTitle={audit.title}
          branchName={branchName}
          standard={actionFor}
          open
          onOpenChange={o => {
            if (!o) setActionFor(undefined)
          }}
        />
      ) : null}
    </div>
  )
}

function Fact({ label, info, children }: { label: string; info?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {info ? <InfoTip label={label.toLowerCase()}>{info}</InfoTip> : null}
      </p>
      <div className="mt-1 text-foreground">{children}</div>
    </div>
  )
}
