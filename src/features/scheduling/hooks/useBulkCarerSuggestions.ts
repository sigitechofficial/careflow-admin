import * as React from 'react'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { buildScheduleJobSuggestCarersRequest } from '@/features/scheduling/utils/schedule-job-recommend-carers.util'
import { sortVisitPlanCarerCandidates } from '@/features/scheduling/utils/schedule-carer-suggest.util'
import { mergeBulkCarerCandidates } from '@/features/scheduling/utils/schedule-bulk-carer-suggest.util'
import { apiErrorMessage } from '@/shared/lib/api-error-message'

/** Carers suggested for every one of `jobs`, merged (see mergeBulkCarerCandidates). */
export function useBulkCarerSuggestions(jobs: TimelineJob[], enabled: boolean) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [candidates, setCandidates] = React.useState<VisitPlanCarerCandidate[]>([])

  const load = React.useCallback(async () => {
    if (jobs.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const perVisit = await Promise.all(
        jobs.map((job) =>
          suggestVisitPlanCarers(job.serviceUserId, buildScheduleJobSuggestCarersRequest(job)).then(
            (data) => data?.candidates ?? [],
          ),
        ),
      )
      setCandidates(mergeBulkCarerCandidates(perVisit).sort(sortVisitPlanCarerCandidates))
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load suggested carers'))
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }, [jobs])

  React.useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  return { candidates, loading, error, reload: load }
}
