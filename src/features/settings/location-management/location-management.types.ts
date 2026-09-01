export type LocationManagementSubTab = 'zones' | 'service-users' | 'employees'

export type LocationTreeChild = {
  id: string
  type: 'service_user' | 'employee'
  entityId: string
  label: string
}

export type LocationTreeArea = {
  id: string
  name: string
  code?: string
  scheduleAreaId?: string
  postcodes: string[]
  children: LocationTreeChild[]
}

export type LocationTreeBranch = {
  id: string
  name: string
  scheduleAreaId: string
  locationId: string | null
  locationName: string | null
  address: string | null
  areas: LocationTreeArea[]
  /** Unassigned service users + employees (area members nest under areas). */
  children: LocationTreeChild[]
}

export type LocationTreeZone = {
  id: string
  /** Real lookups.Zone id when known (for Add Branch). */
  lookupZoneId: string | null
  name: string
  code: string
  country: string | null
  city: string | null
  markerColorHex: string
  locationId: string | null
  locationName: string | null
  zoneName: string | null
  incidentMessageUserIds: string[]
  incidentEmailUserIds: string[]
  branches: LocationTreeBranch[]
  /** Flattened children (all branches); kept for backward compatibility */
  children: LocationTreeChild[]
}

export type LocationManagementTree = {
  organisation: { id: string; name: string }
  zones: LocationTreeZone[]
}

export type LocationActiveUser = {
  id: string
  email: string
  label: string
}

export type LocationZoneDetail = {
  id: string
  lookupZoneId?: string | null
  name: string
  code: string
  country?: string | null
  city?: string | null
  markerColorHex: string
  locationId: string | null
  locationName: string | null
  incidentMessageUserIds: string[]
  incidentEmailUserIds: string[]
}

export type ServiceUserAreaDetail = {
  id: string
  scheduleAreaId: string
  scheduleAreaName: string | null
  locationId: string | null
  name: string
  code: string
  description: string | null
  sortOrder: number
  isActive: boolean
  postcodes: string[]
}

export type LocationLookup = { id: string; name: string }

export type LocationAreaOption = {
  id: string
  name: string
  postcodes: string[]
}

export type LocationZoneOption = {
  id: string
  name: string
  branches: {
    id: string
    name: string
    scheduleAreaId?: string | null
    areas: LocationAreaOption[]
  }[]
}

export type ServiceUserLocationRow = {
  id: string
  fullName: string
  isActive: boolean
  locationId: string | null
  locationName: string | null
  zoneName: string | null
  roomName: string | null
  serviceUserAreaId: string | null
  serviceUserAreaName: string | null
  serviceUserAreaPostcodes: string[]
  /** Home address postcode (from ServiceUserAddress). */
  postcode: string | null
}

export type EmployeeLocationRow = {
  id: string
  fullName: string
  isActive: boolean
  locationId: string | null
  locationName: string | null
  zoneName: string | null
  floorNames: string
  accessAllZones: boolean
  floorLocationIds: string[]
}
