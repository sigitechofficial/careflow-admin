import * as React from 'react'
import { Loader2, Sparkles, Star, UserPlus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
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
  job: TimelineJob | null
  selectedEmployeeId: string
  onSelectCarer: (employeeId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleRunRecommendCarers({
  job,
  selectedEmployeeId,
  onSelectCarer,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [candidates, setCandidates] = React.useState<VisitPlanCarerCandidate[]>([])

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
    if (open && job) {
      void loadRecommendations()
    }
  }, [open, job, loadRecommendations])

  const recommendations = React.useMemo(
    () =>
      candidates
        .filter((c) => !c.hasRotaConflict)
        .slice(0, 8),
    [candidates],
  )

  if (!open) return null

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Recommended carers</p>
          <p className="text-xs text-muted-foreground">
            {job
              ? 'Based on the first visit in this run — availability, skills, and preferences.'
              : 'Add visits to this run to see recommendations.'}
          </p>
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
            Refresh
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>

      {!job ? (
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
          {candidates.some((c) => c.hasRotaConflict)
            ? 'No available carers — others are already booked at this time.'
            : 'No recommendations available.'}
        </p>
      ) : null}

      <ul className="max-h-56 space-y-2 overflow-y-auto">
        {recommendations.map((candidate) => {
          const blocked = candidate.isBlocked
          const isSelected = selectedEmployeeId === candidate.employeeId
          return (
            <li
              key={candidate.employeeId}
              className={cn(
                'flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2',
                blocked && 'opacity-60',
                isSelected && 'ring-1 ring-primary',
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
                </div>
                <p className="text-xs text-muted-foreground">{candidate.availability.summary}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={isSelected ? 'default' : 'secondary'}
                disabled={blocked}
                onClick={() => {
                  onSelectCarer(candidate.employeeId)
                  onOpenChange(false)
                }}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
