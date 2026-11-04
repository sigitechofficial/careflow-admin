import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAllEmployees } from '@/features/employees/api'
import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { employeeKeys } from '@/features/employees/keys'
import { filterEmployeesByBranchLocations } from '@/features/scheduling/utils/employee-branch-scope.util'

const STALE_TIME_MS = 60_000

type Options = {
  enabled?: boolean
  /**
   * When set, returned employees / combobox options are limited to carers who work
   * these branches (primary, floor/base locations, or access-all-zones).
   * Empty / omitted = no branch filter (full catalog).
   */
  locationIds?: string[]
  /** Keep these employees visible even when outside the branch filter (e.g. current assignee). */
  includeEmployeeIds?: string[]
  /** Pickers only: hide inactive carers (the API refuses them), except `includeEmployeeIds`. */
  activeOnly?: boolean
}

function stableLocationIdsKey(locationIds: string[] | undefined): string {
  if (!locationIds?.length) return ''
  return [...new Set(locationIds.map((id) => id.trim()).filter(Boolean))].sort().join(',')
}

function stableIncludeIdsKey(includeEmployeeIds: string[] | undefined): string {
  if (!includeEmployeeIds?.length) return ''
  return [...new Set(includeEmployeeIds.map((id) => id.trim()).filter(Boolean))].sort().join(',')
}

export function useScheduleEmployeesCatalog(options: Options = {}) {
  const enabled = options.enabled ?? true
  const locationIdsKey = stableLocationIdsKey(options.locationIds)
  const includeIdsKey = stableIncludeIdsKey(options.includeEmployeeIds)
  const locationIds = React.useMemo(
    () => (locationIdsKey ? locationIdsKey.split(',') : []),
    [locationIdsKey],
  )
  const includeEmployeeIds = React.useMemo(
    () => (includeIdsKey ? includeIdsKey.split(',') : []),
    [includeIdsKey],
  )

  const query = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    enabled,
    staleTime: STALE_TIME_MS,
  })

  const allEmployees = query.data ?? []
  const activeOnly = options.activeOnly ?? false

  const employees = React.useMemo(() => {
    const pool = activeOnly ? allEmployees.filter((employee) => employee.isActive) : allEmployees
    const scoped = filterEmployeesByBranchLocations(pool, locationIds)
    if (!includeEmployeeIds.length || (!locationIds.length && !activeOnly)) return scoped
    const byId = new Map(scoped.map((row) => [row.id, row]))
    for (const id of includeEmployeeIds) {
      if (byId.has(id)) continue
      const row = allEmployees.find((employee) => employee.id === id)
      if (row) byId.set(id, row)
    }
    return [...byId.values()]
  }, [allEmployees, activeOnly, locationIds, includeEmployeeIds])

  const catalogById = React.useMemo(() => {
    const map = new Map<string, EmployeeListRow>()
    for (const employee of employees) {
      map.set(employee.id, employee)
    }
    return map
  }, [employees])

  const comboboxOptions = React.useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: employeeListRowDisplayName(employee),
      })),
    [employees],
  )

  return {
    ...query,
    employees,
    allEmployees,
    catalogById,
    comboboxOptions,
    locationFilterApplied: locationIds.length > 0,
  }
}
