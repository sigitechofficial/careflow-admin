import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Filter } from 'lucide-react'

/* ─── Constants ──────────────────────────────────────────────── */
const CORAL   = '#e8645a'
const TEAL    = '#4db8c8'
const DAYS_HDR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

type ViewMode = 'Day' | 'Week' | 'Month'

/* ─── Helpers ────────────────────────────────────────────────── */
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/* Days that have "events" shown with teal circle outline */
const EVENT_DAYS_MAY_2026 = new Set([3,5,7,9,11,12,17,18,21,24,25,27,29,30,31])

/* Sample birthday/event data per day */
const EVENTS: Record<string, { label: string; color: string }[]> = {
  '2026-5-8':  [{ label: '🎂 Sarah Mitchell – Birthday', color: CORAL }],
  '2026-5-11': [{ label: '📅 Team Review Meeting', color: TEAL }],
  '2026-5-17': [{ label: '🎂 John Wick – Birthday', color: CORAL }],
  '2026-5-25': [{ label: '📅 CQC Inspection Prep', color: TEAL }],
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function CalendarPage() {
  const today = new Date()                            // May 8 2026 for demo
  const [view,       setView]       = React.useState<ViewMode>('Month')
  const [year,       setYear]       = React.useState(2026)
  const [month,      setMonth]      = React.useState(4)   // 0-indexed → May
  const [selected,   setSelected]   = React.useState(8)   // day number
  const [eventText,  setEventText]  = React.useState('')
  const [warning,    setWarning]    = React.useState(true)
  const [events,     setEvents]     = React.useState(EVENTS)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const totalDays   = daysInMonth(year, month)
  const startOffset = firstDayOfMonth(year, month)

  /* cells: nulls = empty leading slots, numbers = actual days */
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  /* pad to complete last row */
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const selKey  = `${year}-${month + 1}-${selected}`
  const selDay  = DAY_NAMES[new Date(year, month, selected).getDay()]
  const selEvts = events[selKey] ?? []

  const handleAddEvent = () => {
    if (!eventText.trim()) return
    const key = selKey
    setEvents(prev => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { label: eventText, color: TEAL }],
    }))
    setEventText('')
    setWarning(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Calendar
          </div>
          <p className="text-sm text-muted-foreground">
            View birthdays, events, and key dates.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 rounded-xl overflow-hidden border border-border shadow-sm min-h-[540px]">

      {/* ── Left panel ───────────────────────────────────────── */}
      <div
        className="lg:w-[38%] flex flex-col p-7"
        style={{ background: CORAL }}
      >
        {/* Day header row */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-3xl font-bold text-white">{selDay}</h2>
            <p className="text-white/80 text-base font-medium mt-0.5">
              {MONTH_NAMES[month].slice(0, 3)} {selected}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 text-white text-sm font-medium mt-1">
            {(['Day','Week','Month'] as ViewMode[]).map((v, i) => (
              <React.Fragment key={v}>
                {i > 0 && <span className="text-white/40 mx-0.5">/</span>}
                <button
                  onClick={() => setView(v)}
                  className={cn(
                    'transition-opacity',
                    view === v ? 'opacity-100 underline underline-offset-2' : 'opacity-60 hover:opacity-90'
                  )}
                >
                  {v}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Divider + label */}
        <div className="mt-6 mb-4">
          <p className="text-white font-semibold text-sm mb-2">Birthdays And Events</p>
          <div className="border-b border-white/30" />
        </div>

        {/* Events list */}
        <div className="flex-1 space-y-2">
          {selEvts.length === 0 ? (
            <p className="text-white/50 text-sm">No events for this day.</p>
          ) : selEvts.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 text-white text-sm">
              <span className="h-2 w-2 rounded-full bg-white shrink-0" />
              {ev.label}
            </div>
          ))}
        </div>

        {/* Version footer */}
        <p className="text-white/30 text-[10px] mt-8">Version Number - 5.9.2</p>
      </div>

      {/* ── Right panel ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-card">

        {/* Month nav */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border">
          <button
            onClick={prevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="font-semibold text-base">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-border px-4">
          {DAYS_HDR.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 px-4 py-2 gap-y-1 content-start">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />

            const isSelected  = day === selected
            const isTodayDay  = isToday(day)
            const hasEvent    = EVENT_DAYS_MAY_2026.has(day)

            return (
              <div key={day} className="flex items-center justify-center py-1">
                <button
                  onClick={() => setSelected(day)}
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all',
                    isTodayDay
                      ? 'text-white font-bold'
                      : hasEvent
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted',
                    isSelected && !isTodayDay && 'ring-2 ring-offset-1',
                  )}
                  style={
                    isTodayDay
                      ? { background: CORAL }
                      : hasEvent
                      ? { border: `2px solid ${TEAL}`, color: TEAL }
                      : undefined
                  }
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Add Event section ── */}
        <div className="border-t border-border px-6 py-4 space-y-3">
          <div className="flex items-start gap-3">
            {/* Add Event button */}
            <button
              onClick={handleAddEvent}
              className="shrink-0 h-9 px-4 rounded text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: CORAL }}
            >
              Add Event
            </button>

            {/* Event text input */}
            <input
              type="text"
              value={eventText}
              onChange={e => { setEventText(e.target.value); setWarning(false) }}
              placeholder="Enter event description..."
              className="flex-1 h-16 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none align-top"
            />
          </div>

          {/* Warning */}
          {warning && (
            <div className="rounded-md px-4 py-2.5 text-sm font-medium text-amber-800"
                 style={{ background: '#fde68a' }}>
              Please select Service Users
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 pb-3">
          <p className="text-[10px] text-muted-foreground">Licence expire on 31 Dec 50</p>
        </div>
      </div>
    </div>
    </div>
  )
}
