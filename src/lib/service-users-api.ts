import { ApiError, apiJson, type ApiEnvelope } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { resolveServiceUserIdFromRoute } from '@/lib/service-user-route-id'
import { useAuthStore } from '@/store/auth.store'

export type SuLookupRow = { id: string; name: string; code: string; color?: string | null }

export type ServiceUserLookupsBundle = {
  statuses: Array<SuLookupRow & { description?: string | null }>
  titles: SuLookupRow[]
  genders: SuLookupRow[]
  maritalStatuses: SuLookupRow[]
  careTypes: SuLookupRow[]
  fundingTypes: SuLookupRow[]
  riskLevels: SuLookupRow[]
  relationshipTypes: SuLookupRow[]
  allergies: SuLookupRow[]
  absenceReasons: SuLookupRow[]
}

export async function fetchServiceUserLookups(): Promise<ServiceUserLookupsBundle> {
  const res = await apiJson<ApiEnvelope<ServiceUserLookupsBundle>>('/service-user-lookups', {
    method: 'GET',
  })
  return res.data
}

export type ServiceUserListEmployeeBrief = {
  id: string
  firstName: string | null
  lastName: string | null
} | null

export type ServiceUserListRow = {
  id: string
  serviceUserNumber: string | null
  firstName: string
  lastName: string
  preferredName: string | null
  dateOfBirth: string | null
  isActive: boolean
  serviceStartDate: string | null
  profilePhotoUrl: string | null
  title: { id: string; name: string; code: string } | null
  gender: { id: string; name: string; code: string } | null
  status: { id: string; name: string; code: string } | null
  careType: { id: string; name: string; code: string } | null
  fundingType: { id: string; name: string; code: string } | null
  riskLevel: { id: string; name: string; code: string; color: string | null } | null
  location: { id: string; name: string } | null
  keyWorker: ServiceUserListEmployeeBrief
  namedNurse: ServiceUserListEmployeeBrief
  /** True when an absence spans today (start ≤ today ≤ end or open-ended). */
  hasActiveAbsence?: boolean
  /** True when a current ACTIVE flash message exists and is not past displayUntil. */
  hasActiveFlashMessage?: boolean
}

export type ServiceUserListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type ListServiceUsersParams = {
  page?: number
  limit?: number
  search?: string
  statusId?: string
  showInactive?: boolean
  showDeleted?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type ServiceUserDetailContact = {
  id: string
  firstName: string
  lastName: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  address: string | null
  isPrimary: boolean
  isEmergencyContact: boolean
  canReceiveUpdates: boolean
  notes: string | null
  relationshipType: { id: string; name: string; code: string } | null
}

export type ServiceUserDetailReference = {
  id: string
  referenceType: string
  referenceValue: string
  notes: string | null
}

export type ServiceUserDetailAssignment = {
  id: string
  keyWorkerId: string | null
  namedNurseId: string | null
  locationId: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  keyWorker: ServiceUserListEmployeeBrief
  namedNurse: ServiceUserListEmployeeBrief
  location: { id: string; name: string } | null
} | null

export type ServiceUserDetailAddress = {
  id: string
  addressLine1: string | null
  addressLine2: string | null
  town: string | null
  county: string | null
  country: string | null
  postcode: string | null
  latitude: unknown
  longitude: unknown
  accessInstructions: string | null
  keySafeNumber: string | null
} | null

export type ServiceUserDetailPhoto = {
  id: string
  fileName: string
  originalName: string
  fileUrl: string
  mimeType: string
  isProfilePhoto: boolean
  uploadedAt: string
} | null

/** Aligned with Nest `mapServiceUserDetail` JSON shape. */
export type ServiceUserDetail = {
  id: string
  serviceUserNumber: string | null
  residentId: string | null
  residentGuid: string | null
  firstName: string
  middleName: string | null
  lastName: string
  preferredName: string | null
  dateOfBirth: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  nhsNumber: string | null
  socialServicesRef: string | null
  nationalInsuranceNumber: string | null
  serviceStartDate: string | null
  serviceEndDate: string | null
  profilePhotoUrl: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  title: { id: string; name: string; code: string } | null
  gender: { id: string; name: string; code: string } | null
  maritalStatus: { id: string; name: string; code: string } | null
  status: { id: string; name: string; code: string } | null
  careType: { id: string; name: string; code: string } | null
  fundingType: { id: string; name: string; code: string } | null
  riskLevel: { id: string; name: string; code: string; color: string | null } | null
  location: { id: string; name: string } | null
  keyWorker: ServiceUserListEmployeeBrief
  namedNurse: ServiceUserListEmployeeBrief
  address: ServiceUserDetailAddress
  contacts: ServiceUserDetailContact[]
  references: ServiceUserDetailReference[]
  assignment: ServiceUserDetailAssignment
  profilePhoto: ServiceUserDetailPhoto
}

export async function fetchServiceUser(id: string): Promise<ServiceUserDetail> {
  const serviceUserId = resolveServiceUserIdFromRoute(id)
  if (!serviceUserId) {
    throw new ApiError('Service user id is missing', 0)
  }
  const res = await apiJson<ApiEnvelope<ServiceUserDetail>>(
    `/service-users/${serviceUserId}`,
    { method: 'GET' },
  )
  const payload = res.data as ServiceUserDetail | { data: ServiceUserDetail } | null | undefined
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data && typeof payload.data === 'object' && 'id' in payload.data) {
    return payload.data
  }
  if (payload && typeof payload === 'object' && 'id' in payload) {
    return payload as ServiceUserDetail
  }
  throw new ApiError(
    'Invalid service user response from API. Confirm VITE_API_BASE_URL points at the Nest API (e.g. http://localhost:3000).',
    0,
  )
}

