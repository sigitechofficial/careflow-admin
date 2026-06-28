import * as React from 'react'
import { Loader2, Sparkles, Star, UserPlus, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { buildScheduleJobSuggestCarersRequest } from '@/features/scheduling/utils/schedule-job-recommend-carers.util'
import {
  filterScheduleJobRecommendCarers,
  filterScheduleRunRecommendCarers,
  scheduleRecommendCarersEmptyMessage,
  visitPlanCarerFitLabel,
  visitPlanCarerFitStyles,
} from '@/features/scheduling/utils/schedule-carer-suggest.util'

type JobAssignVariant = {
  variant: 'job-assign'
  job: TimelineJob
  allocatedEmployeeIds: Set<string>
  allocatingEmployeeId?: string | null
  replacingEmployeeId?: string | null
  onAssign: (employeeId: string) => void
  onCandidatesChange?: (candidates: VisitPlanCarerCandidate[]) => void
}

type RunSelectVariant = {
  variant: 'run-select'
  job: TimelineJob | null
  selectedEmployeeId: string
  onSelectCarer: (employeeId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export type ScheduleRecommendCarersProps = JobAssignVariant | RunSelectVariant

function ScheduleRecommendCarersListItem({
  candidate,
  blocked,
  actionLabel,
  actionDisabled,
  actionBusy,
  actionVariant,
  selected,
  showEmployeeRole,
  onAction,
}: {
  candidate: VisitPlanCarerCandidate
  blocked: boolean
  actionLabel: string
  actionDisabled: boolean
  actionBusy: boolean
  actionVariant: 'default' | 'secondary'
  selected?: boolean
  showEmployeeRole?: boolean
  onAction: () => void
}) {
  return (
    <li
      className={cn(
        'flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2',
        blocked && 'opacity-60',
        selected && 'ring-1 ring-primary',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{candidate.displayName}</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
              visitPlanCarerFitStyles(candidate.fit),
            )}
          >
            {visitPlanCarerFitLabel(candidate.fit)}
          </span>
          {candidate.isPreferred ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              <Star className="h-3 w-3" fill="currentColor" aria-hidden />
              Preferred
            </span>
          ) : null}
          {blocked ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
              <UserX className="h-3 w-3" aria-hidden />
              Blocked
            </span>
          ) : null}
        </div>
        {candidate.role || candidate.jobTitle || showEmployeeRole ? (
          <p className="text-xs text-muted-foreground">
            {[candidate.role, candidate.jobTitle].filter(Boolean).join(' · ') || 'Employee'}
          </p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">{candidate.availability.summary}</p>
        {candidate.warnings.length > 0 ? (
          <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-200">
            {candidate.warnings.slice(0, 2).join(' · ')}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={actionVariant}
        disabled={actionDisabled}
        onClick={onAction}
      >
        {actionBusy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        )}
        {actionLabel}
      </Button>
    </li>
  )
}

export function ScheduleRecommendCarers(props: ScheduleRecommendCarersProps) {
  const showBlockedCarers = useShowBlockedCarersInSchedule()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [candidates, setCandidates] = React.useState<VisitPlanCarerCandidate[]>([])

  const job = props.job
  const isRunSelect = props.variant === 'run-select'
  const shouldLoad =
    props.variant === 'job-assign' ? Boolean(job) : Boolean(props.open && job)

  const loadRecommendations = React.useCallback(async () => {
    if (!job) return
    setLoading(true)
    setError(null)
    try {
      const body = buildScheduleJobSuggestCarersRequest(job)
      const data = await suggestVisitPlanCarers(job.serviceUserId, body)
      setCandidates(data?.candidates ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recommendations')
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [job])

  React.useEffect(() => {
    if (shouldLoad) {
      void loadRecommendations()
    }
  }, [shouldLoad, loadRecommendations])

  React.useEffect(() => {
    if (props.variant !== 'job-assign') return
    props.onCandidatesChange?.(candidates)
  }, [candidates, props])

  const recommendations = React.useMemo(() => {
    if (props.variant === 'job-assign') {
      return filterScheduleJobRecommendCarers(candidates, {
        showBlockedCarers,
        allocatedEmployeeIds: props.allocatedEmployeeIds,
        replacingEmployeeId: props.replacingEmployeeId,
      })
    }
    return filterScheduleRunRecommendCarers(candidates, showBlockedCarers)
  }, [candidates, props, showBlockedCarers])

  if (isRunSelect && !props.open) return null

  const sectionTitle =
    props.variant === 'job-assign'
      ? props.replacingEmployeeId
        ? 'Recommended replacement carers'
        : 'Recommended carers'
      : 'Recommended carers'

  const sectionHint =
    props.variant === 'job-assign'
      ? props.replacingEmployeeId
        ? 'Pick a carer to replace the current assignment on this job.'
        : 'Preferred carers appear first, then ranked by availability, skills, and compliance.'
      : job
        ? 'Based on the first visit in this run — availability, skills, and preferences.'
        : 'Add visits to this run to see recommendations.'

  const refreshLabel = props.variant === 'run-select' ? 'Refresh' : 'Recommend'
  const emptyFallback =
    props.variant === 'run-select'
      ? 'No recommendations available.'
      : 'No recommendations available for this job.'

  const wrapperClassName =
    props.variant === 'run-select'
      ? 'rounded-lg border border-border bg-muted/20 p-3 space-y-3'
      : 'space-y-3 border-t border-border pt-4'

  const listClassName =
    props.variant === 'run-select' ? 'max-h-56 space-y-2 overflow-y-auto' : 'space-y-2'

  return (
    <div className={wrapperClassName}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {props.variant === 'job-assign' ? (
            <h4 className="text-sm font-semibold text-foreground">{sectionTitle}</h4>
          ) : (
            <p className="text-sm font-semibold text-foreground">{sectionTitle}</p>
          )}
          <p className="text-xs text-muted-foreground">{sectionHint}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading || !job}
            onClick={() => void loadRecommendations()}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            {refreshLabel}
          </Button>
          {props.variant === 'run-select' ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => props.onOpenChange(false)}>
              Close
            </Button>
          ) : null}
        </div>
      </div>

      {props.variant === 'run-select' && !job ? (
        <p className="text-sm text-muted-foreground">No visits in this run yet.</p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {loading && recommendations.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Finding recommended carers…
        </div>
      ) : null}

      {!loading && job && recommendations.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">
          {scheduleRecommendCarersEmptyMessage(candidates, emptyFallback)}
        </p>
      ) : null}

      <ul className={listClassName}>
        {recommendations.map((candidate) => {
          const blocked = candidate.isBlocked
          if (props.variant === 'job-assign') {
            const assigning = props.allocatingEmployeeId === candidate.employeeId
            const actionLabel = props.replacingEmployeeId ? 'Change to' : 'Assign'
            return (
              <ScheduleRecommendCarersListItem
                key={candidate.employeeId}
                candidate={candidate}
                blocked={blocked}
                actionLabel={actionLabel}
                actionDisabled={blocked || assigning || !!props.allocatingEmployeeId}
                actionBusy={assigning}
                actionVariant="secondary"
                showEmployeeRole
                onAction={() => props.onAssign(candidate.employeeId)}
              />
            )
          }

          const isSelected = props.selectedEmployeeId === candidate.employeeId
          return (
            <ScheduleRecommendCarersListItem
              key={candidate.employeeId}
              candidate={candidate}
              blocked={blocked}
              actionLabel={isSelected ? 'Selected' : 'Select'}
              actionDisabled={blocked}
              actionBusy={false}
              actionVariant={isSelected ? 'default' : 'secondary'}
              selected={isSelected}
              onAction={() => {
                props.onSelectCarer(candidate.employeeId)
                props.onOpenChange(false)
              }}
            />
          )
        })}
      </ul>
    </div>
  )
}
