import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ApiError } from '@/shared/api/api-client'
import type { BulkReplaceWorkingPatternsPayload, WorkingPatternDay, WorkingPatternRow } from '@/features/employees/types'
import {
  previewEmployeeWorkingPatternImpact,
  type EmployeeWorkingPatternVisitSlotImpact,
} from '@/features/employees/api/employees.api'
import {
  DEFAULT_WORK_PATTERN_END,
  DEFAULT_WORK_PATTERN_START,
  WORKING_PATTERN_DAY_ORDER,
} from '@/features/employees/constants/working-pattern'
import { useReplaceWorkingPatternsBulk, useWorkingPatterns } from '@/features/employees/hooks/useEmployeeProfileExtras'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { Label } from '@/shared/ui/form-field'
import { toastSuccess } from '@/shared/lib/toast'
import { VisitPlanCarerAvailabilityRow } from '@/features/service-users/visit-plan/VisitPlanCarerAvailabilityBreakdown'
import { getPatternConflictTimeMessages } from '@/features/service-users/visit-plan/visit-plan-carer-pattern-conflict-display.util'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

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

const AVAILABILITY_LEVEL_HINT: Record<AvailabilityLevel, string> = {
  Fully:
    'Available for the full shift. Start and end times apply on the rota and when matching visits.',
  Partial:
    'Might be available — not guaranteed. Rota shows “possibly available”; times are a guide only.',
  None: 'Not working this day. Unavailable on the rota and in visit carer suggestions.',
}

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
        <Tooltip key={x}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={value === x}
              aria-label={`${x}: ${AVAILABILITY_LEVEL_HINT[x]}`}
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
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left leading-snug">
            {AVAILABILITY_LEVEL_HINT[x]}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

type DayState = {
  startTime: string
  endTime: string
  level: AvailabilityLevel
}

type FortnightState = {
  cycleWeeks: 1 | 2
  cycleAnchorDate: string
  weeks: Record<1 | 2, Record<WorkingPatternDay, DayState>>
}

function emptyDay(): DayState {
  return { startTime: DEFAULT_WORK_PATTERN_START, endTime: DEFAULT_WORK_PATTERN_END, level: 'None' }
}

function emptyFortnight(defaultAnchor: string): FortnightState {
  const weeks = { 1: {} as Record<WorkingPatternDay, DayState>, 2: {} as Record<WorkingPatternDay, DayState> }
  for (const week of [1, 2] as const) {
    for (const d of WORKING_PATTERN_DAY_ORDER) {
      weeks[week][d] = emptyDay()
    }
  }
  return { cycleWeeks: 1, cycleAnchorDate: defaultAnchor, weeks }
}

function mergeFromApi(
  rows: WorkingPatternRow[],
  meta: { cycleWeeks: number; cycleAnchorDate: string | null },
  defaultAnchor: string,
): FortnightState {
  const state = emptyFortnight(meta.cycleAnchorDate ?? defaultAnchor)
  state.cycleWeeks = meta.cycleWeeks === 2 ? 2 : 1

  for (const r of rows) {
    const week = (r.weekInCycle === 2 ? 2 : 1) as 1 | 2
    const d = r.dayOfWeek as WorkingPatternDay
    if (!(WORKING_PATTERN_DAY_ORDER as readonly string[]).includes(d)) continue
    state.weeks[week][d] = {
      startTime: r.startTime ?? DEFAULT_WORK_PATTERN_START,
      endTime: r.endTime ?? DEFAULT_WORK_PATTERN_END,
      level: levelFromRow(r),
    }
  }
  return state
}

function buildBulkPayload(state: FortnightState): BulkReplaceWorkingPatternsPayload {
  const weeks = []
  for (const weekIndex of [1, 2] as const) {
    if (weekIndex === 2 && state.cycleWeeks === 1) continue
    for (const d of WORKING_PATTERN_DAY_ORDER) {
      const row = state.weeks[weekIndex][d]
      if (row.level === 'None') {
        weeks.push({
          weekInCycle: weekIndex,
          dayOfWeek: d,
          isAvailable: false,
        })
        continue
      }
      weeks.push({
        weekInCycle: weekIndex,
        dayOfWeek: d,
        startTime: row.startTime.trim() || undefined,
        endTime: row.endTime.trim() || undefined,
        isAvailable: true,
        notes: row.level === 'Partial' ? 'partial' : undefined,
      })
    }
  }
  return {
    cycleWeeks: state.cycleWeeks,
    cycleAnchorDate: state.cycleAnchorDate || undefined,
    weeks,
  }
}

