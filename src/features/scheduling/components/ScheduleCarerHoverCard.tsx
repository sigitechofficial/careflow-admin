import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { EmployeeDayRow } from '@/features/scheduling/types/scheduling.types'
import {
  employeeBriefFullName,
  employeeBriefRoleLabel,
  formatHoursMinutes,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { describeEmployeeBranchScope } from '@/features/scheduling/utils/employee-branch-scope.util'
import { resolveCarerDayAvailabilityBadge } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'

type Props = {
  row: EmployeeDayRow
  catalog?: EmployeeListRow | null
  locationNames: Map<string, string>
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-xs leading-snug">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="border-t border-border/80 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:border-t-0 first:pt-0">
      {children}
    </p>
  )
}

function formatDayPattern(row: EmployeeDayRow): string | null {
  const pattern = row.dayPattern
  if (!pattern) return null
  if (!pattern.isAvailable) return 'Not available today'
  const start = pattern.startTime?.trim()
  const end = pattern.endTime?.trim()
  if (start && end) {
    return pattern.isPartial ? `Partially available ${start}–${end}` : `Available ${start}–${end}`
  }
  return pattern.isPartial ? 'Partially available' : 'Fully available'
}

export function ScheduleCarerHoverCard({ row, catalog, locationNames }: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const employee = row.employee
  const name = employeeBriefFullName(employee)
  const roleLine = employeeBriefRoleLabel(employee)
  const visitsToday = row.allocations.length
  const bookedToday = formatHoursMinutes(row.totalMinutes)
  const dayPattern = formatDayPattern(row)
  const availabilityBadge = resolveCarerDayAvailabilityBadge(row.dayPattern, row.onHoliday)

  const branchScope = describeEmployeeBranchScope(catalog, locationNames)
  const primaryBranchLabel =
    branchScope.kind === 'single' || branchScope.kind === 'multiple' ? branchScope.branches[0] : null
  const extraBranchLabels =
    branchScope.kind === 'multiple' ? branchScope.branches.slice(1) : []

  const staffType = employee.isAgencyStaff
    ? 'Agency'
    : employee.isBankStaff
      ? 'Bank'
      : 'Core'

  return (
    <div className="w-[min(22rem,88vw)] rounded-md border border-border bg-popover shadow-lg">
      <div className="border-b border-border px-3 py-2 text-center text-sm font-semibold text-sky-700 dark:text-sky-300">
        Carer
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <DetailRow label="Name" value={name} />
        <DetailRow label="Role" value={roleLine} />
        {employee.email?.trim() ? <DetailRow label="Email" value={employee.email.trim()} /> : null}
        {catalog?.status?.name ? <DetailRow label="Status" value={catalog.status.name} /> : null}

        <SectionTitle>Employment</SectionTitle>
        {catalog?.jobTitle?.name ? <DetailRow label="Job title" value={catalog.jobTitle.name} /> : null}
        {catalog?.grade?.name ? <DetailRow label="Grade" value={catalog.grade.name} /> : null}
        {catalog?.contractType?.name ? (
          <DetailRow label="Contract" value={catalog.contractType.name} />
        ) : null}
        <DetailRow label="Staff type" value={staffType} />
        <DetailRow label="Branch scope" value={branchScope.summary} />
        {branchScope.kind === 'all-zones' ? null : primaryBranchLabel ? (
          <DetailRow label="Primary branch" value={primaryBranchLabel} />
        ) : null}
        {extraBranchLabels.length > 0 ? (
          <DetailRow label="Also works at" value={extraBranchLabels.join(' · ')} />
        ) : null}
        {catalog?.visaTypeLabel ? (
          <DetailRow label="Immigration" value={catalog.visaTypeLabel} />
        ) : null}
        {employee.contractedWeeklyHours != null ? (
          <DetailRow label="Contracted" value={`${employee.contractedWeeklyHours}h / week`} />
        ) : null}
        {employee.maximumWeeklyHours != null ? (
          <DetailRow label="Max hours" value={`${employee.maximumWeeklyHours}h / week`} />
        ) : null}

        <SectionTitle>Today</SectionTitle>
        {row.onHoliday ? (
          <DetailRow
            label="Leave"
            value={
              row.holidayEndDate
                ? `On leave until ${displayFormat.formatDate(row.holidayEndDate.slice(0, 10))}`
                : 'On leave today'
            }
          />
        ) : availabilityBadge ? (
          <DetailRow label="Availability" value={availabilityBadge.title} />
        ) : null}
        <DetailRow label="Visits" value={visitsToday === 0 ? 'None booked' : String(visitsToday)} />
        <DetailRow label="Booked" value={bookedToday} />
        {dayPattern && !availabilityBadge && !row.onHoliday ? (
          <DetailRow label="Pattern" value={dayPattern} />
        ) : null}
      </div>
    </div>
  )
}
