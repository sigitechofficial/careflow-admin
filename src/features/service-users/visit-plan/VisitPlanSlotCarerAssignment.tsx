import * as React from 'react'
import { CheckCircle2, Clock, Loader2, Users, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  contentHelperClass,
  contentOverlineClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import { Input } from '@/shared/ui/input'
import { Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import { showCarerNotAssignedRotaConflictToast } from '@/features/scheduling/utils/schedule-carer-rota-toast.util'
import { visitPlanCarerCandidateCardClass } from '@/features/service-users/visit-plan/visit-plan-carer-candidate-card.util'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import type { VisitPlanCarerCandidate, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import {
  promoteEmployeeToLeadOrder,
  slotAssignedEmployeeIds,
  slotCarerRoleForEmployee,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { VisitPlanCarerCandidateDetails } from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
import { VisitPlanCarerRoleBadge } from '@/features/service-users/visit-plan/VisitPlanCarerRoleBadge'
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
  justAssigned?: boolean
}) {
  return visitPlanCarerCandidateCardClass(options)
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
  const [locationFilterApplied, setLocationFilterApplied] = React.useState(false)
  const [carerSearch, setCarerSearch] = React.useState('')
  const [justAssignedIds, setJustAssignedIds] = React.useState<Set<string>>(() => new Set())
  const assignedSectionRef = React.useRef<HTMLElement | null>(null)
  const flashTimeoutRef = React.useRef<number | null>(null)

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

  const celebrateAssignment = React.useCallback((addedIds: string[]) => {
    if (addedIds.length === 0) return
    if (flashTimeoutRef.current != null) window.clearTimeout(flashTimeoutRef.current)
    setJustAssignedIds(new Set(addedIds))
    flashTimeoutRef.current = window.setTimeout(() => {
      setJustAssignedIds(new Set())
      flashTimeoutRef.current = null
    }, 900)
    requestAnimationFrame(() => {
      assignedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  React.useEffect(() => {
    return () => {
      if (flashTimeoutRef.current != null) window.clearTimeout(flashTimeoutRef.current)
    }
  }, [])

  const applyAssignment = React.useCallback(
    (nextIds: string[]) => {
      const previouslyAssigned = new Set(assignedIds)
      const added = nextIds.filter((id) => !previouslyAssigned.has(id))
      onChange(nextIds)
      celebrateAssignment(added)
    },
    [assignedIds, celebrateAssignment, onChange],
  )

  const removeAssigned = (employeeId: string) => {
    if (disabled) return
    onChange(assignedIds.filter((id) => id !== employeeId))
  }

  const clearAssigned = () => {
    if (disabled) return
    onChange([])
  }

  const makeLead = (employeeId: string) => {
    if (disabled || maxCarers <= 1) return
    onChange(promoteEmployeeToLeadOrder(assignedIds, employeeId))
  }

  const showRoles = maxCarers > 1

  const notifyRotaConflict = React.useCallback(() => {
    showCarerNotAssignedRotaConflictToast()
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
      setLocationFilterApplied(data.locationFilterApplied ?? false)
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
    setJustAssignedIds(new Set())
    void loadSuggestions()
  }, [active, loadSuggestions])

  const toggle = (employeeId: string, blocked: boolean, rotaConflict: boolean) => {
    if (disabled || blocked || rotaConflict) {
      if (rotaConflict) notifyRotaConflict()
      return
    }
    if (maxCarers === 1) {
      applyAssignment(selected.has(employeeId) ? [] : [employeeId])
      return
    }
    const next = new Set(selected)
    if (next.has(employeeId)) {
      next.delete(employeeId)
      onChange([...next])
      return
    }
    if (next.size < maxCarers) {
      next.add(employeeId)
      applyAssignment([...next])
    }
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
            <p className={contentTitleClass}>Visit slot</p>
            <div className={cn('flex flex-wrap gap-3', contentHelperClass)}>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {slot.plannedStartTime}–{slot.plannedEndTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {maxCarers} carer{maxCarers === 1 ? '' : 's'} required
                {showRoles ? ' · Lead + Secondary' : ''}
              </span>
            </div>
            {slot.daysOfWeek.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={contentOverlineClass}>Days:</span>
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
              <p className={contentHelperClass}>
                Select weekdays for this visit before assigning carers.
              </p>
            )}
            {requiredSkills.length > 0 ? (
              <p className={contentHelperClass}>Skills from care plans: {requiredSkills.join(', ')}</p>
            ) : null}
            {locationFilterApplied ? (
              <p className={contentHelperClass}>
                Showing carers assigned to this service user&apos;s location (including all-zone access).
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
        <section
          ref={assignedSectionRef}
          className={cn('space-y-2', justAssignedIds.size > 0 && 'animate-fade-in')}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={cn(contentTitleClass, 'inline-flex items-center gap-1.5')}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {hasCarerByDay ? 'Assigned carers by day' : 'Currently assigned'}
            </h3>
            {!disabled && assignedIds.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAssigned}>
                Remove all
              </Button>
            ) : null}
          </div>
          <div
            className={cn(
              'rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-3 dark:border-sky-800 dark:bg-sky-950/20',
              justAssignedIds.size > 0 && 'animate-assign-flash ring-2 ring-sky-300/60 dark:ring-sky-700',
            )}
          >
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
                  const justAssigned = justAssignedIds.has(id)
                  const role = slotCarerRoleForEmployee(slot, id)
                  return (
                    <li
                      key={id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border border-sky-200 bg-background px-3 py-3 dark:border-sky-800',
                        justAssigned &&
                          'animate-assign-pop border-emerald-300 ring-2 ring-emerald-200/80 dark:border-emerald-700 dark:ring-emerald-900',
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        {showRoles ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <VisitPlanCarerRoleBadge role={role} />
                            {role === 'SECONDARY' && !disabled ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => makeLead(id)}
                              >
                                Make lead
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                        {candidate ? (
                          <VisitPlanCarerCandidateDetails
                            candidate={candidate}
                            slotDaysOfWeek={slot.daysOfWeek}
                            showSkills={false}
                            isAssigned
                            justAssigned={justAssigned}
                          />
                        ) : (
                          <p className="inline-flex flex-wrap items-center gap-2 text-sm font-medium">
                            {resolveEmployeeDisplayName(employeeNameById, id)}
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100',
                                justAssigned && 'animate-assign-pop',
                              )}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                              Assigned
                            </span>
                          </p>
                        )}
                      </div>
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
            <p className={cn('mt-3 leading-relaxed', contentHelperClass)}>
              {hasCarerByDay
                ? 'Day-specific rules from advanced settings. Availability reflects working pattern and existing rota bookings.'
                : showRoles
                  ? `First assigned carer is Lead; others are Secondary. Use “Make lead” to change. Assigned for ${slotDayLabels || 'selected days'}.`
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
            <h3 className={contentTitleClass}>Suggested carers</h3>
            <p className={contentHelperClass}>
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
                applyAssignment(employeeId ? [employeeId] : [])
              }}
              className="space-y-2"
            >
              {searchFilteredCandidates.map((c) => {
                const blocked = c.isBlocked
                const rotaConflict = Boolean(c.hasRotaConflict)
                const isSelected = singleSelectValue === c.employeeId
                const justAssigned = justAssignedIds.has(c.employeeId)
                const selectable = !disabled && !blocked && !rotaConflict
                return (
                  <li
                    key={c.employeeId}
                    className={candidateCardClass({
                      selected: isSelected,
                      blocked,
                      rotaConflict,
                      justAssigned,
                    })}
                    onClick={() => {
                      if (!selectable) {
                        if (rotaConflict) notifyRotaConflict()
                        return
                      }
                      applyAssignment(isSelected ? [] : [c.employeeId])
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={c.employeeId}
                        disabled={disabled || blocked || rotaConflict}
                        className="mt-1.5 shrink-0"
                        aria-label={`Assign ${c.displayName}`}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <VisitPlanCarerCandidateDetails
                        candidate={c}
                        slotDaysOfWeek={slot.daysOfWeek}
                        blocked={blocked}
                        isAssigned={isSelected}
                        justAssigned={justAssigned}
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
              const justAssigned = justAssignedIds.has(c.employeeId)
              const selectable = !disabled && !blocked && !rotaConflict && !atLimit
              return (
                <li
                  key={c.employeeId}
                  className={candidateCardClass({
                    selected: checked,
                    blocked,
                    rotaConflict,
                    atLimit,
                    justAssigned,
                  })}
                  onClick={() => {
                    if (checked) {
                      toggle(c.employeeId, blocked, rotaConflict)
                      return
                    }
                    if (!selectable) {
                      if (rotaConflict) notifyRotaConflict()
                      return
                    }
                    toggle(c.employeeId, blocked, rotaConflict)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checked}
                      disabled={disabled || blocked || rotaConflict || atLimit}
                      onCheckedChange={() => toggle(c.employeeId, blocked, rotaConflict)}
                      className="mt-1.5 shrink-0"
                      aria-label={`Assign ${c.displayName}`}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <VisitPlanCarerCandidateDetails
                      candidate={c}
                      slotDaysOfWeek={slot.daysOfWeek}
                      blocked={blocked}
                      isAssigned={checked}
                      justAssigned={justAssigned}
                    />
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </section>

      <footer className={cn('border-t border-border pt-3', contentHelperClass)}>
        {selected.size > 0 ? (
          <p className="inline-flex flex-wrap items-center gap-1.5">
            <CheckCircle2
              className={cn(
                'h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400',
                justAssignedIds.size > 0 && 'animate-assign-pop',
              )}
              aria-hidden
            />
            <span className="font-medium text-foreground">{selected.size}</span> of {maxCarers} carer
            {maxCarers === 1 ? '' : 's'} selected
            {selected.size < maxCarers ? ` · ${maxCarers - selected.size} more needed` : ' · ready for this slot'}
            . Changes apply when you save the visit plan and generate rota.
          </p>
        ) : (
          <p>No carers selected yet for this call slot.</p>
        )}
      </footer>
    </div>
  )
}
