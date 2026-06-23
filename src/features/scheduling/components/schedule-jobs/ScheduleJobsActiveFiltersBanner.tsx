import type { BranchFilterOption } from '@/features/settings/location-management/build-service-user-branch-filter-options'
import {
  findScheduleJobsServiceUserBrief,
} from '@/features/scheduling/utils/schedule-jobs-service-user-filter.util'
import { scheduleJobsRequiredCarersFiltersLabel } from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import type { ScheduleJobsRequiredCarersFilterValue } from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

type Props = {
  locationFilterIds: string[]
  serviceUserFilterIds: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  branchFilterOptions: BranchFilterOption[]
  boardJobs: TimelineJob[]
}

export function ScheduleJobsActiveFiltersBanner({
  locationFilterIds,
  serviceUserFilterIds,
  requiredCarersFilters,
  branchFilterOptions,
  boardJobs,
}: Props) {
  if (
    locationFilterIds.length === 0 &&
    serviceUserFilterIds.length === 0 &&
    requiredCarersFilters.length === 0
  ) {
    return null
  }

  return (
    <p className="mb-2 shrink-0 text-xs text-muted-foreground">
      {locationFilterIds.length > 0 ? (
        <>
          Showing carers at selected branches (primary or base) and jobs for service users assigned to{' '}
          <span className="font-medium text-foreground">
            {branchFilterOptions
              .filter((option) => locationFilterIds.includes(option.id))
              .map((option) => option.displayLabel)
              .join(' · ') || 'selected branches'}
          </span>
          {serviceUserFilterIds.length > 0 || requiredCarersFilters.length > 0 ? '. ' : '.'}
        </>
      ) : null}
      {serviceUserFilterIds.length > 0 ? (
        <>
          Showing visits for{' '}
          <span className="font-medium text-foreground">
            {serviceUserFilterIds
              .map((id) => {
                const su =
                  findScheduleJobsServiceUserBrief(boardJobs, id) ?? {
                    id,
                    firstName: 'Service',
                    lastName: 'user',
                  }
                return serviceUserLabel(su)
              })
              .join(' · ')}
          </span>
          {requiredCarersFilters.length > 0 ? '. ' : '.'}
        </>
      ) : null}
      {requiredCarersFilters.length > 0 ? (
        <>
          Showing{' '}
          <span className="font-medium text-foreground">
            {scheduleJobsRequiredCarersFiltersLabel(requiredCarersFilters).toLowerCase()}
          </span>{' '}
          visits only.
        </>
      ) : null}
    </p>
  )
}
