import { useQuery } from '@tanstack/react-query'
import {
  fetchEmployeeSkillsOverview,
  fetchNonCoreActivitiesRegistry,
  listAllEmployees,
  listEmployeeNonCoreActivities,
  listEmployeeSkills,
  type ListEmployeesParams,
} from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'

export function useAllEmployees(
  params: Omit<ListEmployeesParams, 'page' | 'limit'> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: employeeKeys.allList(params),
    queryFn: () => listAllEmployees(params),
    enabled,
    staleTime: 60_000,
  })
}

export function useEmployeeSkills(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.skills(employeeId),
    queryFn: () => listEmployeeSkills(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useEmployeeSkillsOverview(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.skillsOverview(),
    queryFn: () => fetchEmployeeSkillsOverview(),
    enabled,
  })
}

export function useEmployeeNonCoreActivities(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.nonCoreActivities(employeeId),
    queryFn: () => listEmployeeNonCoreActivities(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useNonCoreActivitiesRegistry(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.nonCoreRegistry(),
    queryFn: () => fetchNonCoreActivitiesRegistry(),
    enabled,
  })
}
