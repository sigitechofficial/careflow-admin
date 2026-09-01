import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createServiceUserArea,
  deleteServiceUserArea,
  fetchEmployeeLocations,
  fetchLocationActiveUsers,
  fetchLocationManagementTree,
  fetchServiceUserLocations,
  updateEmployeeLocation,
  updateLocationZone,
  updateServiceUserArea,
  updateServiceUserLocation,
} from '@/features/settings/api/location-management.api'
import { settingsKeys } from '@/features/settings/keys'

const STALE_TIME = 30_000

export function useLocationManagementTree(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.locationTree(),
    queryFn: fetchLocationManagementTree,
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useLocationActiveUsers(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.locationActiveUsers(),
    queryFn: fetchLocationActiveUsers,
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useServiceUserLocations(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.serviceUserLocations(),
    queryFn: fetchServiceUserLocations,
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useEmployeeLocations(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.employeeLocations(),
    queryFn: fetchEmployeeLocations,
    enabled,
    staleTime: STALE_TIME,
  })
}

function invalidateLocationManagement(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [...settingsKeys.all(), 'location-management'] })
}

export function useUpdateLocationZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      zoneId,
      body,
    }: {
      zoneId: string
      body: Parameters<typeof updateLocationZone>[1]
    }) => updateLocationZone(zoneId, body),
    onSuccess: () => invalidateLocationManagement(qc),
  })
}

export function useCreateServiceUserArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createServiceUserArea>[0]) => createServiceUserArea(body),
    onSuccess: () => invalidateLocationManagement(qc),
  })
}

export function useUpdateServiceUserArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      areaId,
      body,
    }: {
      areaId: string
      body: Parameters<typeof updateServiceUserArea>[1]
    }) => updateServiceUserArea(areaId, body),
    onSuccess: () => invalidateLocationManagement(qc),
  })
}

export function useDeleteServiceUserArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (areaId: string) => deleteServiceUserArea(areaId),
    onSuccess: () => invalidateLocationManagement(qc),
  })
}

export function useUpdateServiceUserLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      body,
    }: {
      serviceUserId: string
      body: Parameters<typeof updateServiceUserLocation>[1]
    }) => updateServiceUserLocation(serviceUserId, body),
    onSuccess: () => invalidateLocationManagement(qc),
  })
}

export function useUpdateEmployeeLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      body,
    }: {
      employeeId: string
      body: Parameters<typeof updateEmployeeLocation>[1]
    }) => updateEmployeeLocation(employeeId, body),
    onSuccess: () => invalidateLocationManagement(qc),
  })
}
