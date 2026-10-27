import * as React from 'react'
import { CheckCircle2, Clock, Loader2, Users, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  contentBodyClass,
  contentHelperClass,
  contentOverlineClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import { Input } from '@/shared/ui/input'
import { Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import { showCarerNotAssignedRotaConflictToast, showCarerNotAssignedComplianceToast } from '@/features/scheduling/utils/schedule-carer-rota-toast.util'
import { visitPlanCarerPickerRowClass } from '@/features/service-users/visit-plan/visit-plan-carer-candidate-card.util'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import type {
  VisitPlanCarerCandidate,
  VisitPlanCarerFit,
  VisitPlanSlot,
} from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import {
  formatRequiredCarersRoleHint,
  formatSlotCarerDisplayRole,
  promoteEmployeeToLeadOrder,
  slotAssignedEmployeeIds,
  slotCarerRoleForEmployee,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { fitLabel } from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
import { VisitPlanCarerPickerRow } from '@/features/service-users/visit-plan/VisitPlanCarerPickerRow'
import { visitPlanSlotVisitDurationMinutes } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
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

function candidateRowClass(options: {
  selected: boolean
  blocked: boolean
  rotaConflict: boolean
  complianceBlocked?: boolean
  atLimit?: boolean
  justAssigned?: boolean
}) {
  return visitPlanCarerPickerRowClass(options)
}

const FIT_GROUP_ORDER: VisitPlanCarerFit[] = ['good', 'partial', 'poor']

/** Keeps the API order (preferred first) inside each match group. */
function groupCandidatesByFit(candidates: VisitPlanCarerCandidate[]) {
  return FIT_GROUP_ORDER.map((fit) => ({
    fit,
    candidates: candidates.filter((c) => c.fit === fit),
  })).filter((group) => group.candidates.length > 0)
}

function FitGroupHeader({ fit, count }: { fit: VisitPlanCarerFit; count: number }) {
  return (
    <li
      role="presentation"
      className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"
    >
      {fitLabel(fit)} · {count}
    </li>
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
  const [locationFilterApplied, setLocationFilterApplied] = React.useState(false)
  const [carerSearch, setCarerSearch] = React.useState('')
  const [justAssignedIds, setJustAssignedIds] = React.useState<Set<string>>(() => new Set())
  const assignedSectionRef = React.useRef<HTMLElement | null>(null)
  const flashTimeoutRef = React.useRef<number | null>(null)

  const assignedIds = slotAssignedEmployeeIds(slot)
  const selected = new Set(assignedIds)
  const maxCarers = slot.requiredCarers || 1
  const hasCarerByDay = slotHasCarerByDayAssignments(slot)
  /** Rows for particular weekdays (set under "Different carers on different days"). */
  const hasDaySpecificCarers = (slot.carerAssignments ?? []).some((row) => row.dayOfWeek != null)
  /** Per-carer times or duration (split visits) need the detailed by-day card. */
  const hasCarerOwnTimes = (slot.carerAssignments ?? []).some(
    (row) => row.durationMinutes != null || Boolean(row.plannedStartTime) || Boolean(row.plannedEndTime),
  )
  const useByDayAssignedCard = hasCarerByDay && (hasDaySpecificCarers || hasCarerOwnTimes)
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

  const notifyComplianceBlock = React.useCallback(() => {
    showCarerNotAssignedComplianceToast()
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

  const toggle = (employeeId: string, blocked: boolean, rotaConflict: boolean, complianceBlocked: boolean) => {
    if (disabled || blocked || rotaConflict || complianceBlocked) {
      if (rotaConflict) notifyRotaConflict()
      else if (complianceBlocked) notifyComplianceBlock()
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
        complianceBlocksAllocation: false,
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
    // "Don't allow" allocation rules hide the carer, unless already on this slot.
    const allowed = displayCandidates.filter(
      (c) => !c.ruleBlocked || assignedIds.includes(c.employeeId),
    )
    if (showBlockedCarers) return allowed
    return allowed.filter((c) => !c.isBlocked)
  }, [assignedIds, displayCandidates, showBlockedCarers])

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
  const slotDurationMinutes = visitPlanSlotVisitDurationMinutes(slot)

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col gap-4 bg-background',
        embedded ? 'p-0' : 'rounded-lg border border-dashed border-border p-4',
      )}
    >
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5', contentHelperClass)}>
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {slot.plannedStartTime}–{slot.plannedEndTime}
              {slotDurationMinutes > 0 ? ` · ${slotDurationMinutes} min` : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {maxCarers} carer{maxCarers === 1 ? '' : 's'} required
              {showRoles ? ` · ${formatRequiredCarersRoleHint(maxCarers)}` : ''}
            </span>
            {slot.daysOfWeek.length > 0 ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                <span className={contentOverlineClass}>Days:</span>
                {slot.daysOfWeek.map((day) => (
                  <span
                    key={day}
                    className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {VISIT_PLAN_DAY_LABELS[day]}
                  </span>
                ))}
              </span>
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
        {slot.daysOfWeek.length === 0 || requiredSkills.length > 0 || locationFilterApplied ? (
          <div className={cn('mt-1.5 space-y-0.5', contentHelperClass)}>
            {slot.daysOfWeek.length === 0 ? (
              <p>Select weekdays for this visit before assigning carers.</p>
            ) : null}
            {requiredSkills.length > 0 ? <p>Skills from care plans: {requiredSkills.join(', ')}</p> : null}
            {locationFilterApplied ? (
              <p>Showing carers assigned to this service user&apos;s location (including all-zone access).</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {assignedIds.length > 0 || (hasCarerByDay && groupCarerAssignments(slot.carerAssignments).length > 0) ? (
        <section
          ref={assignedSectionRef}
          className={cn('space-y-2', justAssignedIds.size > 0 && 'animate-fade-in')}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={cn(contentTitleClass, 'inline-flex items-center gap-1.5')}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {hasDaySpecificCarers ? 'Assigned carers by day' : 'Currently assigned'}
            </h3>
            {!disabled && assignedIds.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAssigned}>
                Remove all
              </Button>
            ) : null}
          </div>
          <div
            className={cn(
              'overflow-hidden rounded-lg border border-sky-200 bg-sky-50/40 dark:border-sky-800 dark:bg-sky-950/20',
              useByDayAssignedCard && 'px-3 py-3',
              justAssignedIds.size > 0 && 'animate-assign-flash ring-2 ring-sky-300/60 dark:ring-sky-700',
            )}
          >
            {useByDayAssignedCard ? (
              <VisitPlanSlotCarerByDaySummaryList
                slot={slot}
                employeeNameById={employeeNameById}
                disabled={disabled}
                variant="sky"
                onRemoveEmployee={removeAssigned}
                carerCandidatesByEmployeeId={assignedCarerCandidatesByEmployeeId}
                hideTimeMismatch
              />
            ) : (
              <ul className="divide-y divide-sky-200 dark:divide-sky-800">
                {assignedIds.map((id) => {
                  const candidate = assignedCarerCandidatesByEmployeeId.get(id)
                  const justAssigned = justAssignedIds.has(id)
                  const role = slotCarerRoleForEmployee(slot, id)
                  const name = resolveEmployeeDisplayName(employeeNameById, id)
                  const removeButton = !disabled ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-1 text-sky-700 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900"
                      aria-label={`Remove ${name}`}
                      onClick={() => removeAssigned(id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null
                  const roleExtras = showRoles ? (
                    <>
                      <VisitPlanCarerRoleBadge role={role} label={formatSlotCarerDisplayRole(slot, id)} />
                      {role === 'SECONDARY' && !disabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => makeLead(id)}
                        >
                          Make lead
                        </Button>
                      ) : null}
                    </>
                  ) : null
                  return (
                    <li
                      key={id}
                      className={cn(
                        'bg-background/70 px-3 py-2.5',
                        justAssigned && 'animate-assign-pop bg-emerald-50/60 dark:bg-emerald-950/30',
                      )}
                    >
                      {candidate ? (
                        <VisitPlanCarerPickerRow
                          candidate={candidate}
                          slotDaysOfWeek={slot.daysOfWeek}
                          isAssigned
                          blocked={candidate.isBlocked}
                          control={
                            <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-300" aria-hidden />
                          }
                          nameExtras={roleExtras}
                          trailing={removeButton}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="inline-flex flex-1 flex-wrap items-center gap-2 text-sm font-medium">
                            {name}
                            {roleExtras}
                          </p>
                          {removeButton}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p
              className={cn(
                'leading-relaxed',
                contentHelperClass,
                useByDayAssignedCard ? 'mt-3' : 'border-t border-sky-200 px-3 py-2 dark:border-sky-800',
              )}
            >
              {hasDaySpecificCarers
                ? 'Day-specific rules from advanced settings. Availability reflects working pattern and existing rota bookings.'
                : showRoles
                  ? `First assigned carer is Lead; the next are ${maxCarers >= 3 ? 'Support 1, Support 2' : 'Secondary'}. Use “Make lead” to change. Assigned for ${slotDayLabels || 'selected days'}.`
                  : `Assigned for ${slotDayLabels || 'selected days'}. Save the visit plan to apply.`}
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

        {/* Inside a dialog the dialog body scrolls; a second scroll box here hid most carers. */}
        {visibleCandidates.length > 0 ? (
          <ul
            className={cn(
              'overflow-hidden rounded-lg border border-border',
              maxCarers > 1 && 'divide-y divide-border',
              !embedded && 'max-h-[min(42vh,22rem)] overflow-y-auto',
            )}
          >
            {searchFilteredCandidates.length === 0 && carerSearch.trim() ? (
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
                  if (candidate?.complianceBlocksAllocation) {
                    notifyComplianceBlock()
                    return
                  }
                  applyAssignment(employeeId ? [employeeId] : [])
                }}
                className="gap-0 divide-y divide-border"
              >
                {groupCandidatesByFit(searchFilteredCandidates).map((group) => (
                  <React.Fragment key={group.fit}>
                    <FitGroupHeader fit={group.fit} count={group.candidates.length} />
                    {group.candidates.map((c) => {
                      const blocked = c.isBlocked
                      const rotaConflict = Boolean(c.hasRotaConflict)
                      const complianceBlocked = Boolean(c.complianceBlocksAllocation)
                      const isSelected = singleSelectValue === c.employeeId
                      const justAssigned = justAssignedIds.has(c.employeeId)
                      const selectable = !disabled && !blocked && !rotaConflict && !complianceBlocked
                      return (
                        <li
                          key={c.employeeId}
                          className={candidateRowClass({
                            selected: isSelected,
                            blocked,
                            rotaConflict,
                            complianceBlocked,
                            justAssigned,
                          })}
                          onClick={() => {
                            if (!selectable) {
                              if (rotaConflict) notifyRotaConflict()
                              else if (complianceBlocked) notifyComplianceBlock()
                              return
                            }
                            applyAssignment(isSelected ? [] : [c.employeeId])
                          }}
                        >
                          <VisitPlanCarerPickerRow
                            candidate={c}
                            slotDaysOfWeek={slot.daysOfWeek}
                            isAssigned={isSelected}
                            blocked={blocked}
                            control={
                              <RadioGroupItem
                                value={c.employeeId}
                                disabled={disabled || blocked || rotaConflict || complianceBlocked}
                                className="shrink-0 border-foreground/50"
                                aria-label={`Assign ${c.displayName}`}
                                onClick={(event) => event.stopPropagation()}
                              />
                            }
                          />
                        </li>
                      )
                    })}
                  </React.Fragment>
                ))}
              </RadioGroup>
            ) : (
              groupCandidatesByFit(searchFilteredCandidates).map((group) => (
                <React.Fragment key={group.fit}>
                  <FitGroupHeader fit={group.fit} count={group.candidates.length} />
                  {group.candidates.map((c) => {
                    const checked = selected.has(c.employeeId)
                    const blocked = c.isBlocked
                    const rotaConflict = Boolean(c.hasRotaConflict)
                    const complianceBlocked = Boolean(c.complianceBlocksAllocation)
                    const atLimit = !checked && selected.size >= maxCarers
                    const justAssigned = justAssignedIds.has(c.employeeId)
                    const selectable =
                      !disabled && !blocked && !rotaConflict && !complianceBlocked && !atLimit
                    return (
                      <li
                        key={c.employeeId}
                        className={candidateRowClass({
                          selected: checked,
                          blocked,
                          rotaConflict,
                          complianceBlocked,
                          atLimit,
                          justAssigned,
                        })}
                        onClick={() => {
                          if (checked) {
                            toggle(c.employeeId, blocked, rotaConflict, complianceBlocked)
                            return
                          }
                          if (!selectable) {
                            if (rotaConflict) notifyRotaConflict()
                            else if (complianceBlocked) notifyComplianceBlock()
                            return
                          }
                          toggle(c.employeeId, blocked, rotaConflict, complianceBlocked)
                        }}
                      >
                        <VisitPlanCarerPickerRow
                          candidate={c}
                          slotDaysOfWeek={slot.daysOfWeek}
                          isAssigned={checked}
                          blocked={blocked}
                          control={
                            <Checkbox
                              checked={checked}
                              disabled={disabled || blocked || rotaConflict || complianceBlocked || atLimit}
                              onCheckedChange={() =>
                                toggle(c.employeeId, blocked, rotaConflict, complianceBlocked)
                              }
                              className="shrink-0 border-foreground/50"
                              aria-label={`Assign ${c.displayName}`}
                              onClick={(event) => event.stopPropagation()}
                            />
                          }
                        />
                      </li>
                    )
                  })}
                </React.Fragment>
              ))
            )}
          </ul>
        ) : null}
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
            {selected.size < maxCarers ? ` · ${maxCarers - selected.size} more needed` : ' · ready for this visit'}
            . Changes apply when you save the visit plan.
          </p>
        ) : (
          <p>No carers selected yet for this visit.</p>
        )}
      </footer>
    </div>
  )
}
