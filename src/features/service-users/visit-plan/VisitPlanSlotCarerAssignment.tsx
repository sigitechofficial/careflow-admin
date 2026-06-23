import * as React from 'react'
import { Clock, Loader2, Users, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { toastWarning } from '@/shared/lib/toast'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import type { VisitPlanCarerCandidate, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { slotAssignedEmployeeIds } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { VisitPlanCarerCandidateDetails } from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
import { VisitPlanSlotCarerByDaySummaryList } from '@/features/service-users/visit-plan/VisitPlanSlotCarerByDaySummaryList'
import {
  carerCandidatesByEmployeeId,
  visitPlanSuggestIncludeEmployeeIds,
} from '@/features/service-users/visit-plan/visit-plan-carer-availability-warning.util'
import {
  groupCarerAssignments,
  slotHasCarerByDayAssignments,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'

type Props = {
  serviceUserId: string
  slot: VisitPlanSlot
  disabled?: boolean
  /** When false, carer suggestions are not fetched (e.g. modal closed). */
  active?: boolean
  /** Omit outer panel border when rendered inside a dialog. */
  embedded?: boolean
  onChange: (assignedEmployeeIds: string[]) => void
}

function candidateCardClass(options: {
  selected: boolean
  blocked: boolean
  rotaConflict: boolean
  atLimit?: boolean
}) {
  return cn(
    'rounded-lg border px-3 py-3 transition-colors',
    options.selected
      ? 'border-sky-400 bg-sky-50/50 ring-1 ring-sky-200 dark:border-sky-700 dark:bg-sky-950/30 dark:ring-sky-900'
      : 'border-border bg-card hover:border-border/80',
    options.rotaConflict && 'border-red-200 dark:border-red-900',
    options.blocked && 'border-red-100 dark:border-red-950',
    options.atLimit && !options.selected && 'opacity-75',
  )
}

export function VisitPlanSlotCarerAssignment({
  serviceUserId,
  slot,
  disabled,
  active = true,
  embedded,
  onChange,
}: Props) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [candidates, setCandidates] = React.useState<VisitPlanCarerCandidate[]>([])
  const [requiredSkills, setRequiredSkills] = React.useState<string[]>([])
  const [carerSearch, setCarerSearch] = React.useState('')

  const assignedIds = slotAssignedEmployeeIds(slot)
  const selected = new Set(assignedIds)
  const maxCarers = slot.requiredCarers || 1
  const hasCarerByDay = slotHasCarerByDayAssignments(slot)
  const nameLookupIds = React.useMemo(() => {
    const ids = new Set(assignedIds)
    for (const row of slot.carerAssignments ?? []) {
      if (row.employeeId?.trim()) ids.add(row.employeeId.trim())
    }
    return [...ids]
  }, [assignedIds, slot.carerAssignments])
  const employeeNameById = useEmployeeNameMap(nameLookupIds)

  const removeAssigned = (employeeId: string) => {
    if (disabled) return
    onChange(assignedIds.filter((id) => id !== employeeId))
  }

  const clearAssigned = () => {
    if (disabled) return
    onChange([])
  }

  const notifyRotaConflict = React.useCallback(() => {
    toastWarning('Carer not assigned', CARER_ROTA_CONFLICT_MESSAGE)
  }, [])

  const loadSuggestions = React.useCallback(async () => {
    if (!serviceUserId) return
    setLoading(true)
    setError(null)
    try {
      const data = await suggestVisitPlanCarers(serviceUserId, {
        slotCode: slot.slotCode,
        daysOfWeek: slot.daysOfWeek,
        plannedStartTime: slot.plannedStartTime,
        plannedEndTime: slot.plannedEndTime,
        requiredCarers: slot.requiredCarers,
        linkedCarePlanFormIds: slot.linkedCarePlanFormIds,
        includeEmployeeIds: visitPlanSuggestIncludeEmployeeIds(slot),
      })
      setCandidates(data.candidates ?? [])
      setRequiredSkills(data.requiredSkillKeywords ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load carer suggestions')
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [
    serviceUserId,
    slot.slotCode,
    slot.daysOfWeek,
    slot.plannedStartTime,
    slot.plannedEndTime,
    slot.requiredCarers,
    slot.linkedCarePlanFormIds,
    slot.carerAssignments,
    slot.assignedEmployeeIds,
  ])

  React.useEffect(() => {
    if (!active) return
    setCarerSearch('')
    void loadSuggestions()
  }, [active, loadSuggestions])

  const toggle = (employeeId: string, blocked: boolean, rotaConflict: boolean) => {
    if (disabled || blocked || rotaConflict) {
      if (rotaConflict) notifyRotaConflict()
      return
    }
    if (maxCarers === 1) {
      onChange(selected.has(employeeId) ? [] : [employeeId])
      return
    }
    const next = new Set(selected)
    if (next.has(employeeId)) {
      next.delete(employeeId)
    } else if (next.size < maxCarers) {
      next.add(employeeId)
    }
    onChange([...next])
  }

  const displayCandidates = React.useMemo(() => {
    const byId = new Map(candidates.map((c) => [c.employeeId, c]))
    for (const id of assignedIds) {
      if (byId.has(id)) continue
      byId.set(id, {
        employeeId: id,
        displayName: resolveEmployeeDisplayName(employeeNameById, id),
        role: null,
        jobTitle: null,
        fit: 'partial',
        isPreferred: false,
        isBlocked: false,
        availability: {
          availableDays: [],
          unavailableDays: [],
          timeWindowOk: true,
          summary: 'Currently assigned — refresh to load full availability',
        },
        skills: { matched: [], missing: [] },
        complianceIssues: 0,
        warnings: ['Currently assigned to this slot'],
      })
    }
    return [...byId.values()]
  }, [assignedIds, candidates, employeeNameById])

  const assignedCarerCandidatesByEmployeeId = React.useMemo(
    () => carerCandidatesByEmployeeId(displayCandidates),
    [displayCandidates],
  )

  const showBlockedCarers = useShowBlockedCarersInSchedule()

  const visibleCandidates = React.useMemo(() => {
    if (showBlockedCarers) return displayCandidates
    return displayCandidates.filter((c) => !c.isBlocked)
  }, [displayCandidates, showBlockedCarers])

  const searchFilteredCandidates = React.useMemo(() => {
    const q = carerSearch.trim().toLowerCase()
    if (!q) return visibleCandidates
    return visibleCandidates.filter((c) => {
      const haystack = [c.displayName, c.role, c.jobTitle].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q) || c.employeeId.toLowerCase().includes(q)
    })
  }, [visibleCandidates, carerSearch])

  const singleSelectValue = maxCarers === 1 ? (assignedIds[0] ?? '') : undefined
  const slotDayLabels = slot.daysOfWeek.map((d) => VISIT_PLAN_DAY_LABELS[d]).join(', ')

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col gap-4 bg-background',
        embedded ? 'p-0' : 'rounded-lg border border-dashed border-border p-4',
      )}
    >
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Visit slot</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {slot.plannedStartTime}–{slot.plannedEndTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {maxCarers} carer{maxCarers === 1 ? '' : 's'} required
              </span>
            </div>
            {slot.daysOfWeek.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Days:
                </span>
                {slot.daysOfWeek.map((day) => (
                  <span
                    key={day}
                    className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium"
                  >
                    {VISIT_PLAN_DAY_LABELS[day]}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Select weekdays for this visit before assigning carers.
              </p>
            )}
            {requiredSkills.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Skills from care plans: {requiredSkills.join(', ')}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || disabled}
            onClick={() => void loadSuggestions()}
          >
            {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </div>

      {assignedIds.length > 0 || (hasCarerByDay && groupCarerAssignments(slot.carerAssignments).length > 0) ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {hasCarerByDay ? 'Assigned carers by day' : 'Currently assigned'}
            </h3>
            {!disabled && assignedIds.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAssigned}>
                Remove all
              </Button>
            ) : null}
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-3 dark:border-sky-800 dark:bg-sky-950/20">
            {hasCarerByDay ? (
              <VisitPlanSlotCarerByDaySummaryList
                slot={slot}
                employeeNameById={employeeNameById}
                disabled={disabled}
                variant="sky"
                onRemoveEmployee={removeAssigned}
                carerCandidatesByEmployeeId={assignedCarerCandidatesByEmployeeId}
              />
            ) : (
              <ul className="space-y-3">
                {assignedIds.map((id) => {
                  const candidate = assignedCarerCandidatesByEmployeeId.get(id)
                  return (
                    <li
                      key={id}
                      className="flex items-start gap-3 rounded-lg border border-sky-200 bg-background px-3 py-3 dark:border-sky-800"
                    >
                      {candidate ? (
                        <VisitPlanCarerCandidateDetails
                          candidate={candidate}
                          slotDaysOfWeek={slot.daysOfWeek}
                          showSkills={false}
                        />
                      ) : (
                        <p className="text-sm font-medium">{resolveEmployeeDisplayName(employeeNameById, id)}</p>
                      )}
                      {!disabled ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-full p-1 text-sky-700 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900"
                          aria-label={`Remove ${resolveEmployeeDisplayName(employeeNameById, id)}`}
                          onClick={() => removeAssigned(id)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {hasCarerByDay
                ? 'Day-specific rules from advanced settings. Availability reflects working pattern and existing rota bookings.'
                : `Assigned for ${slotDayLabels || 'selected days'}. Save the visit plan, then generate rota to apply.`}
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Suggested carers</h3>
            <p className="text-xs text-muted-foreground">
              Working pattern, rota bookings, skills, and preferences are shown for each carer.
            </p>
          </div>
          {visibleCandidates.length > 0 ? (
            <Input
              type="search"
              value={carerSearch}
              onChange={(e) => setCarerSearch(e.target.value)}
              placeholder="Search by name or role…"
              disabled={disabled}
              aria-label="Search carers"
              className="h-9 w-full sm:max-w-xs"
            />
          ) : null}
        </div>

        {loading && candidates.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading carer availability…
          </div>
        ) : null}

        {!loading && candidates.length === 0 && !error ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No active employees found.
          </p>
        ) : null}

        <ul className="max-h-[min(42vh,22rem)] space-y-2 overflow-y-auto pr-1">
          {searchFilteredCandidates.length === 0 && visibleCandidates.length > 0 && carerSearch.trim() ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">No carers match your search.</li>
          ) : null}
          {maxCarers === 1 ? (
            <RadioGroup
              value={singleSelectValue}
              onValueChange={(employeeId) => {
                if (disabled) return
                const candidate = searchFilteredCandidates.find((c) => c.employeeId === employeeId)
                if (candidate?.isBlocked) return
                if (candidate?.hasRotaConflict) {
                  notifyRotaConflict()
                  return
                }
                onChange(employeeId ? [employeeId] : [])
              }}
              className="space-y-2"
            >
              {searchFilteredCandidates.map((c) => {
                const blocked = c.isBlocked
                const rotaConflict = Boolean(c.hasRotaConflict)
                const isSelected = singleSelectValue === c.employeeId
                return (
                  <li
                    key={c.employeeId}
                    className={candidateCardClass({
                      selected: isSelected,
                      blocked,
                      rotaConflict,
                    })}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={c.employeeId}
                        disabled={disabled || blocked || rotaConflict}
                        className="mt-1.5 shrink-0"
                        aria-label={`Assign ${c.displayName}`}
                      />
                      <VisitPlanCarerCandidateDetails
                        candidate={c}
                        slotDaysOfWeek={slot.daysOfWeek}
                        blocked={blocked}
                      />
                    </div>
                  </li>
                )
              })}
            </RadioGroup>
          ) : (
            searchFilteredCandidates.map((c) => {
              const checked = selected.has(c.employeeId)
              const blocked = c.isBlocked
              const rotaConflict = Boolean(c.hasRotaConflict)
              const atLimit = !checked && selected.size >= maxCarers
              return (
                <li
                  key={c.employeeId}
                  className={candidateCardClass({
                    selected: checked,
                    blocked,
                    rotaConflict,
                    atLimit,
                  })}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checked}
                      disabled={disabled || blocked || rotaConflict || atLimit}
                      onCheckedChange={() => toggle(c.employeeId, blocked, rotaConflict)}
                      className="mt-1.5 shrink-0"
                      aria-label={`Assign ${c.displayName}`}
                    />
                    <VisitPlanCarerCandidateDetails
                      candidate={c}
                      slotDaysOfWeek={slot.daysOfWeek}
                      blocked={blocked}
                    />
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </section>

      <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
        {selected.size > 0 ? (
          <p>
            <span className="font-medium text-foreground">{selected.size}</span> of {maxCarers} carer
            {maxCarers === 1 ? '' : 's'} selected
            {selected.size < maxCarers ? ` · ${maxCarers - selected.size} more needed` : ''}. Changes apply when
            you save the visit plan and generate rota.
          </p>
        ) : (
          <p>No carers selected yet for this call slot.</p>
        )}
      </footer>
    </div>
  )
}
