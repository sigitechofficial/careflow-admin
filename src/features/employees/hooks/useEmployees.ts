import { useQuery } from '@tanstack/react-query'
import {
  fetchEmployeeLookups,
  fetchEmployeeChartSummary,
  fetchEmployeeListFacets,
  listEmployees,
  fetchEmployee,
  fetchEmployeeDocumentsRegistry,
  type ListEmployeesParams,
  type EmployeeChartCohortParams,
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

export function useEmployeeChartSummary(params?: EmployeeChartCohortParams) {
  return useQuery({
    queryKey: employeeKeys.chartSummary(params),
    queryFn: ({ signal }) => fetchEmployeeChartSummary(params, { signal }),
  })
}

export function useEmployeeListFacets(params?: EmployeeChartCohortParams, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.listFacets(params),
    queryFn: ({ signal }) => fetchEmployeeListFacets(params, { signal }),
    enabled,
    placeholderData: (prev) => prev,
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

export function useEmployeeDocumentsRegistry(
  enabled = true,
  params?: { locationIds?: string[] },
) {
  return useQuery({
    queryKey: employeeKeys.documentsRegistry(params),
    queryFn: ({ signal }) => fetchEmployeeDocumentsRegistry(params, { signal }),
    enabled,
    staleTime: 30_000,
  })
}
