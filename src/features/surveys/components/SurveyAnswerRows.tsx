import * as React from 'react'
import { GripVertical, Plus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'
import { answerRow, rowProblems, type AnswerRow } from '@/features/surveys/survey-question-draft'

/** Moves one row from one place to another. */
export function movedRow<T>(rows: readonly T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= rows.length) return [...rows]
  const next = [...rows]
  const [row] = next.splice(from, 1)
  next.splice(to, 0, row!)
  return next
}

/** Pasting several lines into a row: the lines become rows (the first fills the row if it is empty). */
export function pastedRows(rows: readonly AnswerRow[], at: number, text: string): AnswerRow[] | null {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return null
  const next = [...rows]
  const current = next[at]!
  const fresh = lines.map(l => answerRow(l))
  if (!current.text.trim()) next.splice(at, 1, { ...fresh[0]!, id: current.id }, ...fresh.slice(1))
  else next.splice(at + 1, 0, ...fresh)
  return next
}

/**
 * Answers (or scale labels) as rows: drag the handle — or focus it and press the up / down arrow
 * keys — to move a row, type in it, remove it, or add one. Pasting several lines into a row splits
 * them into rows. Empty rows and duplicates are flagged under the row. Optional per-row switches:
 * "Clears the others" (Several answers) and "Not counted in percentages".
 */
