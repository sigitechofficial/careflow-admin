import { useQuery } from '@tanstack/react-query'
import {
  fetchEmployeeLookups,
  fetchEmployeeChartSummary,
  listEmployees,
  fetchEmployee,
  fetchEmployeeDocumentsRegistry,
  type ListEmployeesParams,
} from '@/features/employees/api'
import { employeeKeys } from '../keys'

export function useEmployeeLookups(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.lookups(),
    queryFn: ({ signal }) => fetchEmployeeLookups({ signal }),
    staleTime: 10 * 60 * 1000,
    enabled,
  })
}

export function useEmployeeChartSummary() {
  return useQuery({
    queryKey: employeeKeys.chartSummary(),
    queryFn: ({ signal }) => fetchEmployeeChartSummary({ signal }),
  })
}

export function useEmployees(params: ListEmployeesParams = {}, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: ({ signal }) => listEmployees(params, { signal }),
    placeholderData: (prev) => prev,
    enabled,
  })
}

export function useEmployee(id: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.profile(id),
    queryFn: ({ signal }) => fetchEmployee(id, { signal }),
    enabled: enabled && Boolean(id),
  })
}

export function useEmployeeDocumentsRegistry(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.documentsRegistry(),
    queryFn: ({ signal }) => fetchEmployeeDocumentsRegistry({ signal }),
    enabled,
    staleTime: 30_000,
  })
}
