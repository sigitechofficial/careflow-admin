import { usePolicyAudienceRoles } from '@/features/policies/hooks/usePolicies'
import { useLookupList, useServiceUserCareTypes } from '@/features/settings/hooks/useLookupsAdmin'
import { useAuthStore } from '@/features/auth/store'

export function usePolicyLookups() {
  const assignedLocationIds = useAuthStore(s => s.user?.assignedLocationIds ?? null)
  const locationsQuery = useLookupList('locations')
  const jobTitlesQuery = useLookupList('job-titles')
  const workAreasQuery = useLookupList('work-areas')
  // Sign-in roles: saving checks audience roles against these and acknowledgement matches staff by them.
  const rolesQuery = usePolicyAudienceRoles()
  const allRoles = rolesQuery.data ?? []
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
      rolesQuery.isLoading ||
      careTypesQuery.isLoading,
    locations,
    allLocations,
    jobTitles: jobTitlesQuery.data ?? [],
    workAreas: workAreasQuery.data ?? [],
    /** Roles a policy can be for (groups of staff). */
    roles: allRoles.filter(row => row.staff),
    /** Every sign-in role, so a policy already set for e.g. Super Admin still shows it (and it can be removed). */
    allRoles,
    careTypes: (careTypesQuery.data ?? []).filter(row => row.isActive !== false),
    locationLabels: Object.fromEntries(allLocations.map(row => [row.id, row.name])),
    jobTitleLabels: Object.fromEntries((jobTitlesQuery.data ?? []).map(row => [row.id, row.name])),
    workAreaLabels: Object.fromEntries((workAreasQuery.data ?? []).map(row => [row.id, row.name])),
    roleLabels: Object.fromEntries(allRoles.map(row => [row.id, row.name])),
    serviceLabels: Object.fromEntries((careTypesQuery.data ?? []).map(row => [row.code, row.name])),
    isLocationRestricted: Boolean(assignedLocationIds && assignedLocationIds.length > 0),
    assignedLocationIds,
  }
}
