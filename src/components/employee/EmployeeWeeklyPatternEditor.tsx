import * as React from 'react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import {
  WORKING_PATTERN_DAY_ORDER,
  createWorkingPattern,
  deleteWorkingPattern,
  listWorkingPatterns,
  type WorkingPatternDay,
  type WorkingPatternRow,
} from '@/lib/employees-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const DAY_LABEL: Record<WorkingPatternDay, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}

type AvailabilityLevel = 'Fully' | 'Partial' | 'None'

function levelFromRow(p: WorkingPatternRow | undefined): AvailabilityLevel {
  if (!p) return 'None'
  if (!p.isAvailable) return 'None'
  return p.notes === 'partial' ? 'Partial' : 'Fully'
}

function AvailabilityPills({
  value,
  onChange,
  disabled,
}: {
  value: AvailabilityLevel
  onChange: (next: AvailabilityLevel) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Day availability"
      className={cn(
        'inline-flex max-w-full flex-wrap gap-0.5 rounded-md border border-border bg-muted/40 p-0.5',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {(['Fully', 'Partial', 'None'] as const).map(x => (
        <button
          key={x}
          type="button"
          role="radio"
          aria-checked={value === x}
          onClick={() => onChange(x)}
          className={cn(
            'min-h-8 min-w-[2.75rem] rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            value === x
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/90 hover:text-foreground',
          )}
        >
          {x}
        </button>
      ))}
    </div>
  )
}

type DayState = {
  patternId?: string
  startTime: string
  endTime: string
  level: AvailabilityLevel
}

function emptyWeek(): Record<WorkingPatternDay, DayState> {
  const o = {} as Record<WorkingPatternDay, DayState>
  for (const d of WORKING_PATTERN_DAY_ORDER) {
    o[d] = { startTime: '', endTime: '', level: 'None' }
  }
  return o
}

function mergeFromApi(rows: WorkingPatternRow[]): Record<WorkingPatternDay, DayState> {
  const byDay: Partial<Record<WorkingPatternDay, WorkingPatternRow[]>> = {}
  for (const r of rows) {
    const d = r.dayOfWeek as WorkingPatternDay
    if (!(WORKING_PATTERN_DAY_ORDER as readonly string[]).includes(d)) continue
    if (!byDay[d]) byDay[d] = []
    byDay[d]!.push(r)
  }
  const out = emptyWeek()
  for (const d of WORKING_PATTERN_DAY_ORDER) {
    const list = byDay[d]
    const first = list?.[0]
    if (!first) continue
    out[d] = {
      patternId: first.id,
      startTime: first.startTime ?? '',
      endTime: first.endTime ?? '',
      level: levelFromRow(first),
    }
  }
  return out
}

export function EmployeeWeeklyPatternEditor({
  employeeId,
  apiReady,
  enabled,
}: {
  employeeId: string | null
  apiReady: boolean
  enabled: boolean
}) {
  const [week, setWeek] = React.useState<Record<WorkingPatternDay, DayState>>(emptyWeek)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!employeeId || !apiReady) {
      setWeek(emptyWeek())
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await listWorkingPatterns(employeeId)
      setWeek(mergeFromApi(rows))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load working patterns.')
      setWeek(emptyWeek())
    } finally {
      setLoading(false)
    }
  }, [employeeId, apiReady])

  React.useEffect(() => {
    void load()
  }, [load])

  const setDay = (day: WorkingPatternDay, patch: Partial<DayState>) => {
    setWeek(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  const saveWeek = async () => {
    if (!employeeId || !apiReady) return
    setSaving(true)
    setError(null)
    try {
      const existing = await listWorkingPatterns(employeeId)
      for (const r of existing) {
        await deleteWorkingPattern(employeeId, r.id)
      }
      for (const d of WORKING_PATTERN_DAY_ORDER) {
        const row = week[d]
        if (row.level === 'None' && !row.startTime.trim() && !row.endTime.trim()) continue
        await createWorkingPattern(employeeId, {
          dayOfWeek: d,
          startTime: row.startTime.trim() || undefined,
          endTime: row.endTime.trim() || undefined,
          isAvailable: row.level !== 'None',
          notes: row.level === 'Partial' ? 'partial' : undefined,
        })
      }
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save working pattern.')
    } finally {
      setSaving(false)
    }
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">Save personal details first to store a weekly working pattern.</p>
    )
  }

  if (!apiReady) {
    return <p className="text-sm text-muted-foreground">Sign in with API configured to save working patterns.</p>
  }

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Turn on <span className="font-medium text-foreground">Available for work</span> and{' '}
        <span className="font-medium text-foreground">Working pattern required</span> to edit the saved week.
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="employee-weekly-pattern-editor">
      <p className="text-xs text-muted-foreground">
        One saved row per weekday (standard week). Fortnight grids above remain a quick visual; this block is what the
        server stores.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Day', 'Availability', 'Start', 'End'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKING_PATTERN_DAY_ORDER.map(d => {
              const row = week[d]
              return (
                <tr key={d} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{DAY_LABEL[d]}</td>
                  <td className="min-w-[12rem] px-3 py-2">
                    <AvailabilityPills value={row.level} onChange={next => setDay(d, { level: next })} />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="time"
                      className="h-9 w-[8.5rem]"
                      value={row.startTime}
                      onChange={e => setDay(d, { startTime: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="time"
                      className="h-9 w-[8.5rem]"
                      value={row.endTime}
                      onChange={e => setDay(d, { endTime: e.target.value })}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        size="sm"
        data-testid="employee-save-working-week"
        disabled={saving || loading}
        onClick={() => void saveWeek()}
      >
        {saving ? 'Saving…' : 'Save week to server'}
      </Button>
    </div>
  )
}
