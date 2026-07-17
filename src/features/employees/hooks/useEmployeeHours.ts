import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchEmployeeHoursMonthlySummary,
  fetchEmployeeHoursWeeklySummary,
  upsertEmployeeHoursMonthlyReview,
  type EmployeeHoursMonthlyParams,
  type EmployeeHoursWeeklyParams,
  type UpsertMonthlyReviewBody,
} from '@/features/employees/api/employee-hours.api'
import { employeeKeys } from '@/features/employees/keys'

export function useEmployeeHoursWeeklySummary(
  params?: EmployeeHoursWeeklyParams,
  enabled = true,
) {
  return useQuery({
    queryKey: employeeKeys.hoursWeekly(params),
    queryFn: () => fetchEmployeeHoursWeeklySummary(params),
    enabled,
    placeholderData: previous => previous,
  })
}

export function useEmployeeHoursMonthlySummary(
  params?: EmployeeHoursMonthlyParams,
  enabled = true,
) {
  return useQuery({
    queryKey: employeeKeys.hoursMonthly(params),
    queryFn: () => fetchEmployeeHoursMonthlySummary(params),
    enabled,
    placeholderData: previous => previous,
  })
}

export function useUpsertEmployeeHoursMonthlyReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertMonthlyReviewBody) => upsertEmployeeHoursMonthlyReview(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...employeeKeys.all(), 'hours-monthly'] })
    },
  })
}