export async function deleteServiceUser(serviceUserId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}`, { method: 'DELETE' })
}

export type EnterpriseFundingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ENDED'
  | 'REJECTED'
  | 'UNKNOWN'

export type EnterpriseFundingTypeRow = {
  id: string
  name: string
  code: string
  description?: string | null
}

export type EnterpriseFunderRow = {
  id: string
  name: string
  code: string | null
  fundingType?: { id: string; name: string; code: string } | null
}

export type EnterpriseServiceUserFundingRow = {
  id: string
  serviceUserId: string
  fundingTypeId: string
  funderId: string | null
  status: EnterpriseFundingStatus
  fundingReference: string | null
  approvalReference: string | null
  packageName: string | null
  startDate: string | null
  endDate: string | null
  weeklyBudget: string | null
  hourlyRate: string | null
  contributionAmount: string | null
  isPrimary: boolean
  isActive: boolean
  approvedAt: string | null
  approvedById: string | null
  reviewDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  fundingType: { id: string; name: string; code: string }
  funder: { id: string; name: string; code: string | null } | null
  approvedBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}

export type FundingPaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export async function listEnterpriseFundingTypes(options?: { limit?: number }): Promise<EnterpriseFundingTypeRow[]> {
  const qs = new URLSearchParams()
  qs.set('limit', String(options?.limit ?? 200))
  const res = await apiJson<ApiEnvelope<EnterpriseFundingTypeRow[]>>(`/funding-types?${qs}`, { method: 'GET' })
  return res.data
}

export async function listEnterpriseFunders(options?: { limit?: number }): Promise<EnterpriseFunderRow[]> {
  const qs = new URLSearchParams()
  qs.set('limit', String(options?.limit ?? 200))
  const res = await apiJson<ApiEnvelope<EnterpriseFunderRow[]>>(`/funders?${qs}`, { method: 'GET' })
  return res.data
}

export async function listServiceUserEnterpriseFundings(
  serviceUserId: string,
  params?: { page?: number; limit?: number },
): Promise<{ rows: EnterpriseServiceUserFundingRow[]; meta: FundingPaginationMeta }> {
  const qs = new URLSearchParams()
  if (params?.page != null) qs.set('page', String(params.page))
  if (params?.limit != null) qs.set('limit', String(params.limit))
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow[]>>(
    `/service-users/${serviceUserId}/funding${q ? `?${q}` : ''}`,
    { method: 'GET' },
  )
  const meta = (res.meta ?? {}) as Partial<FundingPaginationMeta>
  return {
    rows: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
      total: meta.total ?? res.data.length,
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage,
      hasPrevPage: meta.hasPrevPage,
    },
  }
}

export async function getServiceUserEnterpriseFunding(
  serviceUserId: string,
  fundingId: string,
): Promise<EnterpriseServiceUserFundingRow> {
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow>>(
    `/service-users/${serviceUserId}/funding/${fundingId}`,
    { method: 'GET' },
  )
  return res.data
}

export type CreateEnterpriseServiceUserFundingBody = {
  fundingTypeId: string
  funderId?: string | null
  status?: EnterpriseFundingStatus
  fundingReference?: string | null
  approvalReference?: string | null
  packageName?: string | null
  startDate?: string | null
  endDate?: string | null
  weeklyBudget?: number | null
  hourlyRate?: number | null
  contributionAmount?: number | null
  isPrimary?: boolean
  reviewDate?: string | null
  notes?: string | null
}

export async function createServiceUserEnterpriseFunding(
  serviceUserId: string,
  body: CreateEnterpriseServiceUserFundingBody,
): Promise<EnterpriseServiceUserFundingRow> {
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow>>(
    `/service-users/${serviceUserId}/funding`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserEnterpriseFunding(
  serviceUserId: string,
  fundingId: string,
  body: Partial<CreateEnterpriseServiceUserFundingBody>,
): Promise<EnterpriseServiceUserFundingRow> {
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow>>(
    `/service-users/${serviceUserId}/funding/${fundingId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserEnterpriseFunding(serviceUserId: string, fundingId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/funding/${fundingId}`, { method: 'DELETE' })
}

export async function setPrimaryServiceUserEnterpriseFunding(
  serviceUserId: string,
  fundingId: string,
): Promise<EnterpriseServiceUserFundingRow> {
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow>>(
    `/service-users/${serviceUserId}/funding/${fundingId}/set-primary`,
    { method: 'PATCH', body: JSON.stringify({}) },
  )
  return res.data
}

export async function approveServiceUserEnterpriseFunding(
  serviceUserId: string,
  fundingId: string,
  body?: { approvalReference?: string | null; notes?: string | null },
): Promise<EnterpriseServiceUserFundingRow> {
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow>>(
    `/service-users/${serviceUserId}/funding/${fundingId}/approve`,
    { method: 'PATCH', body: JSON.stringify(body ?? {}) },
  )
  return res.data
}

export async function endServiceUserEnterpriseFunding(
  serviceUserId: string,
  fundingId: string,
  body: { endDate: string; reason?: string | null; notes?: string | null },
): Promise<EnterpriseServiceUserFundingRow> {
  const res = await apiJson<ApiEnvelope<EnterpriseServiceUserFundingRow>>(
    `/service-users/${serviceUserId}/funding/${fundingId}/end`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function patchServiceUserFundingRefs(
  serviceUserId: string,
  body: { socialServicesRef?: string | null; nhsNumber?: string | null },
): Promise<{ nhsNumber: string | null; socialServicesRef: string | null }> {
  const res = await apiJson<ApiEnvelope<{ nhsNumber: string | null; socialServicesRef: string | null }>>(
    `/service-users/${serviceUserId}/funding`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export type ServiceUserInventoryItem = {
  id: string
  serviceUserId: string
  itemName: string
  quantity: number
  itemValue: string | null
  description: string
  location: string
  itemPhotoUrl: string | null
  dateDeposited: string
  witnessSignatureDataUrl: string | null
  createdAt: string
  updatedAt: string
}

export type CreateServiceUserInventoryItemPayload = {
  itemName: string
  quantity?: number
  itemValue?: string
  description: string
  location: string
  dateDeposited: string
  witnessSignatureDataUrl?: string
}

export type UpdateServiceUserInventoryItemPayload = Partial<CreateServiceUserInventoryItemPayload>

export async function listServiceUserInventory(serviceUserId: string): Promise<ServiceUserInventoryItem[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserInventoryItem[]>>(`/service-users/${serviceUserId}/inventory`, {
    method: 'GET',
  })
  return res.data
}

export async function createServiceUserInventoryItem(
  serviceUserId: string,
  body: CreateServiceUserInventoryItemPayload,
): Promise<ServiceUserInventoryItem> {
  const res = await apiJson<ApiEnvelope<ServiceUserInventoryItem>>(`/service-users/${serviceUserId}/inventory`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateServiceUserInventoryItem(
  serviceUserId: string,
  itemId: string,
  body: UpdateServiceUserInventoryItemPayload,
): Promise<ServiceUserInventoryItem> {
  const res = await apiJson<ApiEnvelope<ServiceUserInventoryItem>>(
    `/service-users/${serviceUserId}/inventory/${itemId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserInventoryItem(serviceUserId: string, itemId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/inventory/${itemId}`, { method: 'DELETE' })
}

export async function uploadServiceUserInventoryItemPhoto(
  serviceUserId: string,
  itemId: string,
  file: File,
): Promise<ServiceUserInventoryItem> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/inventory/${itemId}/photo`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  const envelope = bodyJson as ApiEnvelope<ServiceUserInventoryItem>
  if (envelope.data && typeof envelope.data === 'object' && 'id' in envelope.data) {
    return envelope.data as ServiceUserInventoryItem
  }
  throw new ApiError('Upload succeeded but item was not returned.', res.status, bodyJson)
}

export type ServiceUserAllergyRow = {
  id: string
  serviceUserId: string
  allergyCatalogId: string | null
  allergyName: string
  comment: string
  createdAt: string
  updatedAt: string
}

export type CreateServiceUserAllergyPayload = {
  allergyCatalogId?: string
  allergyName?: string
  comment: string
}

export type UpdateServiceUserAllergyPayload = Partial<CreateServiceUserAllergyPayload>

export async function listServiceUserAllergies(serviceUserId: string): Promise<ServiceUserAllergyRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserAllergyRow[]>>(`/service-users/${serviceUserId}/allergies`, {
    method: 'GET',
  })
  return res.data
}

export type ServiceUserMedicationLookupNested = {
  id: string
  name: string
  code: string
} | null

export type MedicationScheduleSummary = {
  id: string
  dueTime: string | null
  dueVisitName: string | null
  roundId?: string | null
  frequencyText?: string | null
}

/** List row from `GET /service-users/:id/medications` (aligned with Prisma + Nest includes). */
export type ServiceUserMedicationRow = {
  id: string
  serviceUserId: string
  medicationName: string
  dose: string | null
  strength: string | null
  status: string
  startDate: string | null
  endDate: string | null
  expiryDate?: string | null
  howAssisted?: string | null
  instructions: string | null
  notes?: string | null
  frequencyText: string | null
  isControlledMedication: boolean
  route?: ServiceUserMedicationLookupNested
  frequency?: ServiceUserMedicationLookupNested
  medicationType?: ServiceUserMedicationLookupNested
  category?: ServiceUserMedicationLookupNested
  medicationPack?: { id: string; name: string } | null
  schedules?: MedicationScheduleSummary[]
}

export type MedicationPackItemRow = {
  id: string
  medicationPackId: string
  medicationName: string
  strength: string | null
  notes: string | null
  sortOrder: number
}

export type MedicationPackRow = {
  id: string
  serviceUserId: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  items: MedicationPackItemRow[]
}

export type CreateMedicationPackPayload = {
  name: string
  description?: string
  startDate?: string
  endDate?: string
}

export type CreateMedicationPackItemPayload = {
  medicationName: string
  strength?: string
  notes?: string
  sortOrder?: number
}

export type ListServiceUserMedicationsParams = {
  page?: number
  limit?: number
  search?: string
  showPastEndDate?: boolean
}

export async function listServiceUserMedications(
  serviceUserId: string,
  params: ListServiceUserMedicationsParams = {},
): Promise<{ rows: ServiceUserMedicationRow[]; meta: ServiceUserListMeta }> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.showPastEndDate === true) qs.set('showPastEndDate', 'true')
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<ServiceUserMedicationRow[]>>(
    `/service-users/${serviceUserId}/medications${q ? `?${q}` : ''}`,
    { method: 'GET' },
  )
  const meta = (res.meta ?? {}) as Partial<ServiceUserListMeta>
  return {
    rows: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
      total: meta.total ?? res.data.length,
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage ?? false,
      hasPrevPage: meta.hasPrevPage ?? false,
    },
  }
}

