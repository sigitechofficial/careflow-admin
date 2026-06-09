import * as React from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchEmployee, listAllEmployees } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import {
  buildEmployeeNameMap,
  employeeDetailDisplayName,
} from '@/features/employees/lib/employee-display-name'

/** Loads all employees plus any extra ids (e.g. assigned carers not in the list). */
export function useEmployeeNameMap(extraEmployeeIds: string[] = []) {
  const allListQuery = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    staleTime: 60_000,
  })

  const baseMap = React.useMemo(
    () => buildEmployeeNameMap(allListQuery.data ?? []),
    [allListQuery.data],
  )

  const missingIds = React.useMemo(() => {
    const unique = [...new Set(extraEmployeeIds.filter(Boolean))]
    return unique.filter((id) => !baseMap.has(id))
  }, [extraEmployeeIds, baseMap])

  const missingQueries = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: employeeKeys.profile(id),
      queryFn: () => fetchEmployee(id),
      enabled: Boolean(id),
      staleTime: 300_000,
    })),
  })

  return React.useMemo(() => {
    const map = new Map(baseMap)
    missingIds.forEach((id, index) => {
      const employee = missingQueries[index]?.data
      if (employee) map.set(id, employeeDetailDisplayName(employee))
    })
    return map
  }, [baseMap, missingIds, missingQueries])
}