function VisitSlotImpactList({ impacts }: { impacts: EmployeeWorkingPatternVisitSlotImpact[] }) {
  return (
    <ul className="mt-2 space-y-2 text-left text-sm">
      {impacts.map((impact) => {
        const timeMismatchMessages = getPatternConflictTimeMessages(impact)
        const hasUnavailable = impact.unavailableDayLabels.length > 0
        const hasTimeMismatch = timeMismatchMessages.length > 0

        return (
          <li
            key={`${impact.serviceUserId}:${impact.slotCode}:${impact.summary}`}
            className="rounded-md border border-amber-200/80 bg-white/70 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/20"
          >
            <p className="font-medium text-foreground">
              {impact.serviceUserName} · {impact.slotLabel}
            </p>

            {hasUnavailable || hasTimeMismatch ? (
              <div className="mt-2 space-y-2.5">
                {hasUnavailable ? (
                  <VisitPlanCarerAvailabilityRow
                    icon={<XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden />}
                    label="Not working on"
                  >
                    <p className="font-medium text-red-900 dark:text-red-100">
                      {impact.unavailableDayLabels.join(', ')}
                    </p>
                  </VisitPlanCarerAvailabilityRow>
                ) : null}

                {hasTimeMismatch ? (
                  <div className="space-y-1.5 border-t border-border/60 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                      Visit vs working hours
                    </p>
                    <ul className="space-y-1.5">
                      {timeMismatchMessages.map((message) => (
                        <li
                          key={message}
                          className="flex items-start gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1.5 text-xs leading-snug text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                        >
                          <AlertTriangle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                            aria-hidden
                          />
                          <span>{message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-amber-950/90 dark:text-amber-100">{impact.summary}</p>
            )}

            {impact.serviceUserId ? (
              <Link
                to="/service-users/$serviceUserId/visit-plan"
                params={{ serviceUserId: impact.serviceUserId }}
                className="mt-2 inline-block text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Open visit plan
              </Link>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function WeekGrid({
  weekLabel,
  weekIndex,
  week,
  onDayChange,
  disabled,
}: {
  weekLabel: string
  weekIndex: 1 | 2
  week: Record<WorkingPatternDay, DayState>
  onDayChange: (weekIndex: 1 | 2, day: WorkingPatternDay, patch: Partial<DayState>) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">Working pattern</div>
        <div className="text-xs text-muted-foreground">{weekLabel}</div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Day', 'Availability', 'Available start', 'Available end'].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">
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
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{DAY_LABEL[d]}</td>
                  <td className="min-w-[12rem] px-3 py-2.5 align-top">
                    <AvailabilityPills
                      value={row.level}
                      disabled={disabled}
                      onChange={next => onDayChange(weekIndex, d, { level: next })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="time"
                      className="h-9 w-[8.5rem]"
                      disabled={disabled}
                      value={row.startTime}
                      onChange={e => onDayChange(weekIndex, d, { startTime: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="time"
                      className="h-9 w-[8.5rem]"
                      disabled={disabled}
                      value={row.endTime}
                      onChange={e => onDayChange(weekIndex, d, { endTime: e.target.value })}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EmployeeFortnightPatternEditor({
  employeeId,
  apiReady,
  enabled,
  employmentStartDate,
}: {
  employeeId: string | null
  apiReady: boolean
  enabled: boolean
  employmentStartDate?: string
}) {
  const defaultAnchor = employmentStartDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  const patternsQuery = useWorkingPatterns(employeeId, !!employeeId && apiReady)
  const bulkMutation = useReplaceWorkingPatternsBulk(employeeId ?? '')

  const [state, setState] = React.useState<FortnightState>(() => emptyFortnight(defaultAnchor))
  const [savedPayloadJson, setSavedPayloadJson] = React.useState<string | null>(null)
  const [visitSlotImpacts, setVisitSlotImpacts] = React.useState<EmployeeWorkingPatternVisitSlotImpact[]>([])
  const [scheduledVisitsUnassigned, setScheduledVisitsUnassigned] = React.useState(0)
  const [impactLoading, setImpactLoading] = React.useState(false)
  const [modifyAssignments, setModifyAssignments] = React.useState(false)
  const [respectWorkingPatternOnSync, setRespectWorkingPatternOnSync] = React.useState(true)
  const [confirmSaveOpen, setConfirmSaveOpen] = React.useState(false)
  const loading = patternsQuery.isLoading
  const saving = bulkMutation.isPending
  const [actionError, setActionError] = React.useState<string | null>(null)
  const error =
    actionError ??
    (patternsQuery.error instanceof ApiError
      ? patternsQuery.error.message
      : patternsQuery.error
        ? 'Could not load working patterns.'
        : null)

  React.useEffect(() => {
    if (!employeeId || !apiReady) {
      setState(emptyFortnight(defaultAnchor))
      setSavedPayloadJson(null)
      return
    }
    if (patternsQuery.data) {
      const merged = mergeFromApi(patternsQuery.data.rows, patternsQuery.data.meta, defaultAnchor)
      setState(merged)
      setSavedPayloadJson(JSON.stringify(buildBulkPayload(merged)))
    }
  }, [employeeId, apiReady, patternsQuery.data, defaultAnchor])

  const bulkPayload = React.useMemo(() => buildBulkPayload(state), [state])
  const savePayload = React.useMemo(
    (): BulkReplaceWorkingPatternsPayload => ({
      ...bulkPayload,
      ...(modifyAssignments
        ? { syncAssignments: true, respectWorkingPatternOnSync }
        : {}),
    }),
    [bulkPayload, modifyAssignments, respectWorkingPatternOnSync],
  )
  const payloadJson = React.useMemo(() => JSON.stringify(savePayload), [savePayload])
  const patternDirty = savedPayloadJson != null && payloadJson !== savedPayloadJson

  React.useEffect(() => {
    if (!employeeId || !apiReady || !patternDirty) {
      setVisitSlotImpacts([])
      setScheduledVisitsUnassigned(0)
      setImpactLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setImpactLoading(true)
        try {
          const preview = await previewEmployeeWorkingPatternImpact(employeeId, savePayload)
          if (!cancelled) {
            setVisitSlotImpacts(preview.visitSlots)
            setScheduledVisitsUnassigned(preview.scheduledVisitsUnassigned ?? 0)
          }
        } catch {
          if (!cancelled) {
            setVisitSlotImpacts([])
            setScheduledVisitsUnassigned(0)
          }
        } finally {
          if (!cancelled) setImpactLoading(false)
        }
      })()
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [employeeId, apiReady, patternDirty, savePayload, payloadJson])

  const setDay = (weekIndex: 1 | 2, day: WorkingPatternDay, patch: Partial<DayState>) => {
    setState(prev => ({
      ...prev,
      weeks: {
        ...prev.weeks,
        [weekIndex]: { ...prev.weeks[weekIndex], [day]: { ...prev.weeks[weekIndex][day], ...patch } },
      },
    }))
  }

  const savePattern = async () => {
    if (!employeeId || !apiReady) return
    setActionError(null)
    try {
      await bulkMutation.mutateAsync(savePayload)
      setSavedPayloadJson(payloadJson)
      setVisitSlotImpacts([])
      setScheduledVisitsUnassigned(0)
      setConfirmSaveOpen(false)
      if (modifyAssignments && respectWorkingPatternOnSync && scheduledVisitsUnassigned > 0) {
        toastSuccess(
          'Working pattern saved',
          `${scheduledVisitsUnassigned} scheduled visit${scheduledVisitsUnassigned === 1 ? '' : 's'} unassigned outside the new pattern.`,
        )
      } else if (modifyAssignments) {
        toastSuccess('Working pattern saved', 'Rota assignments were kept as requested.')
      }
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save working pattern.')
    }
  }

  const handleSaveClick = () => {
    const hasAssignmentImpact =
      modifyAssignments &&
      respectWorkingPatternOnSync &&
      (visitSlotImpacts.length > 0 || scheduledVisitsUnassigned > 0)
    if (hasAssignmentImpact || visitSlotImpacts.length > 0) {
      setConfirmSaveOpen(true)
      return
    }
    void savePattern()
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">Save personal details first to store a working pattern.</p>
    )
  }

  if (!apiReady) {
    return <p className="text-sm text-muted-foreground">Sign in with API configured to save working patterns.</p>
  }

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Turn on <span className="font-medium text-foreground">Available for work</span> and{' '}
        <span className="font-medium text-foreground">Working pattern required</span> to edit the pattern.
      </p>
    )
  }

  return (
    <div className="space-y-4" data-testid="employee-fortnight-pattern-editor">
      <p className="text-xs text-muted-foreground">
        Configure Week 1 and Week 2 patterns. Both weeks are saved to the server and used by rota availability and
        visit-plan carer suggestions.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/20 p-4">
        <div className="space-y-1.5">
          <label htmlFor="cycle-weeks" className="text-sm font-medium text-foreground">Cycle length</label>
          <select
            id="cycle-weeks"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={state.cycleWeeks}
            onChange={e => setState(prev => ({ ...prev, cycleWeeks: Number(e.target.value) as 1 | 2 }))}
          >
            <option value={1}>1 week (standard)</option>
            <option value={2}>2 weeks (fortnight)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cycle-anchor" className="text-sm font-medium text-foreground">
            Cycle anchor (Week 1 starts)
          </label>
          <Input
            id="cycle-anchor"
            type="date"
            className="h-9 w-[11rem]"
            value={state.cycleAnchorDate}
            onChange={e => setState(prev => ({ ...prev, cycleAnchorDate: e.target.value }))}
          />
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-10', state.cycleWeeks === 2 && 'lg:grid-cols-2')}>
        <WeekGrid
          weekLabel="Week 1"
          weekIndex={1}
          week={state.weeks[1]}
          disabled={loading || saving}
          onDayChange={setDay}
        />
        {state.cycleWeeks === 2 ? (
          <WeekGrid
            weekLabel="Week 2"
            weekIndex={2}
            week={state.weeks[2]}
            disabled={loading || saving}
            onDayChange={setDay}
          />
        ) : null}
      </div>

      {patternDirty && (impactLoading || visitSlotImpacts.length > 0 || scheduledVisitsUnassigned > 0) ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30"
          data-testid="employee-working-pattern-visit-slot-warning"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div className="min-w-0 flex-1">
              {impactLoading ? (
                <p className="text-sm text-amber-950 dark:text-amber-50">Checking visit assignments…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-amber-950 dark:text-amber-50">
                    This pattern change may affect visit assignments.
                  </p>
                  {scheduledVisitsUnassigned > 0 && modifyAssignments && respectWorkingPatternOnSync ? (
                    <p className="mt-1 text-xs text-amber-900 dark:text-amber-100">
                      {scheduledVisitsUnassigned} scheduled visit
                      {scheduledVisitsUnassigned === 1 ? '' : 's'} would be unassigned if you choose to remove visits
                      outside the new working pattern.
                    </p>
                  ) : null}
                  {visitSlotImpacts.length > 0 ? (
                    <>
                      <p className="mt-1 text-xs text-amber-900 dark:text-amber-100">
                        Visit plan slot assignments that no longer match this pattern:
                      </p>
                      <VisitSlotImpactList impacts={visitSlotImpacts} />
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="modify-assignments"
            checked={modifyAssignments}
            disabled={loading || saving}
            onCheckedChange={(checked) => setModifyAssignments(checked === true)}
            aria-describedby="modify-assignments-hint"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <Label htmlFor="modify-assignments" className="text-sm font-medium text-foreground">
                Modify rota assignments
              </Label>
              <p id="modify-assignments-hint" className="mt-1 text-xs text-muted-foreground">
                When saving, update scheduled visit assignments for this carer based on the new working pattern.
              </p>
            </div>

            {modifyAssignments ? (
              <RadioGroup
                value={respectWorkingPatternOnSync ? 'respect' : 'keep'}
                onValueChange={(value) => setRespectWorkingPatternOnSync(value === 'respect')}
                className="space-y-2"
              >
                <label
                  htmlFor="assignment-respect-pattern"
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-3 py-2.5"
                >
                  <RadioGroupItem
                    id="assignment-respect-pattern"
                    value="respect"
                    disabled={loading || saving}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-sm leading-snug">
                    <span className="font-medium text-foreground">Unassign visits outside the new pattern</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Future scheduled visits on days or times that no longer match this working pattern will be left
                      unassigned.
                    </span>
                  </span>
                </label>
                <label
                  htmlFor="assignment-keep-all"
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-3 py-2.5"
                >
                  <RadioGroupItem
                    id="assignment-keep-all"
                    value="keep"
                    disabled={loading || saving}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-sm leading-snug">
                    <span className="font-medium text-foreground">Keep all current visit assignments</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Save the working pattern only. Existing rota allocations stay assigned even when outside the new
                      hours.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            ) : null}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        data-testid="employee-save-working-pattern"
        disabled={saving || loading || !patternDirty}
        onClick={handleSaveClick}
      >
        {saving ? 'Saving…' : 'Save pattern'}
      </Button>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-left">Save working pattern?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                {modifyAssignments && respectWorkingPatternOnSync && scheduledVisitsUnassigned > 0 ? (
                  <p>
                    {scheduledVisitsUnassigned} scheduled visit
                    {scheduledVisitsUnassigned === 1 ? '' : 's'} will be unassigned because{' '}
                    {scheduledVisitsUnassigned === 1 ? 'it falls' : 'they fall'} outside the new working pattern.
                  </p>
                ) : null}
                {modifyAssignments && !respectWorkingPatternOnSync ? (
                  <p>Current visit assignments will stay on the rota even if they are outside the new working pattern.</p>
                ) : null}
                {visitSlotImpacts.length > 0 ? (
                  <>
                    <p>
                      {visitSlotImpacts.length} visit plan slot
                      {visitSlotImpacts.length === 1 ? '' : 's'} no longer match this pattern on some days.
                    </p>
                    <VisitSlotImpactList impacts={visitSlotImpacts} />
                  </>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void savePattern()}>
              {saving ? 'Saving…' : 'Save anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
