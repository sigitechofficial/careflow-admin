import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  entryPattern,
  readEntry,
  showDate,
  showEntry,
  withinRange,
  type DateTimeEntryKind,
} from '@/shared/lib/date-time-entry'
import { splitLayoutClasses } from '@/shared/ui/dictation'
import { Calendar } from '@/shared/ui/date-picker'
import type { InputProps } from '@/shared/ui/input'

/**
 * Date, time, date-and-time and month fields that always show and accept the organisation's format
 * (Settings › General › Time zone & formats: DD/MM/YYYY, 24-hour…), whatever language the browser is in.
 *
 * Drop-in for `<input type="date|time|datetime-local|month">`: the same props, and `onChange` still gets an
 * event whose `target.value` is the standard value ("2026-06-15", "14:30", "2026-06-15T14:30", "2026-06"),
 * so forms and `min`/`max` work unchanged. People can type (in their format, or the standard one) or pick.
 */
export type DateTimeInputProps = Omit<InputProps, 'type'>

const pad = (n: number) => String(n).padStart(2, '0')
const BASE =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50'

/** Set a React-controlled input's value and fire its onChange, as if the browser had changed it. */
function emitValue(input: HTMLInputElement | null, value: string) {
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function toDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}
const fromDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function TimeColumn({ label, options, selected, onPick }: { label: string; options: string[]; selected: string; onPick: (v: string) => void }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'center' })
  }, [])
  return (
    <div className="flex flex-col">
      <span className="px-2 pb-1 text-center text-xs font-medium text-muted-foreground">{label}</span>
      {/* Inside dialogs the scroll lock would swallow wheel/touch scrolling of this portalled list. */}
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        className="h-52 w-14 overflow-y-auto overscroll-contain pr-1"
        onWheel={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {options.map(o => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={o === selected}
            onClick={() => onPick(o)}
            className={cn(
              'block w-full rounded-md px-2 py-1 text-center text-sm tabular-nums hover:bg-accent',
              o === selected && 'bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MonthGrid({ value, onPick, min, max }: { value: string; onPick: (v: string) => void; min?: string; max?: string }) {
  const [year, setYear] = React.useState(() => Number(value.slice(0, 4)) || new Date().getFullYear())
  return (
    <div className="w-60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous year" className="rounded-md p-1 hover:bg-accent" onClick={() => setYear(y => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium tabular-nums">{year}</span>
        <button type="button" aria-label="Next year" className="rounded-md p-1 hover:bg-accent" onClick={() => setYear(y => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS.map((label, i) => {
          const v = `${year}-${pad(i + 1)}`
          const off = !withinRange(v, min?.slice(0, 7), max?.slice(0, 7))
          return (
            <button
              key={v}
              type="button"
              disabled={off}
              onClick={() => onPick(v)}
              className={cn('rounded-md px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-40', v === value && 'bg-primary text-primary-foreground hover:bg-primary')}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function makeField(kind: DateTimeEntryKind, displayName: string) {
  const Field = React.forwardRef<HTMLInputElement, DateTimeInputProps>(function DateTimeField(props, ref) {
    const {
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      onKeyDown,
      className,
      disabled,
      readOnly,
      required,
      min,
      max,
      step,
      id,
      name,
      placeholder,
      leftElement: _leftElement,
      rightElement: _rightElement,
      error,
      form,
      autoFocus,
      ...rest
    } = props
    const { dateDisplayFormat } = useOrganisationDisplayFormat()
    const hiddenRef = React.useRef<HTMLInputElement | null>(null)
    const textRef = React.useRef<HTMLInputElement | null>(null)
    const setHiddenRef = React.useCallback(
      (el: HTMLInputElement | null) => {
        hiddenRef.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
      },
      [ref],
    )

    const controlled = value !== undefined
    const [inner, setInner] = React.useState(() => String(defaultValue ?? ''))
    // Uncontrolled (react-hook-form register): pick up a value set on the hidden input from outside.
    React.useLayoutEffect(() => {
      if (!controlled && hiddenRef.current && hiddenRef.current.value !== inner) setInner(hiddenRef.current.value)
    })
    const current = controlled ? String(value ?? '') : inner

    const [draft, setDraft] = React.useState<string | null>(null)
    const [open, setOpen] = React.useState(false)
    const shown = draft ?? showEntry(kind, current, dateDisplayFormat)
    const minS = min != null ? String(min) : undefined
    const maxS = max != null ? String(max) : undefined
    const invalidDraft = draft != null && draft.trim() !== '' && readEntry(kind, draft, dateDisplayFormat) == null

    const commit = (next: string) => {
      if (!controlled) setInner(next)
      emitValue(hiddenRef.current, next)
      // Out of range: the form refuses to submit, as with the browser's own fields.
      const t = textRef.current
      if (t) {
        const ok = !next || withinRange(next, minS, maxS)
        t.setCustomValidity(
          ok
            ? ''
            : minS && next < minS
              ? `Choose ${kind === 'time' ? 'a time' : 'a date'} on or after ${showEntry(kind, minS, dateDisplayFormat)}.`
              : `Choose ${kind === 'time' ? 'a time' : 'a date'} on or before ${showEntry(kind, maxS ?? '', dateDisplayFormat)}.`,
        )
      }
    }

    const onType = (text: string) => {
      setDraft(text)
      if (!text.trim()) return
      const parsed = readEntry(kind, text, dateDisplayFormat)
      // Commit as soon as it's a whole date/time, so the form updates while typing.
      const complete = text.replace(/\s+/g, ' ').trim().length >= Math.min(entryPattern(kind, dateDisplayFormat).length - 2, 8)
      if (parsed && complete && parsed !== current) commit(parsed)
    }

    const onLeave = (e: React.FocusEvent<HTMLInputElement>) => {
      if (draft != null) {
        if (!draft.trim()) {
          if (current) commit('')
        } else {
          const parsed = readEntry(kind, draft, dateDisplayFormat)
          if (parsed && parsed !== current) commit(parsed)
        }
        setDraft(prev => {
          const parsed = prev && readEntry(kind, prev, dateDisplayFormat)
          return prev && prev.trim() && !parsed ? prev : null
        })
      }
      onBlur?.(Object.assign(e, { target: hiddenRef.current ?? e.target }) as React.FocusEvent<HTMLInputElement>)
    }

    const [datePart, timePart] = kind === 'datetime-local' ? [current.slice(0, 10), current.slice(11, 16)] : kind === 'date' ? [current.slice(0, 10), ''] : ['', current.slice(0, 5)]
    const minuteStep = Number(step) >= 60 && Number(step) % 60 === 0 ? Number(step) / 60 : 1
    const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep))
    const hours = Array.from({ length: 24 }, (_, i) => pad(i))

    const pickDate = (d: Date | undefined) => {
      if (!d) return
      const iso = fromDate(d)
      if (kind === 'date') {
        commit(iso)
        setDraft(null)
        setOpen(false)
      } else {
        commit(`${iso}T${timePart || '09:00'}`)
        setDraft(null)
      }
    }
    const pickTime = (h: string | null, m: string | null, close: boolean) => {
      const [ch, cm] = (timePart || '09:00').split(':')
      const t = `${h ?? ch}:${m ?? cm}`
      if (kind === 'time') commit(t)
      else commit(`${datePart || fromDate(new Date())}T${t}`)
      setDraft(null)
      if (close) setOpen(false)
    }

    const [layoutClass, controlClass] = splitLayoutClasses(className)
    const Icon = kind === 'time' ? Clock : CalendarIcon
    const pattern = entryPattern(kind, dateDisplayFormat)

    return (
      <PopoverPrimitive.Root open={open && !disabled && !readOnly} onOpenChange={setOpen}>
        <div className={cn('relative flex items-center', layoutClass)}>
          <input
            {...rest}
            ref={textRef}
            id={id}
            data-date-time-field={kind}
            type="text"
            inputMode={kind === 'month' || kind === 'date' ? 'numeric' : 'text'}
            autoComplete="off"
            autoFocus={autoFocus}
            value={shown}
            placeholder={placeholder ?? pattern}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-invalid={invalidDraft || error || undefined}
            title={invalidDraft ? `Use ${pattern}` : rest.title}
            className={cn(BASE, 'pr-9 tabular-nums', (invalidDraft || error) && 'border-destructive focus-visible:ring-destructive/30', controlClass)}
            onChange={e => onType(e.target.value)}
            onFocus={onFocus}
            onBlur={onLeave}
            onKeyDown={e => {
              if ((e.key === 'ArrowDown' && e.altKey) || (e.key === 'Enter' && !draft && !current)) {
                e.preventDefault()
                setOpen(true)
              }
              onKeyDown?.(e)
            }}
          />
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || readOnly}
              aria-label={kind === 'time' ? 'Choose a time' : kind === 'month' ? 'Choose a month' : 'Choose a date'}
              className="absolute right-1.5 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none"
            >
              <Icon className="h-4 w-4" />
            </button>
          </PopoverPrimitive.Trigger>
          {/* The standard value the form reads (name, ref and onChange live here). */}
          <input
            ref={setHiddenRef}
            type="text"
            hidden
            tabIndex={-1}
            aria-hidden
            name={name}
            form={form}
            {...(controlled ? { value: current, onChange: onChange ?? (() => undefined) } : { defaultValue: defaultValue as string | undefined, onChange })}
          />
        </div>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            className="z-[80] flex gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            {kind === 'date' || kind === 'datetime-local' ? (
              <Calendar
                mode="single"
                weekStartsOn={1}
                selected={toDate(datePart)}
                defaultMonth={toDate(datePart) ?? toDate(minS ?? '') ?? undefined}
                onSelect={pickDate}
                disabled={d => !withinRange(fromDate(d), minS?.slice(0, 10), maxS?.slice(0, 10))}
                footer={
                  datePart ? (
                    <p className="pt-2 text-center text-xs text-muted-foreground">{showDate(datePart, dateDisplayFormat)}</p>
                  ) : null
                }
              />
            ) : null}
            {kind === 'time' || kind === 'datetime-local' ? (
              <div className="flex gap-1 p-2">
                <TimeColumn label="Hour" options={hours} selected={timePart.slice(0, 2)} onPick={h => pickTime(h, null, false)} />
                <TimeColumn label="Min" options={minutes} selected={timePart.slice(3, 5)} onPick={m => pickTime(null, m, true)} />
              </div>
            ) : null}
            {kind === 'month' ? (
              <MonthGrid
                value={current.slice(0, 7)}
                min={minS}
                max={maxS}
                onPick={v => {
                  commit(v)
                  setDraft(null)
                  setOpen(false)
                }}
              />
            ) : null}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  })
  Field.displayName = displayName
  return Field
}

/** A date in the organisation's format (value "YYYY-MM-DD"). */
export const DateInput = makeField('date', 'DateInput')
/** A 24-hour time (value "HH:mm"). */
export const TimeInput = makeField('time', 'TimeInput')
/** A date and 24-hour time (value "YYYY-MM-DDTHH:mm"). */
export const DateTimeInput = makeField('datetime-local', 'DateTimeInput')
/** A month and year (value "YYYY-MM"). */
export const MonthInput = makeField('month', 'MonthInput')
