import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  LocationActiveUser,
  LocationManagementTree,
  LocationLookup,
  LocationZoneDetail,
  LocationZoneOption,
  ServiceUserLocationRow,
  EmployeeLocationRow,
} from '@/features/settings/location-management/location-management.types'

export async function fetchLocationManagementTree(): Promise<LocationManagementTree> {
  const res = await apiJson<ApiEnvelope<LocationManagementTree>>('/location-management/tree', {
    method: 'GET',
  })
  return res.data
}

export async function fetchLocationActiveUsers(): Promise<LocationActiveUser[]> {
  const res = await apiJson<ApiEnvelope<LocationActiveUser[]>>('/location-management/active-users', {
    method: 'GET',
  })
  return res.data ?? []
}

export async function updateLocationZone(
  zoneId: string,
  payload: {
    name?: string
    markerColorHex?: string
    incidentMessageUserIds?: string[]
    incidentEmailUserIds?: string[]
  },
): Promise<LocationZoneDetail> {
  const res = await apiJson<ApiEnvelope<LocationZoneDetail>>(`/location-management/zones/${zoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function fetchServiceUserLocations(): Promise<{
  zones: LocationZoneOption[]
  locations: LocationLookup[]
  members: ServiceUserLocationRow[]
}> {
  const res = await apiJson<
    ApiEnvelope<{
      zones: LocationZoneOption[]
      locations: LocationLookup[]
      members: ServiceUserLocationRow[]
    }>
  >('/location-management/service-users', { method: 'GET' })
  return res.data
}

export async function updateServiceUserLocation(
  serviceUserId: string,
  locationId: string | null,
): Promise<ServiceUserLocationRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserLocationRow>>(
    `/location-management/service-users/${serviceUserId}/location`,
    {
      method: 'PATCH',
      body: JSON.stringify({ locationId }),
    },
  )
  return res.data
}

export async function fetchEmployeeLocations(): Promise<{
  zones: LocationZoneOption[]
  locations: LocationLookup[]
  members: EmployeeLocationRow[]
}> {
  const res = await apiJson<
    ApiEnvelope<{
      zones: LocationZoneOption[]
      locations: LocationLookup[]
      members: EmployeeLocationRow[]
    }>
  >('/location-management/employees', { method: 'GET' })
  return res.data
}

export async function updateEmployeeLocation(
  employeeId: string,
  payload: {
    locationId?: string | null
    accessAllZones?: boolean
    floorLocationIds?: string[]
  },
): Promise<EmployeeLocationRow> {
  const res = await apiJson<ApiEnvelope<EmployeeLocationRow>>(
    `/location-management/employees/${employeeId}/location`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}
