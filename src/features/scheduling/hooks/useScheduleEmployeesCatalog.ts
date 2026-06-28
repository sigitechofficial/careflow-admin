import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAllEmployees } from '@/features/employees/api'
import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { employeeKeys } from '@/features/employees/keys'

const STALE_TIME_MS = 60_000

type Options = {
  enabled?: boolean
}

export function useScheduleEmployeesCatalog(options: Options = {}) {
  const enabled = options.enabled ?? true

  const query = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    enabled,
    staleTime: STALE_TIME_MS,
  })

  const employees = query.data ?? []

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
    catalogById,
    comboboxOptions,
  }
}