export type MedicationLookupRow = { id: string; name: string; code: string }

export type MedicationLookupsBundle = {
  types: MedicationLookupRow[]
  routes: MedicationLookupRow[]
  categories: MedicationLookupRow[]
  frequencies: MedicationLookupRow[]
  rounds: MedicationLookupRow[]
  notGivenReasons: MedicationLookupRow[]
}

export async function fetchMedicationLookups(): Promise<MedicationLookupsBundle> {
  const res = await apiJson<ApiEnvelope<MedicationLookupsBundle>>('/medication-lookups', { method: 'GET' })
  return res.data
}

export type CreateMedicationScheduleItemPayload = {
  dueTime: string
  dueVisitName?: string
  roundId?: string
}

/** Body for `POST /service-users/:id/medications` (Nest `CreateServiceUserMedicationDto`). */
export type CreateServiceUserMedicationPayload = {
  medicationName: string
  medicationKind: 'REGULAR' | 'PRN'
  dose?: string
  strength?: string
  startDate?: string
  endDate?: string
  expiryDate?: string
  howAssisted?: string
  medicationTypeId?: string
  routeId?: string
  categoryId?: string
  frequencyId?: string
  frequencyText?: string
  frequencyIntervalDays?: number
  instructions?: string
  notes?: string
  isControlledMedication?: boolean
  medicationPackId?: string
  status?: 'ACTIVE' | 'ENDED' | 'PAUSED' | 'CANCELLED'
  /** One schedule row per administration time (e.g. 3× daily → 3 rows). */
  schedules?: CreateMedicationScheduleItemPayload[]
}

