import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useLookupList, useServiceUserCareTypes } from '@/features/settings/hooks/useLookupsAdmin'
import { useAuthStore } from '@/features/auth/store'

export function usePolicyLookups() {
  const assignedLocationIds = useAuthStore(s => s.user?.assignedLocationIds ?? null)
  const locationsQuery = useLookupList('locations')
  const jobTitlesQuery = useLookupList('job-titles')
  const workAreasQuery = useLookupList('work-areas')
  const employeeLookups = useEmployeeLookups()
  const careTypesQuery = useServiceUserCareTypes()

  const allLocations = locationsQuery.data ?? []
  const locations =
    assignedLocationIds && assignedLocationIds.length > 0
      ? allLocations.filter(row => assignedLocationIds.includes(row.id))
      : allLocations

  return {
    isLoading:
      locationsQuery.isLoading ||
      jobTitlesQuery.isLoading ||
      workAreasQuery.isLoading ||
      employeeLookups.isLoading ||
      careTypesQuery.isLoading,
    locations,
    allLocations,
    jobTitles: jobTitlesQuery.data ?? [],
    workAreas: workAreasQuery.data ?? [],
    roles: employeeLookups.data?.roles ?? [],
    careTypes: (careTypesQuery.data ?? []).filter(row => row.isActive !== false),
    locationLabels: Object.fromEntries(allLocations.map(row => [row.id, row.name])),
    jobTitleLabels: Object.fromEntries((jobTitlesQuery.data ?? []).map(row => [row.id, row.name])),
    workAreaLabels: Object.fromEntries((workAreasQuery.data ?? []).map(row => [row.id, row.name])),
    roleLabels: Object.fromEntries((employeeLookups.data?.roles ?? []).map(row => [row.id, row.name])),
    serviceLabels: Object.fromEntries((careTypesQuery.data ?? []).map(row => [row.code, row.name])),
    isLocationRestricted: Boolean(assignedLocationIds && assignedLocationIds.length > 0),
    assignedLocationIds,
  }
}
