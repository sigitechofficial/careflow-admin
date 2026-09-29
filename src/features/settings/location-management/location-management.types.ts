export type LocationManagementSubTab = 'zones' | 'service-users' | 'employees'

export type LocationAuditFields = {
  createdAt?: string | null
  updatedAt?: string | null
  createdByName?: string | null
  updatedByName?: string | null
}

export type LocationTreeChild = {
  id: string
  type: 'service_user' | 'employee'
  entityId: string
  label: string
}

export type LocationTreeArea = LocationAuditFields & {
  id: string
  name: string
  code?: string
  scheduleAreaId?: string
  postcodes: string[]
  children: LocationTreeChild[]
}

export type CqcRating = 'OUTSTANDING' | 'GOOD' | 'REQUIRES_IMPROVEMENT' | 'INADEQUATE'
export type CqcRatingStatus = 'RATED' | 'NOT_YET_RATED'
export type BranchStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED'

/** CQC registration, structured address and locale details of a branch (ScheduleArea). */
export type LocationBranchDetails = {
  cqcLocationId: string | null
  officialCqcName: string | null
  addressLine1: string | null
  addressLine2: string | null
  town: string | null
  county: string | null
  postcode: string | null
  country: string | null
  countryCode: string
  localAuthority: string | null
  phone: string | null
  email: string | null
  website: string | null
  serviceTypes: string[]
  regulatedActivities: string[]
  registeredManagers: string[]
  nominatedIndividual: string | null
  /** YYYY-MM-DD */
  cqcRegistrationDate: string | null
  cqcRating: CqcRating | null
  cqcRatingStatus: CqcRatingStatus | null
  status: BranchStatus
  timezone: string
  currency: string
  locale: string
  /** Set by geocoding (never guessed); read-only in the admin. */
  latitude: number | null
  longitude: number | null
}

export type LocationTreeBranch = LocationAuditFields &
  Partial<LocationBranchDetails> & {
  id: string
  name: string
  scheduleAreaId: string
  locationId: string | null
  locationName: string | null
  address: string | null
  /** 3-character visit reference branch code, e.g. L09 (read-only). */
  visitRefCode?: string | null
  areas: LocationTreeArea[]
  /** Unassigned service users + employees (area members nest under areas). */
  children: LocationTreeChild[]
}

/** Branch detail fields accepted by POST / PATCH branches (null or '' clears on update). */
export type LocationBranchDetailsPayload = {
  address?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  town?: string | null
  county?: string | null
  postcode?: string | null
  country?: string | null
  countryCode?: string
  localAuthority?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  cqcLocationId?: string | null
  officialCqcName?: string | null
  serviceTypes?: string[]
  regulatedActivities?: string[]
  registeredManagers?: string[]
  nominatedIndividual?: string | null
  cqcRegistrationDate?: string | null
  cqcRating?: CqcRating | null
  cqcRatingStatus?: CqcRatingStatus | null
  status?: BranchStatus
  timezone?: string
  currency?: string
  locale?: string
  /** Only from a Google-resolved address — never typed or guessed. */
  latitude?: number | null
  longitude?: number | null
}

export type CreateLocationBranchPayload = LocationBranchDetailsPayload & {
  zoneId: string
  name: string
  code?: string
  visitRefCode?: string
}

/** PATCH /location-management/branches/:id — code / visitRefCode are read-only. */
export type UpdateLocationBranchPayload = LocationBranchDetailsPayload & {
  name?: string
}

/** Response of POST / PATCH branches. */
export type LocationBranchResult = LocationAuditFields &
  Partial<LocationBranchDetails> & {
    id: string
    name: string
    scheduleAreaId: string
    locationId: string | null
    locationName: string | null
    address: string | null
    visitRefCode?: string | null
  }

export type LocationTreeZone = LocationAuditFields & {
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

export type ServiceUserLocationRow = LocationAuditFields & {
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

export type EmployeeLocationRow = LocationAuditFields & {
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
