import * as React from 'react'
import { format } from 'date-fns'
import { DatePicker } from '@/shared/ui/date-picker'
import { TimePicker } from '@/shared/ui/time-picker'
import { cn } from '@/shared/lib/utils'

/** UK numeric date shown on the date button, whatever the browser's locale. */
const UK_DATE = 'dd/MM/yyyy'

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})/
const TIME_PART = /T(\d{2}:\d{2})/

/** "YYYY-MM-DD" → that calendar day (local midnight), only for the calendar to highlight. */
function dayFromKey(key: string): Date | undefined {
  const m = DATE_KEY.exec(key)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}

type Props = {
  /** Field name, e.g. "Send at"; the date button and time box are named after it. */
  label: string
  /**
   * Organisation wall-clock date and time, "YYYY-MM-DDTHH:mm" (the same value the survey-datetime
   * helpers convert to and from UTC), or '' for none.
   */
  value: string
  onChange: (value: string) => void
  /** Same format: days before this one cannot be picked. */
  min?: string
  /** Time filled in when a date is picked before a time (default 09:00). */
  defaultTime?: string
  disabled?: boolean
  className?: string
}

/**
 * Survey date and time: CareFlow's shared date picker (shown dd/mm/yyyy, weeks from Monday) plus
 * the shared 24-hour time picker. Unlike `<input type="datetime-local">`, it never shows a US
 * mm/dd/yyyy date or a 12-hour clock because of the browser's locale.
 */
export function SurveyDateTimeField({
  label,
  value,
  onChange,
  min,
  defaultTime = '09:00',
  disabled,
  className,
}: Props) {
  const dateKey = DATE_KEY.test(value) ? value.slice(0, 10) : ''
  const time = TIME_PART.exec(value)?.[1] ?? ''
  // A time typed before a date is kept until a date is picked.
  const [pendingTime, setPendingTime] = React.useState('')
  const shownTime = dateKey ? time : pendingTime

  // The shared time picker keeps what is typed in its own state, so it is re-mounted when the time
  // changes from outside (dialog reset, date picked first) — never while someone is typing in it.
  const typedRef = React.useRef<string | null>(null)
  const seenRef = React.useRef(shownTime)
  const [timeKey, setTimeKey] = React.useState(0)
  React.useEffect(() => {
    if (shownTime === seenRef.current) return
    seenRef.current = shownTime
    if (shownTime !== typedRef.current) setTimeKey(k => k + 1)
    typedRef.current = null
  }, [shownTime])

  const selectedDay = dayFromKey(dateKey)
  const minDay = min ? dayFromKey(min) : undefined

  const pickDate = (day: Date | undefined) => {
    if (!day) {
      onChange('')
      return
    }
    onChange(`${format(day, 'yyyy-MM-dd')}T${time || pendingTime || defaultTime}`)
  }

  const typeTime = (next: string) => {
    typedRef.current = next
    if (dateKey) onChange(`${dateKey}T${next}`)
    else setPendingTime(next)
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label={label}>
      <DatePicker
        className="min-w-[9.5rem] flex-1"
        value={selectedDay}
        onChange={pickDate}
        minDate={minDay}
        defaultMonth={selectedDay ?? minDay}
        displayFormat={UK_DATE}
        weekStartsOn={1}
        placeholder="dd/mm/yyyy"
        disabled={disabled}
        aria-label={selectedDay ? `${label} date, ${format(selectedDay, UK_DATE)}` : `${label} date`}
      />
      <div role="group" aria-label={`${label} time`} className="shrink-0">
        <TimePicker key={timeKey} value={shownTime} onChange={typeTime} disabled={disabled} use24Hour className="w-28" />
      </div>
    </div>
  )
}