export async function createServiceUserMedication(
  serviceUserId: string,
  body: CreateServiceUserMedicationPayload,
): Promise<ServiceUserMedicationRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserMedicationRow>>(
    `/service-users/${serviceUserId}/medications`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function listMedicationPacks(serviceUserId: string): Promise<MedicationPackRow[]> {
  const res = await apiJson<ApiEnvelope<MedicationPackRow[]>>(
    `/service-users/${serviceUserId}/medication-packs`,
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function createMedicationPack(
  serviceUserId: string,
  body: CreateMedicationPackPayload,
): Promise<MedicationPackRow> {
  const res = await apiJson<ApiEnvelope<MedicationPackRow>>(
    `/service-users/${serviceUserId}/medication-packs`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function addMedicationPackItem(
  serviceUserId: string,
  packId: string,
  body: CreateMedicationPackItemPayload,
): Promise<MedicationPackItemRow> {
  const res = await apiJson<ApiEnvelope<MedicationPackItemRow>>(
    `/service-users/${serviceUserId}/medication-packs/${packId}/items`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function createServiceUserAllergy(
  serviceUserId: string,
  body: CreateServiceUserAllergyPayload,
): Promise<ServiceUserAllergyRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserAllergyRow>>(`/service-users/${serviceUserId}/allergies`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateServiceUserAllergy(
  serviceUserId: string,
  allergyId: string,
  body: UpdateServiceUserAllergyPayload,
): Promise<ServiceUserAllergyRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserAllergyRow>>(
    `/service-users/${serviceUserId}/allergies/${allergyId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserAllergy(serviceUserId: string, allergyId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/allergies/${allergyId}`, {
    method: 'DELETE',
  })
}

export type ServiceUserLegalDocuments = {
  id: string | null
  serviceUserId: string
  dnacprInPlace: boolean
  dnacprCertificateUrl: string | null
  dnacprStartDate: string | null
  lpaHealthCertificateUrl: string | null
  lpaFinanceCertificateUrl: string | null
  updatedAt: string | null
}

export type ServiceUserDolsRow = {
  id: string
  serviceUserId: string
  applicationDate: string | null
  issueDate: string | null
  renewalDate: string | null
  isCurrent: boolean
  reportedToChc: boolean
  notes: string
  certificateUrl: string | null
  createdAt: string
  updatedAt: string
}

export type ServiceUserDocumentsBundle = {
  legal: ServiceUserLegalDocuments
  dols: ServiceUserDolsRow[]
}

export type PatchServiceUserLegalDocumentsPayload = {
  dnacprInPlace?: boolean
  dnacprStartDate?: string | null
}

export async function fetchServiceUserDocuments(serviceUserId: string): Promise<ServiceUserDocumentsBundle> {
  const res = await apiJson<ApiEnvelope<ServiceUserDocumentsBundle>>(`/service-users/${serviceUserId}/documents`, {
    method: 'GET',
  })
  return res.data
}

export async function patchServiceUserLegalDocuments(
  serviceUserId: string,
  body: PatchServiceUserLegalDocumentsPayload,
): Promise<ServiceUserLegalDocuments> {
  const res = await apiJson<ApiEnvelope<ServiceUserLegalDocuments>>(`/service-users/${serviceUserId}/documents/legal`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function createServiceUserDolsRecord(
  serviceUserId: string,
  body: Partial<{
    applicationDate: string
    issueDate: string
    renewalDate: string
    isCurrent: boolean
    reportedToChc: boolean
    notes: string
  }>,
): Promise<ServiceUserDolsRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserDolsRow>>(`/service-users/${serviceUserId}/documents/dols`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateServiceUserDolsRecord(
  serviceUserId: string,
  dolsId: string,
  body: Partial<{
    applicationDate: string | null
    issueDate: string | null
    renewalDate: string | null
    isCurrent: boolean
    reportedToChc: boolean
    notes: string
  }>,
): Promise<ServiceUserDolsRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserDolsRow>>(
    `/service-users/${serviceUserId}/documents/dols/${dolsId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserDolsRecord(serviceUserId: string, dolsId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/documents/dols/${dolsId}`, {
    method: 'DELETE',
  })
}

async function postDocumentMultipart(
  serviceUserId: string,
  path: string,
  file: File,
): Promise<ServiceUserLegalDocuments | ServiceUserDolsRow> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/documents/${path}`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  const envelope = bodyJson as ApiEnvelope<ServiceUserLegalDocuments | ServiceUserDolsRow>
  if (envelope.data && typeof envelope.data === 'object') {
    return envelope.data as ServiceUserLegalDocuments | ServiceUserDolsRow
  }
  throw new ApiError('Upload succeeded but response was unexpected.', res.status, bodyJson)
}

export async function uploadServiceUserDnacprCertificate(
  serviceUserId: string,
  file: File,
): Promise<ServiceUserLegalDocuments> {
  const data = await postDocumentMultipart(serviceUserId, 'legal/dnacpr-certificate', file)
  return data as ServiceUserLegalDocuments
}

export async function uploadServiceUserLpaHealthCertificate(
  serviceUserId: string,
  file: File,
): Promise<ServiceUserLegalDocuments> {
  const data = await postDocumentMultipart(serviceUserId, 'legal/lpa-health-certificate', file)
  return data as ServiceUserLegalDocuments
}

export async function uploadServiceUserLpaFinanceCertificate(
  serviceUserId: string,
  file: File,
): Promise<ServiceUserLegalDocuments> {
  const data = await postDocumentMultipart(serviceUserId, 'legal/lpa-finance-certificate', file)
  return data as ServiceUserLegalDocuments
}

export async function uploadServiceUserDolsCertificate(
  serviceUserId: string,
  dolsId: string,
  file: File,
): Promise<ServiceUserDolsRow> {
  const data = await postDocumentMultipart(serviceUserId, `dols/${dolsId}/certificate`, file)
  return data as ServiceUserDolsRow
}

export type ServiceUserAbsenceType = 'PLANNED' | 'UNPLANNED' | 'NOT_APPLICABLE'

export type ServiceUserAbsenceRow = {
  id: string
  serviceUserId: string
  startDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  absenceType: ServiceUserAbsenceType
  absenceReasonCatalogId: string
  reason: { id: string; name: string; code: string }
  notes: string
  contactInformation: string
  createdAt: string
  updatedAt: string
}

export type CreateServiceUserAbsencePayload = {
  startDate: string
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  absenceType?: ServiceUserAbsenceType
  absenceReasonCatalogId: string
  notes?: string
  contactInformation?: string
}

export type UpdateServiceUserAbsencePayload = Partial<CreateServiceUserAbsencePayload>

export async function listServiceUserAbsences(serviceUserId: string): Promise<ServiceUserAbsenceRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserAbsenceRow[]>>(`/service-users/${serviceUserId}/absences`, {
    method: 'GET',
  })
  return res.data
}

export async function createServiceUserAbsence(
  serviceUserId: string,
  body: CreateServiceUserAbsencePayload,
): Promise<ServiceUserAbsenceRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserAbsenceRow>>(`/service-users/${serviceUserId}/absences`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateServiceUserAbsence(
  serviceUserId: string,
  absenceId: string,
  body: UpdateServiceUserAbsencePayload,
): Promise<ServiceUserAbsenceRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserAbsenceRow>>(
    `/service-users/${serviceUserId}/absences/${absenceId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserAbsence(serviceUserId: string, absenceId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/absences/${absenceId}`, {
    method: 'DELETE',
  })
}

export type ServiceUserReferenceItemPayload = {
  id?: string
  referenceType: string
  referenceValue: string
  notes?: string
}

export type UpdateServiceUserPayload = {
  firstName?: string
  lastName?: string
  middleName?: string
  preferredName?: string
  dateOfBirth?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  nhsNumber?: string | null
  nationalInsuranceNumber?: string | null
  serviceStartDate?: string | null
  serviceEndDate?: string | null
  titleId?: string | null
  genderId?: string | null
  maritalStatusId?: string | null
  statusId?: string | null
  careTypeId?: string | null
  fundingTypeId?: string | null
  riskLevelId?: string | null
  locationId?: string | null
  keyWorkerId?: string | null
  namedNurseId?: string | null
  notes?: string | null
  serviceUserNumber?: string | null
  residentId?: string | null
  residentGuid?: string | null
  references?: ServiceUserReferenceItemPayload[]
}

export async function updateServiceUser(id: string, body: UpdateServiceUserPayload): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>(`/service-users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

/** Multipart upload — same pattern as `uploadEmployeePhoto` (no JSON Content-Type). */
export async function uploadServiceUserPhoto(
  serviceUserId: string,
  file: File,
): Promise<{ profilePhotoUrl: string }> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/photo`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  const envelope = bodyJson as ApiEnvelope<{ fileUrl?: string | null }>
  const row = envelope.data
  if (row && typeof row.fileUrl === 'string' && row.fileUrl.trim()) {
    return { profilePhotoUrl: row.fileUrl.trim() }
  }
  throw new ApiError('Upload succeeded but photo URL was not returned.', res.status, bodyJson)
}

export async function listServiceUsers(params: ListServiceUsersParams = {}): Promise<{
  rows: ServiceUserListRow[]
  meta: ServiceUserListMeta
}> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.statusId) qs.set('statusId', params.statusId)
  if (params.showInactive === true) qs.set('showInactive', 'true')
  if (params.showDeleted === true) qs.set('showDeleted', 'true')
  if (params.sortBy) qs.set('sortBy', params.sortBy)
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder)
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<ServiceUserListRow[]>>(`/service-users${q ? `?${q}` : ''}`, { method: 'GET' })
  const meta = (res.meta ?? {}) as Partial<ServiceUserListMeta>
  return {
    rows: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
      total: meta.total ?? res.data.length,
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage ?? false,
      hasPrevPage: meta.hasPrevPage ?? false,
    },
  }
}

/** Payload aligned with Nest `CreateServiceUserDto` (optional fields omitted when empty). */
export type CreateServiceUserPayload = {
  firstName: string
  lastName: string
  middleName?: string
  preferredName?: string
  dateOfBirth?: string
  email?: string
  phone?: string
  mobile?: string
  nhsNumber?: string
  nationalInsuranceNumber?: string
  serviceStartDate?: string
  serviceEndDate?: string
  titleId?: string
  genderId?: string
  maritalStatusId?: string
  statusId?: string
  careTypeId?: string
  fundingTypeId?: string
  riskLevelId?: string
  locationId?: string
  keyWorkerId?: string
  namedNurseId?: string
  notes?: string
  serviceUserNumber?: string
  residentId?: string
  residentGuid?: string
  references?: Array<{
    referenceType: string
    referenceValue: string
    notes?: string
  }>
}

export async function createServiceUser(body: CreateServiceUserPayload): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>('/service-users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export type PatchServiceUserAddressPayload = {
  addressLine1?: string
  addressLine2?: string
  town?: string
  county?: string
  country?: string
  postcode?: string
  latitude?: number
  longitude?: number
  accessInstructions?: string
  keySafeNumber?: string
}

export async function patchServiceUserAddress(
  serviceUserId: string,
  body: PatchServiceUserAddressPayload,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/address`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** Stored on `ServiceUserReference` for contacts-tab consent toggles (not profile SU_* fields). */
export const SU_CONTACT_REF = {
  consentFamily: 'SU_CONTACT_CONSENT_FAMILY',
  shareCarePlan: 'SU_CONTACT_SHARE_CARE_PLAN',
} as const

/** Merge consent flags into the full reference list for `PATCH /service-users/:id` (avoids dropping other refs). */
export function mergeServiceUserContactConsentRefs(
  refs: ServiceUserDetailReference[],
  consentFamily: boolean,
  shareCarePlan: boolean,
): ServiceUserReferenceItemPayload[] {
  const strip = new Set<string>([SU_CONTACT_REF.consentFamily, SU_CONTACT_REF.shareCarePlan])
  const out: ServiceUserReferenceItemPayload[] = refs
    .filter((r) => !strip.has(r.referenceType))
    .map((r) => ({
      id: r.id,
      referenceType: r.referenceType,
      referenceValue: r.referenceValue,
      notes: r.notes ?? undefined,
    }))
  const pushOn = (type: string, on: boolean) => {
    if (!on) return
    const prev = refs.find((r) => r.referenceType === type)
    if (prev) out.push({ id: prev.id, referenceType: type, referenceValue: 'true' })
    else out.push({ referenceType: type, referenceValue: 'true' })
  }
  pushOn(SU_CONTACT_REF.consentFamily, consentFamily)
  pushOn(SU_CONTACT_REF.shareCarePlan, shareCarePlan)
  return out
}

export function contactConsentFromReferences(refs: ServiceUserDetailReference[]): {
  consentFamily: boolean
  shareCarePlan: boolean
} {
  return {
    consentFamily: refs.some((r) => r.referenceType === SU_CONTACT_REF.consentFamily && r.referenceValue === 'true'),
    shareCarePlan: refs.some((r) => r.referenceType === SU_CONTACT_REF.shareCarePlan && r.referenceValue === 'true'),
  }
}

/** Aligned with Nest `CreateServiceUserContactDto`. */
export type CreateServiceUserContactPayload = {
  firstName: string
  lastName?: string
  relationshipTypeId?: string
  phone?: string
  mobile?: string
  email?: string
  address?: string
  isPrimary?: boolean
  isEmergencyContact?: boolean
  canReceiveUpdates?: boolean
  notes?: string
}

export type UpdateServiceUserContactPayload = Partial<CreateServiceUserContactPayload>

export async function createServiceUserContact(
  serviceUserId: string,
  body: CreateServiceUserContactPayload,
): Promise<unknown> {
  const res = await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateServiceUserContact(
  serviceUserId: string,
  contactId: string,
  body: UpdateServiceUserContactPayload,
): Promise<unknown> {
  const res = await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteServiceUserContact(serviceUserId: string, contactId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/contacts/${contactId}`, {
    method: 'DELETE',
  })
}

export type ServiceUserDomCareCarerBrief = {
  id: string
  firstName: string
  lastName: string
}

export type ServiceUserDomCareData = {
  serviceUserId: string
  accessInstruction: string
  accessRisks: string
  doorCode: string | null
  careInstructions: string
  weeklyContractedHours: string | null
  contractDocumentUrl: string | null
  numberOfCarers: number
  preferredCarers: ServiceUserDomCareCarerBrief[]
  blockedCarers: ServiceUserDomCareCarerBrief[]
}

export type PatchServiceUserDomCarePayload = {
  accessInstruction?: string
  accessRisks?: string
  doorCode?: string | null
  careInstructions?: string
  weeklyContractedHours?: string | null
  numberOfCarers?: number
  preferredEmployeeIds?: string[]
  blockedEmployeeIds?: string[]
}

export async function fetchServiceUserDomCare(serviceUserId: string): Promise<ServiceUserDomCareData> {
  const res = await apiJson<ApiEnvelope<ServiceUserDomCareData>>(`/service-users/${serviceUserId}/dom-care`, {
    method: 'GET',
  })
  return res.data
}

export async function patchServiceUserDomCare(
  serviceUserId: string,
  body: PatchServiceUserDomCarePayload,
): Promise<ServiceUserDomCareData> {
  const res = await apiJson<ApiEnvelope<ServiceUserDomCareData>>(`/service-users/${serviceUserId}/dom-care`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function searchServiceUserDomCareEmployees(
  serviceUserId: string,
  params: { search?: string; limit?: number } = {},
): Promise<ServiceUserDomCareCarerBrief[]> {
  const q = new URLSearchParams()
  if (params.search?.trim()) q.set('search', params.search.trim())
  if (params.limit != null) q.set('limit', String(params.limit))
  const qs = q.toString()
  const path = `/service-users/${serviceUserId}/dom-care/employee-search${qs ? `?${qs}` : ''}`
  const res = await apiJson<ApiEnvelope<ServiceUserDomCareCarerBrief[]>>(path, { method: 'GET' })
  return res.data
}

export async function uploadServiceUserDomCareContract(
  serviceUserId: string,
  file: File,
): Promise<ServiceUserDomCareData> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/dom-care/contract`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  const envelope = bodyJson as ApiEnvelope<ServiceUserDomCareData>
  return envelope.data
}

export type ServiceUserInitialAssessmentData = {
  serviceUserId: string
  numberOfCarers: number
  likesToBeKnownAs: string | null
  doorCode: string | null
  accessRisks: string
  accessInstruction: string
  reasonForAdmission: string
  previousMedicalHistory: string
  careInstructions: string
  assessmentPictureUrl: string | null
  checklist: Record<string, boolean>
  culturalReligiousNotes: string
  careCarerNumbersNote: string
  additionalRisksNotes: string
  environmentAccessHazardsNotes: string
  hydrationComment: string
  nutritionComment: string
}

export type PatchServiceUserInitialAssessmentPayload = {
  numberOfCarers?: number
  likesToBeKnownAs?: string | null
  doorCode?: string | null
  accessRisks?: string
  accessInstruction?: string
  reasonForAdmission?: string
  previousMedicalHistory?: string
  careInstructions?: string
  /** Serialized to `checklistJson` on the wire (Nest whitelist strips nested object keys). */
  checklist?: Record<string, boolean>
  culturalReligiousNotes?: string
  careCarerNumbersNote?: string
  additionalRisksNotes?: string
  environmentAccessHazardsNotes?: string
  hydrationComment?: string
  nutritionComment?: string
}

export async function fetchServiceUserInitialAssessment(
  serviceUserId: string,
): Promise<ServiceUserInitialAssessmentData> {
  const res = await apiJson<ApiEnvelope<ServiceUserInitialAssessmentData>>(
    `/service-users/${serviceUserId}/initial-assessment`,
    { method: 'GET' },
  )
  return res.data
}

export async function patchServiceUserInitialAssessment(
  serviceUserId: string,
  body: PatchServiceUserInitialAssessmentPayload,
): Promise<ServiceUserInitialAssessmentData> {
  const { checklist, ...rest } = body
  const payload: Record<string, unknown> = { ...rest }
  if (checklist !== undefined) {
    payload.checklistJson = JSON.stringify(checklist)
  }
  const res = await apiJson<ApiEnvelope<ServiceUserInitialAssessmentData>>(
    `/service-users/${serviceUserId}/initial-assessment`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
  return res.data
}

export async function uploadServiceUserInitialAssessmentPicture(
  serviceUserId: string,
  file: File,
): Promise<ServiceUserInitialAssessmentData> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/initial-assessment/picture`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  const envelope = bodyJson as ApiEnvelope<ServiceUserInitialAssessmentData>
  return envelope.data
}

// --- Live-in Service Profile (Nest: service-user-live-in-profiles, live-in-lookups) ---

export type LiveInLookupRow = { id: string; name: string; code: string; description?: string | null; sortOrder?: number }

export type LiveInLookupsBundle = {
  serviceTypes: LiveInLookupRow[]
  levelsOfCare: LiveInLookupRow[]
  scanTypes: LiveInLookupRow[]
}

export async function fetchLiveInLookupsBundle(): Promise<LiveInLookupsBundle> {
  const res = await apiJson<ApiEnvelope<LiveInLookupsBundle>>(`/live-in-lookups`, { method: 'GET' })
  return res.data
}

export type LiveInProfileStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED'

export type LiveInCarerLink = {
  id: string
  employeeId: string
  reason: string | null
  employee?: { personalDetail?: { firstName: string; lastName: string } | null } | null
}

export type LiveInContractDoc = {
  id: string
  fileName: string
  originalName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}

export type ServiceUserLiveInProfileDetail = {
  id: string
  serviceUserId: string
  isLiveInEnabled: boolean
  isCustom: boolean
  serviceTypeId: string | null
  residentContactId: string | null
  levelOfCareId: string | null
  scanTypeId: string | null
  numberOfCarers: number
  careInstructions: string | null
  startDate: string | null
  endDate: string | null
  reviewDate: string | null
  status: LiveInProfileStatus
  notes: string | null
  serviceType?: { id: string; name: string; code: string } | null
  residentContact?: { id: string; firstName: string; lastName: string | null; phone?: string | null; mobile?: string | null; email?: string | null } | null
  levelOfCare?: { id: string; name: string; code: string } | null
  scanType?: { id: string; name: string; code: string } | null
  preferredCarers: LiveInCarerLink[]
  blockedCarers: LiveInCarerLink[]
  contractDocuments: LiveInContractDoc[]
}

export async function fetchServiceUserLiveInProfile(
  serviceUserId: string,
): Promise<ServiceUserLiveInProfileDetail | null> {
  const res = await apiJson<ApiEnvelope<ServiceUserLiveInProfileDetail | null>>(
    `/service-users/${serviceUserId}/live-in-profile`,
    { method: 'GET' },
  )
  return res.data ?? null
}

export type PatchServiceUserLiveInProfilePayload = {
  isLiveInEnabled?: boolean
  isCustom?: boolean
  serviceTypeId?: string | null
  residentContactId?: string | null
  levelOfCareId?: string | null
  scanTypeId?: string | null
  numberOfCarers?: number
  careInstructions?: string | null
  startDate?: string | null
  endDate?: string | null
  reviewDate?: string | null
  status?: LiveInProfileStatus
  notes?: string | null
}

export async function createServiceUserLiveInProfile(
  serviceUserId: string,
  body: PatchServiceUserLiveInProfilePayload = {},
): Promise<ServiceUserLiveInProfileDetail> {
  const res = await apiJson<ApiEnvelope<ServiceUserLiveInProfileDetail>>(
    `/service-users/${serviceUserId}/live-in-profile`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function patchServiceUserLiveInProfile(
  serviceUserId: string,
  body: PatchServiceUserLiveInProfilePayload,
): Promise<ServiceUserLiveInProfileDetail> {
  const res = await apiJson<ApiEnvelope<ServiceUserLiveInProfileDetail>>(
    `/service-users/${serviceUserId}/live-in-profile`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserLiveInProfile(serviceUserId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/live-in-profile`, { method: 'DELETE' })
}

export async function patchServiceUserLiveInProfileStatus(
  serviceUserId: string,
  body: { status: LiveInProfileStatus; reason?: string },
): Promise<ServiceUserLiveInProfileDetail> {
  const res = await apiJson<ApiEnvelope<ServiceUserLiveInProfileDetail>>(
    `/service-users/${serviceUserId}/live-in-profile/status`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function addServiceUserLiveInPreferredCarer(
  serviceUserId: string,
  body: { employeeId: string; reason?: string },
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/live-in-profile/preferred-carers`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function removeServiceUserLiveInPreferredCarer(
  serviceUserId: string,
  employeeId: string,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/live-in-profile/preferred-carers/${employeeId}`, {
    method: 'DELETE',
  })
}

export async function addServiceUserLiveInBlockedCarer(
  serviceUserId: string,
  body: { employeeId: string; reason?: string },
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/live-in-profile/blocked-carers`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function removeServiceUserLiveInBlockedCarer(
  serviceUserId: string,
  employeeId: string,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/live-in-profile/blocked-carers/${employeeId}`, {
    method: 'DELETE',
  })
}

export async function uploadServiceUserLiveInContract(serviceUserId: string, file: File): Promise<unknown> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/live-in-profile/contract-documents`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  return (bodyJson as ApiEnvelope<{ id: string }>).data
}

export async function deleteServiceUserLiveInContract(serviceUserId: string, documentId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(
    `/service-users/${serviceUserId}/live-in-profile/contract-documents/${documentId}`,
    { method: 'DELETE' },
  )
}

/** Opens a save dialog for the contract file (requires `service_users.live_in_profile.documents.download`). */
export async function downloadServiceUserLiveInContract(
  serviceUserId: string,
  documentId: string,
  originalName: string,
): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const token = useAuthStore.getState().accessToken
  const url = `${base}/service-users/${serviceUserId}/live-in-profile/contract-documents/${documentId}/download`
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    let bodyJson: unknown = null
    try {
      bodyJson = text ? JSON.parse(text) : null
    } catch {
      bodyJson = text
    }
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Download failed', res.status, bodyJson)
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = originalName || 'contract'
  a.click()
  URL.revokeObjectURL(a.href)
}

export type ServiceUserFlashMessageRow = {
  id: string
  serviceUserId: string
  message: string
  displayUntil: string
  status: string
  isCurrent: boolean
  clearedAt: string | null
  clearReason: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; email: string } | null
  clearedBy: { id: string; name: string; email: string } | null
}

export async function fetchServiceUserFlashMessage(
  serviceUserId: string,
): Promise<ServiceUserFlashMessageRow | null> {
  const id = resolveServiceUserIdFromRoute(serviceUserId)
  if (!id) return null
  const res = await apiJson<ApiEnvelope<ServiceUserFlashMessageRow | null>>(
    `/service-users/${id}/flash-message`,
    { method: 'GET' },
  )
  return res.data ?? null
}

export type UpsertServiceUserFlashMessagePayload = {
  message: string
  displayUntil: string
}

export async function upsertServiceUserFlashMessage(
  serviceUserId: string,
  payload: UpsertServiceUserFlashMessagePayload,
): Promise<ServiceUserFlashMessageRow> {
  const id = resolveServiceUserIdFromRoute(serviceUserId)
  const res = await apiJson<ApiEnvelope<ServiceUserFlashMessageRow>>(
    `/service-users/${id}/flash-message`,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
  if (!res.data) {
    throw new ApiError('Flash message was not returned from the API', 0)
  }
  return res.data
}

export async function clearServiceUserFlashMessage(serviceUserId: string): Promise<void> {
  const id = resolveServiceUserIdFromRoute(serviceUserId)
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${id}/flash-message`, { method: 'DELETE' })
}
