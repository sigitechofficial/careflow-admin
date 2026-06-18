import * as React from 'react'
import { Loader2, Sparkles, Star, UserPlus, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import type { VisitPlanCarerCandidate, VisitPlanCarerFit } from '@/features/service-users/visit-plan/types'
import { buildScheduleJobSuggestCarersRequest } from '@/features/scheduling/utils/schedule-job-recommend-carers.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

function fitStyles(fit: VisitPlanCarerFit) {
  if (fit === 'good') {
    return 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
  }
  if (fit === 'partial') {
    return 'border-amber-300 bg-amber-50/60 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
  }
  return 'border-red-300 bg-red-50/60 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
}

function fitLabel(fit: VisitPlanCarerFit) {
  if (fit === 'good') return 'Good match'
  if (fit === 'partial') return 'Partial match'
  return 'Poor match'
}

type Props = {
  job: TimelineJob
  allocatedEmployeeIds: Set<string>
  allocatingEmployeeId?: string | null
  /** When set, recommendations are for replacing this carer. */
  replacingEmployeeId?: string | null
  onAssign: (employeeId: string) => void
  onCandidatesChange?: (candidates: VisitPlanCarerCandidate[]) => void
}

export function ScheduleJobRecommendedCarers({
  job,
  allocatedEmployeeIds,
  allocatingEmployeeId,
  replacingEmployeeId,
  onAssign,
  onCandidatesChange,
}: Props) {
  const showBlockedCarers = useShowBlockedCarersInSchedule()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [candidates, setCandidates] = React.useState<VisitPlanCarerCandidate[]>([])

  const loadRecommendations = React.useCallback(async () => {
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
    void loadRecommendations()
  }, [loadRecommendations])

  React.useEffect(() => {
    onCandidatesChange?.(candidates)
  }, [candidates, onCandidatesChange])

  const recommendations = React.useMemo(
    () =>
      candidates
        .filter((c) => {
          if (c.isBlocked && !showBlockedCarers) return false
          if (c.hasRotaConflict) return false
          if (replacingEmployeeId) return c.employeeId !== replacingEmployeeId
          return !allocatedEmployeeIds.has(c.employeeId)
        })
        .sort((a, b) => {
          if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1
          if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1
          return 0
        })
        .slice(0, 8),
    [allocatedEmployeeIds, candidates, replacingEmployeeId, showBlockedCarers],
  )

  const sectionTitle = replacingEmployeeId ? 'Recommended replacement carers' : 'Recommended carers'
  const sectionHint = replacingEmployeeId
    ? 'Pick a carer to replace the current assignment on this job.'
    : 'Preferred carers appear first, then ranked by availability, skills, and compliance.'
  const actionLabel = replacingEmployeeId ? 'Change to' : 'Assign'

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{sectionTitle}</h4>
          <p className="text-xs text-muted-foreground">{sectionHint}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void loadRecommendations()}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          Recommend
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {loading && recommendations.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Finding recommended carers…
        </div>
      ) : null}

      {!loading && recommendations.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">
          {candidates.some((c) => c.hasRotaConflict)
            ? 'No available carers — others are already booked at this time.'
            : 'No recommendations available for this job.'}
        </p>
      ) : null}

      <ul className="space-y-2">
        {recommendations.map((candidate) => {
          const blocked = candidate.isBlocked
          const assigning = allocatingEmployeeId === candidate.employeeId
          return (
            <li
              key={candidate.employeeId}
              className={cn(
                'flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2',
                blocked && 'opacity-60',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{candidate.displayName}</span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                      fitStyles(candidate.fit),
                    )}
                  >
                    {fitLabel(candidate.fit)}
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
                <p className="text-xs text-muted-foreground">
                  {[candidate.role, candidate.jobTitle].filter(Boolean).join(' · ') || 'Employee'}
                </p>
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
                variant="secondary"
                disabled={blocked || assigning || !!allocatingEmployeeId}
                onClick={() => onAssign(candidate.employeeId)}
              >
                {assigning ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                )}
                {actionLabel}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