export function SurveyAnswerRows({
  rows,
  onChange,
  label,
  addLabel = 'Add answer',
  locked = false,
  fixedText = false,
  notCountedLocked,
  showExclusive = false,
  showNotCounted = false,
}: {
  rows: AnswerRow[]
  onChange: (rows: AnswerRow[]) => void
  /** What a row is called, e.g. "Answer" or "Scale label" (inputs are named "Answer 1" …). */
  label: string
  addLabel?: string
  /** Answered survey: nothing can change. */
  locked?: boolean
  /** A standard scale: its labels and order are fixed, but the per-row switches still work. */
  fixedText?: boolean
  /**
   * Whether "Not counted in percentages" is fixed (default: when locked). It only changes how the
   * percentages are worked out, so it stays editable on answered questions.
   */
  notCountedLocked?: boolean
  showExclusive?: boolean
  showNotCounted?: boolean
}) {
  const problems = rowProblems(rows)
  const textFixed = locked || fixedText
  const [dragFrom, setDragFrom] = React.useState<number | null>(null)
  /** Read out after a row moves, for people using a screen reader. */
  const [announcement, setAnnouncement] = React.useState('')
  const baseId = React.useId()
  const inputs = React.useRef(new Map<string, HTMLInputElement>())
  const handles = React.useRef(new Map<string, HTMLButtonElement>())
  const focusAfter = React.useRef<{ id: string; on: 'input' | 'handle' } | null>(null)

  React.useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    ;(target.on === 'input' ? inputs.current.get(target.id) : handles.current.get(target.id))?.focus()
  })

  const update = (i: number, patch: Partial<AnswerRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const move = (from: number, to: number, focus: 'input' | 'handle') => {
    if (to < 0 || to >= rows.length || to === from) return
    focusAfter.current = { id: rows[from]!.id, on: focus }
    onChange(movedRow(rows, from, to))
    const text = rows[from]!.text.trim()
    setAnnouncement(`${text ? `“${text}”` : `${label} ${from + 1}`} moved to position ${to + 1} of ${rows.length}.`)
  }
  const remove = (i: number) => {
    // Focus goes to the row that takes its place (or the one before), never lost to the page.
    const neighbour = rows[i + 1] ?? rows[i - 1]
    if (neighbour) focusAfter.current = { id: neighbour.id, on: 'input' }
    onChange(rows.filter((_, j) => j !== i))
  }
  const add = () => {
    const row = answerRow()
    focusAfter.current = { id: row.id, on: 'input' }
    onChange([...rows, row])
  }

  return (
    <div className="space-y-2" data-testid={`${label.toLowerCase().replace(/\s+/g, '-')}-rows`}>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ol className="space-y-1.5">
        {rows.map((row, i) => {
          const problem = problems.get(row.id)
          const name = `${label} ${i + 1}`
          const problemId = `${baseId}-problem-${row.id}`
          return (
            <li
              key={row.id}
              className={cn('rounded-md', dragFrom === i && 'opacity-50')}
              draggable={!textFixed}
              onDragStart={e => {
                setDragFrom(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={e => {
                if (dragFrom !== null) e.preventDefault()
              }}
              onDrop={e => {
                e.preventDefault()
                if (dragFrom !== null) move(dragFrom, i, 'handle')
                setDragFrom(null)
              }}
              onDragEnd={() => setDragFrom(null)}
              data-testid="answer-row"
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  ref={el => {
                    if (el) handles.current.set(row.id, el)
                    else handles.current.delete(row.id)
                  }}
                  className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
                  aria-label={`Move ${name}${row.text.trim() ? ` (${row.text.trim()})` : ''} — use the up and down arrow keys`}
                  disabled={textFixed}
                  onKeyDown={e => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      move(i, e.key === 'ArrowUp' ? i - 1 : i + 1, 'handle')
                    }
                  }}
                >
                  <GripVertical className="h-4 w-4" aria-hidden />
                </button>
                <Input
                  ref={el => {
                    if (el) inputs.current.set(row.id, el)
                    else inputs.current.delete(row.id)
                  }}
                  aria-label={name}
                  value={row.text}
                  readOnly={textFixed}
                  maxLength={200}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={problem && !textFixed ? problemId : undefined}
                  className={cn('h-9 flex-1', textFixed && 'bg-muted/40', problem && 'border-destructive')}
                  onChange={e => update(i, { text: e.target.value })}
                  onPaste={e => {
                    if (textFixed) return
                    const next = pastedRows(rows, i, e.clipboardData.getData('text'))
                    if (next) {
                      e.preventDefault()
                      onChange(next)
                    }
                  }}
                  onKeyDown={e => {
                    if (textFixed) return
                    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                      e.preventDefault()
                      move(i, e.key === 'ArrowUp' ? i - 1 : i + 1, 'input')
                    } else if (e.key === 'Enter') {
                      // Enter goes to the next row (or adds one).
                      e.preventDefault()
                      const nextRow = rows[i + 1]
                      if (nextRow) inputs.current.get(nextRow.id)?.focus()
                      else add()
                    }
                  }}
                />
                {textFixed ? null : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${name}`}
                    onClick={() => remove(i)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
              {(showExclusive || showNotCounted) && row.text.trim() ? (
                <div className="ml-8 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {showExclusive ? (
                    <label className="flex items-center gap-1.5">
                      <Switch
                        size="sm"
                        checked={row.exclusive}
                        disabled={locked}
                        onCheckedChange={v => update(i, { exclusive: v })}
                        aria-label={`${row.text.trim()}: clears the others`}
                      />
                      Clears the others
                    </label>
                  ) : null}
                  {showNotCounted ? (
                    <label className="flex items-center gap-1.5">
                      <Switch
                        size="sm"
                        checked={row.notCounted}
                        disabled={notCountedLocked ?? locked}
                        onCheckedChange={v => update(i, { notCounted: v })}
                        aria-label={`${row.text.trim()}: not counted in percentages`}
                      />
                      Not counted in percentages
                    </label>
                  ) : null}
                </div>
              ) : null}
              {problem && !textFixed ? (
                <p id={problemId} className="ml-8 mt-0.5 text-xs text-destructive" role="alert">
                  {problem}
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>
      {textFixed ? null : (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={add}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {addLabel}
          </Button>
          <span className="text-xs text-muted-foreground">Tip: paste a list to add one answer per line.</span>
        </div>
      )}
    </div>
  )
}
