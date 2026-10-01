import {
  ScheduleRecommendCarers,
  type ScheduleRecommendCarersProps,
} from '@/features/scheduling/components/ScheduleRecommendCarers'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'

type Props = {
  job: TimelineJob
  allocatedEmployeeIds: Set<string>
  allocatingEmployeeId?: string | null
  replacingEmployeeId?: string | null
  onAssign: (employeeId: string) => void
  /** Multi-carer team picking: toggle selection instead of assigning. */
  selectedEmployeeIds?: Set<string>
  onCandidatesChange?: (candidates: VisitPlanCarerCandidate[]) => void
  hideHeader?: boolean
  searchQuery?: string
}

export function ScheduleJobRecommendedCarers(props: Props) {
  const recommendProps: Extract<ScheduleRecommendCarersProps, { variant: 'job-assign' }> = {
    variant: 'job-assign',
    ...props,
  }
  return <ScheduleRecommendCarers {...recommendProps} />
}
