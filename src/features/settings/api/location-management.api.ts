import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateLocationBranchPayload,
  LocationActiveUser,
  LocationBranchResult,
  UpdateLocationBranchPayload,
  LocationManagementTree,
  LocationLookup,
  LocationZoneDetail,
  LocationZoneOption,
  ServiceUserAreaDetail,
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
    country?: string | null
    city?: string | null
  },
): Promise<LocationZoneDetail> {
  const res = await apiJson<ApiEnvelope<LocationZoneDetail>>(`/location-management/zones/${zoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function createLocationZone(payload: {
  name: string
  country?: string
  city?: string
  markerColorHex?: string
}): Promise<LocationZoneDetail> {
  const res = await apiJson<ApiEnvelope<LocationZoneDetail>>('/location-management/zones', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function createLocationBranch(
  payload: CreateLocationBranchPayload,
): Promise<LocationBranchResult> {
  const res = await apiJson<ApiEnvelope<LocationBranchResult>>('/location-management/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateLocationBranch(
  branchId: string,
  payload: UpdateLocationBranchPayload,
): Promise<LocationBranchResult> {
  const res = await apiJson<ApiEnvelope<LocationBranchResult>>(
    `/location-management/branches/${branchId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function createServiceUserArea(payload: {
  scheduleAreaId: string
  name: string
  code?: string
  description?: string
  postcodes?: string[]
  sortOrder?: number
}): Promise<ServiceUserAreaDetail> {
  const res = await apiJson<ApiEnvelope<ServiceUserAreaDetail>>('/location-management/areas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateServiceUserArea(
  areaId: string,
  payload: {
    name?: string
    code?: string
    description?: string | null
    postcodes?: string[]
    sortOrder?: number
    isActive?: boolean
  },
): Promise<ServiceUserAreaDetail> {
  const res = await apiJson<ApiEnvelope<ServiceUserAreaDetail>>(
    `/location-management/areas/${areaId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function deleteServiceUserArea(areaId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/location-management/areas/${areaId}`, {
    method: 'DELETE',
  })
}

function locationQuery(locationId?: string | null): string {
  if (!locationId) return ''
  const qs = new URLSearchParams({ locationId })
  return `?${qs.toString()}`
}

export async function fetchServiceUserLocations(locationId?: string | null): Promise<{
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
  >(`/location-management/service-users${locationQuery(locationId)}`, { method: 'GET' })
  return res.data
}

export async function updateServiceUserLocation(
  serviceUserId: string,
  payload: {
    locationId?: string | null
    serviceUserAreaId?: string | null
    postcode?: string | null
  },
): Promise<ServiceUserLocationRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserLocationRow>>(
    `/location-management/service-users/${serviceUserId}/location`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return res.data
}

export async function fetchEmployeeLocations(locationId?: string | null): Promise<{
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
  >(`/location-management/employees${locationQuery(locationId)}`, { method: 'GET' })
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
