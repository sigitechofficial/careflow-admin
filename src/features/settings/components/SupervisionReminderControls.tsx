import * as React from 'react'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import type { SupervisionSettings } from '@/features/supervision/api'

const MAX_DAY_CHOICES = 8

function dayLabel(d: number, when: 'before' | 'after' | 'start'): string {
  if (d === 0) return 'On the day'
  if (when === 'start') return `Day ${d}`
  return `${d} day${d === 1 ? '' : 's'}${when === 'after' ? ' late' : ''}`
}

/**
 * Pick reminder days as chips (common choices plus any other day added), instead of typing a
 * comma list. `min` 0 allows "On the day".
 */
export function DayChips({
  value,
  onChange,
  presets,
  min,
  when,
  disabled,
  label,
}: {
  value: number[]
  onChange: (days: number[]) => void
  presets: number[]
  min: number
  /** before / after the due date, or `start`: days after the carer's start date. */
  when: 'before' | 'after' | 'start'
  disabled: boolean
  label: string
}) {
  const [adding, setAdding] = React.useState(false)
  const [custom, setCustom] = React.useState('')
  const chosen = new Set(value)
  // In time order: counting down to the due date, or up from it (late, after starting).
  const options = [...new Set([...presets, ...value])].sort((a, b) => (when === 'before' ? b - a : a - b))
  const full = chosen.size >= MAX_DAY_CHOICES

  const toggle = (d: number) => {
    const next = new Set(chosen)
    if (next.has(d)) next.delete(d)
    else if (!full) next.add(d)
    onChange([...next].sort((a, b) => b - a))
  }
  const addCustom = () => {
    const d = Number.parseInt(custom, 10)
    if (Number.isInteger(d) && d >= min && d <= (when === 'start' ? 3650 : 365) && !full) {
      onChange([...new Set([...value, d])].sort((a, b) => b - a))
    }
    setCustom('')
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map(d => {
        const on = chosen.has(d)
        return (
          <button
            key={d}
            type="button"
            disabled={disabled || (!on && full)}
            onClick={() => toggle(d)}
            aria-pressed={on}
            className={cn(
              'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              on
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {on ? <Check className="h-3 w-3" /> : null}
            {dayLabel(d, when)}
          </button>
        )
      })}
      {adding ? (
        <span className="inline-flex items-center gap-1">
          <Input
            autoFocus
            type="number"
            min={min}
            max={when === 'start' ? 3650 : 365}
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addCustom()
              if (e.key === 'Escape') setAdding(false)
            }}
            className="h-8 w-20 text-xs"
            aria-label={when === 'start' ? 'Other day after starting' : `Other number of days ${when} the due date`}
          />
          <button type="button" onClick={addCustom} className="rounded-full p-1 text-primary hover:bg-primary/10" aria-label="Add">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setAdding(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled || full}
          onClick={() => setAdding(true)}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          Other
        </button>
      )}
    </div>
  )
}

/** A text box with its unit inside it ("days"), for string-backed number fields. */
export function UnitInput({
  unit,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { unit: string }) {
  return (
    <div className={cn('relative', className)}>
      <Input type="number" {...props} className="pr-16 tabular-nums" />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

/** A whole number with its unit inside the box ("7 days late"), instead of "(days)" in the label. */
export function NumberWithUnit({
  value,
  onChange,
  min,
  max,
  unit,
  disabled,
  label,
}: {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  unit: string
  disabled: boolean
  label: string
}) {
  const [text, setText] = React.useState(String(value))
  React.useEffect(() => setText(String(value)), [value])
  return (
    <div className="relative w-44">
      <Input
        type="number"
        min={min}
        max={max}
        value={text}
        onChange={e => {
          setText(e.target.value)
          const n = Number.parseInt(e.target.value, 10)
          if (Number.isInteger(n) && n >= min && n <= max) onChange(n)
        }}
        onBlur={() => setText(String(value))}
        disabled={disabled}
        aria-label={label}
        className="pr-24 tabular-nums"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** The settings as one worked example, so it is clear who hears what and when. */
export function ReminderExample({ s }: { s: SupervisionSettings }) {
  if (!s.remindersEnabled) {
    return <p className="text-sm text-muted-foreground">Reminders are off: nobody is told when a supervision is coming due.</p>
  }
  const due = addDays(new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1), 0)
  const before = [...s.reminderDaysBefore].sort((a, b) => b - a).map(d => fmt(addDays(due, -d)))
  const after = [...s.reminderDaysAfter].sort((a, b) => a - b).map(d => fmt(addDays(due, d)))
  const time = `${String(s.reminderHour).padStart(2, '0')}:00`
  const staff = s.notifySupervisor
    ? s.managersOnAllReminders
      ? 'the named supervisor and branch managers'
      : 'the named supervisor (branch managers if none is named)'
    : s.managersOnAllReminders
      ? 'branch managers'
      : 'nobody on the staff side'
  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/60 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100" data-testid="reminder-example">
      <p className="font-medium">Example: a supervision due {fmt(due)}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        <li>
          {before.length ? (
            <>
              On {list(before)} at {time}, {staff} {s.emailReminders ? 'gets a notification and an email' : 'gets a notification'}
              {s.notifyCarer ? ', and the carer gets a push on their phone' : ''}.
            </>
          ) : (
            'No reminders before the due date.'
          )}
        </li>
        <li>{after.length ? `If it has not happened, again on ${list(after)}.` : 'No reminders once it is overdue.'}</li>
        <li>
          {s.escalateAfterDays > 0
            ? `Branch managers are told on ${fmt(addDays(due, s.escalateAfterDays))} if it is still not done.`
            : 'Branch managers are not told separately when it is overdue.'}
        </li>
        <li>Shows as “Due soon” from {fmt(addDays(due, -s.dueSoonDays))}.</li>
      </ul>
      <p className="mt-1 text-xs text-sky-900/80 dark:text-sky-200/80">
        Each reminder is sent once. Reminders before the due date are skipped when a session is already booked.
      </p>
    </div>
  )
}
