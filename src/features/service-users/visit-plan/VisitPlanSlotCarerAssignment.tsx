import * as React from 'react'
import { Loader2, Star, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import type {
  VisitPlanCarerCandidate,
  VisitPlanCarerFit,
  VisitPlanSlot,
} from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'

function fitStyles(fit: VisitPlanCarerFit) {
  if (fit === 'good') return 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
  if (fit === 'partial') return 'border-amber-300 bg-amber-50/60 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
  return 'border-red-300 bg-red-50/60 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
}

function fitLabel(fit: VisitPlanCarerFit) {
  if (fit === 'good') return 'Good match'
  if (fit === 'partial') return 'Partial match'
  return 'Poor match'
}

function CarerCandidateDetails({
  candidate: c,
  blocked,
}: {
  candidate: VisitPlanCarerCandidate
  blocked: boolean
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{c.displayName}</span>
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', fitStyles(c.fit))}>
          {fitLabel(c.fit)}
        </span>
        {c.isPreferred ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            <Star className="h-3 w-3" fill="currentColor" />
            Preferred
          </span>
        ) : null}
        {blocked ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
            <UserX className="h-3 w-3" />
            Blocked
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {[c.role, c.jobTitle].filter(Boolean).join(' · ') || 'Employee'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{c.availability.summary}</p>
      {c.availability.availableDays.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          OK: {c.availability.availableDays.map((d) => VISIT_PLAN_DAY_LABELS[d]).join(', ')}
        </p>
      ) : null}
      {c.skills.matched.length > 0 ? (
        <p className="text-[11px] text-emerald-800 dark:text-emerald-200">
          Skills: {c.skills.matched.join(', ')}
        </p>
      ) : null}
      {c.skills.missing.length > 0 ? (
        <p className="text-[11px] text-amber-800 dark:text-amber-200">
          Missing: {c.skills.missing.join(', ')}
        </p>
      ) : null}
    </div>
  )
}

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

  const selected = new Set(slot.assignedEmployeeIds ?? [])
  const maxCarers = slot.requiredCarers || 1

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
  ])

  React.useEffect(() => {
    if (!active) return
    void loadSuggestions()
  }, [active, loadSuggestions])

  const toggle = (employeeId: string, blocked: boolean) => {
    if (disabled || blocked) return
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

  const singleSelectValue = maxCarers === 1 ? (slot.assignedEmployeeIds?.[0] ?? '') : undefined

  return (
    <div
      className={cn(
        'space-y-3 bg-background',
        embedded ? 'p-0' : 'rounded-lg border border-dashed border-border p-4',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Assign carers to this visit</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {maxCarers} carer{maxCarers === 1 ? '' : 's'} required · checks working pattern, skills, and
            dom-care preferences.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading || disabled} onClick={() => void loadSuggestions()}>
          {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {requiredSkills.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Skills checked from linked care plans: {requiredSkills.join(', ')}
        </p>
      ) : null}

      {slot.daysOfWeek.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Select weekdays (or monthly days) for this visit before assigning carers.
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {loading && candidates.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading employees…
        </div>
      ) : null}

      {!loading && candidates.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No active employees found.</p>
      ) : null}

      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {maxCarers === 1 ? (
          <RadioGroup
            value={singleSelectValue}
            onValueChange={(employeeId) => {
              if (disabled) return
              const candidate = candidates.find((c) => c.employeeId === employeeId)
              if (candidate?.isBlocked) return
              onChange(employeeId ? [employeeId] : [])
            }}
            className="space-y-2"
          >
            {candidates.map((c) => {
              const blocked = c.isBlocked
              return (
                <li
                  key={c.employeeId}
                  className={cn(
                    'rounded-md border px-3 py-2',
                    singleSelectValue === c.employeeId
                      ? 'border-sky-400 bg-sky-50/40 dark:border-sky-700 dark:bg-sky-950/20'
                      : 'border-border',
                    blocked && 'opacity-60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem
                      value={c.employeeId}
                      disabled={disabled || blocked}
                      className="mt-1"
                      aria-label={`Assign ${c.displayName}`}
                    />
                    <CarerCandidateDetails candidate={c} blocked={blocked} />
                  </div>
                </li>
              )
            })}
          </RadioGroup>
        ) : (
          candidates.map((c) => {
            const checked = selected.has(c.employeeId)
            const blocked = c.isBlocked
            const atLimit = !checked && selected.size >= maxCarers
            return (
              <li
                key={c.employeeId}
                className={cn(
                  'rounded-md border px-3 py-2',
                  checked ? 'border-sky-400 bg-sky-50/40 dark:border-sky-700 dark:bg-sky-950/20' : 'border-border',
                  (blocked || atLimit) && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    disabled={disabled || blocked || atLimit}
                    onCheckedChange={() => toggle(c.employeeId, blocked)}
                    className="mt-1"
                    aria-label={`Assign ${c.displayName}`}
                  />
                  <CarerCandidateDetails candidate={c} blocked={blocked} />
                </div>
              </li>
            )
          })
        )}
      </ul>

      {selected.size > 0 ? (
        <p className="text-xs text-muted-foreground">
          Assigned {selected.size} carer{selected.size === 1 ? '' : 's'}
          {selected.size < maxCarers ? ` (${maxCarers - selected.size} more needed per visit)` : ''}.
          Assigned carers are applied when you generate rota.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No carers assigned yet for this call slot.</p>
      )}
    </div>
  )
}
