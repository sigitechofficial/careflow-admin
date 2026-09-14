import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import type {
  EmployeeDayRow,
  JobsDayRunsResponse,
  TimelineJob,
} from '@/features/scheduling/types/scheduling.types'
import type { JobDropPayload } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import type { RotaGapDisplayMode } from '@/features/scheduling/utils/schedule-job-rota-gap.util'
import type { ScheduleJobsBoardRowAxis, ServiceUserDayRow } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import type { LiveOfficeAlert } from '@/features/scheduling/utils/schedule-job-live-office-alerts.util'

export type ScheduleJobsGanttProps = {
  date: string
  rowAxis?: ScheduleJobsBoardRowAxis
  employeeRows: EmployeeDayRow[]
  serviceUserRows?: ServiceUserDayRow[]
  unassignedJobs: TimelineJob[]
  cancelledJobs: TimelineJob[]
  runs?: JobsDayRunsResponse['runs']
  showRunsOnBoard?: boolean
  rotaGapDisplay?: RotaGapDisplayMode
  employeeCatalogById?: Map<string, EmployeeListRow>
  locationNames?: Map<string, string>
  savingJobId?: string | null
  excessContractedJobIds?: Set<string>
  outsidePatternJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  liveAlertsByJobId?: Map<string, LiveOfficeAlert[]>
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onJobDrop: (payload: JobDropPayload) => void | Promise<void>
  onJobsSelectedForRun?: (jobs: TimelineJob[]) => void
  onOpenRun?: (runId: string) => void
  onReassignRun?: (runId: string) => void
}
