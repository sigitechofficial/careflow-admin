import * as React from 'react'
import { ChevronDown, ListTodo, MonitorSmartphone, PlusCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { Button } from '@/shared/ui/button'
import type { CheckAnswer, CheckPart, MockAction, StatementCheck, TemplateGuidance } from '../types'
import type { ActionCheck } from './ActionsSection'

export const CHECK_PARTS: { key: CheckPart; label: string }[] = [
  { key: 'lookAt', label: 'Look at' },
  { key: 'askPeople', label: 'Ask people we support' },
  { key: 'askStaff', label: 'Ask staff' },
]

const ANSWERS: { value: CheckAnswer; label: string; on: string }[] = [
  { value: 'MET', label: 'Met', on: 'border-success bg-success text-success-foreground' },
  { value: 'PARTIALLY_MET', label: 'Partially met', on: 'border-warning bg-warning text-warning-foreground' },
  { value: 'NOT_MET', label: 'Not met', on: 'border-destructive bg-destructive text-destructive-foreground' },
]

/** Answers keyed by part and text, so a saved answer finds its check again. */
export type CheckAnswers = Map<string, StatementCheck>
export const checkKey = (part: CheckPart, text: string) => `${part}\u0000${text}`

export function toCheckAnswers(checks: StatementCheck[]): CheckAnswers {
  return new Map(checks.map(c => [checkKey(c.part, c.text), c]))
}

export function sameCheckAnswers(a: CheckAnswers, b: CheckAnswers): boolean {
  if (a.size !== b.size) return false
  for (const [k, c] of a) {
    const o = b.get(k)
    if (o?.answer !== c.answer || (o.note ?? '') !== (c.note ?? '')) return false
  }
  return true
}

/**
 * The 1–4 score from the answers with the default settings (the API scores with each inspection's own
 * settings, scoreFromChecks in cqc-mock-inspection-scoring.util.ts): Met 1, Partially met ½, Not met 0;
 * all → 4, 75% or more → 3, 50% or more → 2, less → 1. No score until every check is answered.
 */
export function scoreFromChecks(guidance: TemplateGuidance | null, answers: CheckAnswers) {
  let total = 0
  let answered = 0
  let halves = 0
  for (const p of CHECK_PARTS) {
    for (const text of guidance?.[p.key] ?? []) {
      total += 1
      const a = answers.get(checkKey(p.key, text))?.answer
      if (!a) continue
      answered += 1
      halves += a === 'MET' ? 2 : a === 'PARTIALLY_MET' ? 1 : 0
    }
  }
  const most = total * 2
  const complete = total > 0 && answered === total
  const score = !complete ? null : halves === most ? 4 : halves * 4 >= most * 3 ? 3 : halves * 2 >= most ? 2 : 1
  return {
    score,
    total,
    answered,
    points: halves / 2,
    percent: complete ? Math.round((halves / most) * 1000) / 10 : null,
  }
}

/** A note is needed when a check is not met or partially met. */
export const needsNote = (c: StatementCheck) => c.answer !== 'MET' && !c.note?.trim()

/** "5 of 8 answered · 3 met · 1 partially met · 1 not met" for the checks in the guidance. */
function tally(guidance: TemplateGuidance, answers: CheckAnswers) {
  let total = 0
  const count: Record<CheckAnswer, number> = { MET: 0, PARTIALLY_MET: 0, NOT_MET: 0 }
  for (const p of CHECK_PARTS) {
    for (const text of guidance[p.key]) {
      total += 1
      const a = answers.get(checkKey(p.key, text))
      if (a) count[a.answer] += 1
    }
  }
  return { total, answered: count.MET + count.PARTIALLY_MET + count.NOT_MET, count }
}

/**
 * The statement's checks as numbered questions, each answered Met, Partially met or Not met
 * (click the chosen answer again to clear it). "In CareFlow" pointers are shown as where to look.
 */
export function StatementChecks({
  guidance,
  focus,
  answers,
  onChange,
  editable,
  heading,
  showMissingNotes,
  actions = [],
  onCreateAction,
}: {
  guidance: TemplateGuidance
  focus: string | null
  answers: CheckAnswers
  onChange: React.Dispatch<React.SetStateAction<CheckAnswers>>
  editable: boolean
  heading: React.ReactNode
  /** After a save attempt: marks the checks whose required note is missing. */
  showMissingNotes?: boolean
  /** The statement's actions; those made from a check show under it. */
  actions?: MockAction[]
  /** Opens "Create action" for one check (only for people who may add actions). */
  onCreateAction?: (check: ActionCheck) => void
}) {
  const t = tally(guidance, answers)
  let n = 0
  const set = (part: CheckPart, text: string, answer: CheckAnswer) =>
    onChange(prev => {
      const next = new Map(prev)
      const key = checkKey(part, text)
      const old = next.get(key)
      if (old?.answer === answer) next.delete(key)
      else next.set(key, { part, text, answer, note: old?.note ?? null })
      return next
    })
  const setNote = (part: CheckPart, text: string, note: string) =>
    onChange(prev => {
      const key = checkKey(part, text)
      const old = prev.get(key)
      if (!old) return prev
      const next = new Map(prev)
      next.set(key, { ...old, note })
      return next
    })
  return (
    <section className="space-y-3" data-testid="mock-statement-checks">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {heading}
        {t.total ? (
          <p className="text-xs text-muted-foreground" data-testid="mock-checks-tally">
            {t.answered} of {t.total} answered
            {t.answered ? (
              <>
                {' · '}
                <span className="text-success">{t.count.MET} met</span>
                {' · '}
                <span className="text-warning">{t.count.PARTIALLY_MET} partially met</span>
                {' · '}
                <span className="text-destructive">{t.count.NOT_MET} not met</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      {focus ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary" data-testid="mock-statement-focus">
          <span className="font-semibold">Focus for this inspection: </span>
          {focus}
        </p>
      ) : null}
      {CHECK_PARTS.filter(p => guidance[p.key].length).map(p => (
        <div key={p.key} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.label}</p>
          {guidance[p.key].map(text => {
            n += 1
            const saved = answers.get(checkKey(p.key, text))
            const chosen = saved?.answer ?? null
            const missing = !!showMissingNotes && !!saved && needsNote(saved)
            const noteId = `mock-check-note-${p.key}-${n}`
            const linked = actions.filter(a => a.checkText === text)
            return (
              <div
                key={text}
                className={cn(
                  'space-y-3 rounded-lg border bg-muted/30 p-4',
                  missing ? 'border-destructive' : 'border-border',
                )}
                data-testid="mock-check"
              >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md bg-primary px-2 text-sm font-bold text-primary-foreground">
                    {n}.
                  </span>
                  <p className="pt-1.5 text-[15px] font-medium leading-snug text-foreground">{text}</p>
                </div>
                <div
                  className="grid shrink-0 grid-cols-3 gap-2 sm:pl-12 lg:flex lg:pl-0"
                  role="radiogroup"
                  aria-label={`Answer for check ${n}`}
                >
                  {ANSWERS.map(a => (
                    <button
                      key={a.value}
                      type="button"
                      role="radio"
                      aria-checked={chosen === a.value}
                      disabled={!editable}
                      onClick={() => set(p.key, text, a.value)}
                      data-testid={`mock-check-${a.value}`}
                      className={cn(
                        'min-h-11 rounded-md border-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wide shadow-sm transition-colors disabled:cursor-not-allowed lg:min-w-[7.5rem] lg:px-4',
                        chosen === a.value
                          ? a.on
                          : 'border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-card',
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              {saved || linked.length ? (
                <div className="space-y-2 sm:pl-12">
                  {saved ? (
                    editable ? (
                      <div>
                        <label htmlFor={noteId} className="text-xs font-medium text-foreground">
                          Notes {saved.answer === 'MET' ? '(optional)' : '(required)'}
                        </label>
                        <textarea
                          id={noteId}
                          rows={2}
                          className={cn(
                            'mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                            missing ? 'border-destructive' : 'border-input',
                          )}
                          placeholder={
                            saved.answer === 'MET'
                              ? 'Anything worth noting, e.g. "reading list 95% complete"'
                              : 'What you found, e.g. "one carer did not wash hands before care"'
                          }
                          value={saved.note ?? ''}
                          onChange={e => setNote(p.key, text, e.target.value)}
                          aria-invalid={missing || undefined}
                          data-testid="mock-check-note"
                        />
                        {missing ? (
                          <p className="mt-0.5 text-xs text-destructive" data-testid="mock-check-note-missing">
                            Add a note: say what was not right.
                          </p>
                        ) : null}
                      </div>
                    ) : saved.note ? (
                      <p className="whitespace-pre-line text-sm text-muted-foreground" data-testid="mock-check-note-text">
                        <span className="font-medium text-foreground">Notes: </span>
                        {saved.note}
                      </p>
                    ) : null
                  ) : null}
                  {linked.length ? (
                    <ul className="space-y-1" data-testid="mock-check-actions">
                      {linked.map(a => (
                        <li key={a.id} className="flex items-center gap-1.5 text-xs">
                          <ListTodo className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          <span className={a.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground'}>
                            {a.title}
                          </span>
                          {a.assignedEmployee ? (
                            <span className="text-muted-foreground">· for {a.assignedEmployee.name ?? 'a staff member'}</span>
                          ) : null}
                          {a.status === 'DONE' ? (
                            <span className="text-success">Done</span>
                          ) : a.dueAt ? (
                            <span className="text-muted-foreground">· due {formatOrganisationDate(a.dueAt)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {saved && onCreateAction ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreateAction({ text, answer: saved.answer, note: saved.note?.trim() || null })}
                      data-testid="mock-check-create-action"
                    >
                      <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
                      Create action
                    </Button>
                  ) : null}
                </div>
              ) : null}
              </div>
            )
          })}
        </div>
      ))}
      {guidance.inCareFlow.length ? (
        <div className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          <MonitorSmartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Where to look in CareFlow</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
              {guidance.inCareFlow.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** A section that opens and closes, closed to start with. */
export function DropdownSection({
  title,
  meta,
  hint,
  children,
  testId,
}: {
  title: string
  meta?: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
  testId?: string
}) {
  const [open, setOpen] = React.useState(false)
  const id = React.useId()
  return (
    <div className="rounded-lg border border-border" data-testid={testId}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(v => !v)}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {meta}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </span>
      </button>
      {open ? (
        <div id={id} className="space-y-2 border-t border-border px-3 py-3">
          {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  )
}
