import * as React from 'react'
import { ListTodo, PlusCircle, Star } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import type { AnswerInput, AnswerValue, AuditAction, AuditDetail } from '../types'

type Standard = AuditDetail['sections'][number]['standards'][number]

const ANSWERS: { value: AnswerValue; label: string; on: string }[] = [
  { value: 'MET', label: 'Met', on: 'border-success bg-success text-success-foreground' },
  { value: 'NOT_MET', label: 'Not met', on: 'border-destructive bg-destructive text-destructive-foreground' },
]

/**
 * One numbered standard: Met or Not met (click again to clear), "Celebrate this standard" when met, notes
 * (required when not met, saved when you leave the box), and actions made for it.
 */
export function StandardRow({
  standard,
  editable,
  canAct,
  saving,
  showMissing,
  actions,
  onAnswer,
  onCreateAction,
}: {
  standard: Standard
  editable: boolean
  /** Actions can be added (also after the audit is completed). */
  canAct: boolean
  saving: boolean
  /** After a try to complete: mark a not met standard without a note. */
  showMissing: boolean
  actions: AuditAction[]
  onAnswer: (body: AnswerInput) => void
  onCreateAction: () => void
}) {
  const answer = standard.answer
  const [note, setNote] = React.useState(answer?.note ?? '')
  const focused = React.useRef(false)
  // Follow the saved note unless someone is typing.
  React.useEffect(() => {
    if (!focused.current) setNote(answer?.note ?? '')
  }, [answer?.note])

  const missing = showMissing && answer?.answer === 'NOT_MET' && !note.trim()
  const choose = (value: AnswerValue) =>
    onAnswer(
      answer?.answer === value
        ? { answer: null }
        : { answer: value, note: note.trim() || undefined, celebrate: value === 'MET' ? answer?.celebrate : false },
    )
  const saveNote = () => {
    focused.current = false
    if (!answer || (answer.note ?? '') === note.trim()) return
    onAnswer({ answer: answer.answer, note: note.trim(), celebrate: answer.celebrate })
  }

  return (
    <div
      className={cn('rounded-lg border bg-card p-3 shadow-sm', missing ? 'border-destructive' : 'border-border')}
      data-testid="audit-standard"
      data-standard={standard.id}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {standard.number}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm text-foreground">{standard.text}</p>
            {standard.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{standard.hint}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5 pl-10 sm:pl-0" role="radiogroup" aria-label={`Answer for standard ${standard.number}`}>
          {ANSWERS.map(a => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={answer?.answer === a.value}
              disabled={!editable || saving}
              onClick={() => choose(a.value)}
              data-testid={`audit-answer-${a.value}`}
              className={cn(
                'min-w-[5.5rem] rounded-md border px-3 py-2 text-xs font-semibold uppercase transition-colors disabled:cursor-not-allowed',
                answer?.answer === a.value
                  ? a.on
                  : 'border-border bg-card text-foreground hover:bg-muted disabled:opacity-60 disabled:hover:bg-card',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {answer || actions.length ? (
        <div className="mt-3 space-y-2 pl-10">
          {answer?.answer === 'MET' ? (
            <label className={cn('flex w-fit items-center gap-2 text-sm', !editable && 'opacity-80')}>
              <input
                type="checkbox"
                checked={answer.celebrate}
                disabled={!editable || saving}
                onChange={e => onAnswer({ answer: 'MET', note: note.trim() || undefined, celebrate: e.target.checked })}
                data-testid="audit-celebrate"
              />
              <Star className={cn('h-3.5 w-3.5', answer.celebrate ? 'fill-warning text-warning' : 'text-muted-foreground')} aria-hidden />
              Celebrate this standard
            </label>
          ) : null}
          {answer ? (
            editable ? (
              <div>
                <label htmlFor={`audit-note-${standard.id}`} className="text-xs font-medium text-foreground">
                  Notes {answer.answer === 'NOT_MET' ? '(required)' : '(optional)'}
                </label>
                <textarea
                  id={`audit-note-${standard.id}`}
                  rows={2}
                  className={cn(
                    'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                    missing ? 'border-destructive' : 'border-input',
                  )}
                  placeholder={answer.answer === 'NOT_MET' ? 'What you found' : 'Anything worth noting'}
                  value={note}
                  onFocus={() => (focused.current = true)}
                  onChange={e => setNote(e.target.value)}
                  onBlur={saveNote}
                  aria-invalid={missing || undefined}
                  data-testid="audit-note"
                />
                {missing ? (
                  <p className="mt-0.5 text-xs text-destructive" data-testid="audit-note-missing">
                    Add a note: say what was not right.
                  </p>
                ) : null}
              </div>
            ) : answer.note ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Notes: </span>
                {answer.note}
              </p>
            ) : null
          ) : null}
          {actions.length ? (
            <ul className="space-y-1" data-testid="audit-standard-actions">
              {actions.map(a => (
                <li key={a.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <ListTodo className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span className={a.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground'}>{a.title}</span>
                  {a.urgent && a.status !== 'DONE' ? <span className="font-semibold text-destructive">Urgent</span> : null}
                  {a.assignedEmployee ? <span className="text-muted-foreground">· for {a.assignedEmployee.name ?? 'a staff member'}</span> : null}
                  {a.status === 'DONE' ? (
                    <span className="text-success">Done</span>
                  ) : a.dueAt ? (
                    <span className="text-muted-foreground">· due {formatOrganisationDate(a.dueAt)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {answer && canAct ? (
            <Button size="sm" variant="outline" onClick={onCreateAction} data-testid="audit-create-action">
              <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
              Create action
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
