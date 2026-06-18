import { getApiBaseUrl } from '@/shared/lib/api-base'
import type { ApiEnvelope } from '@/shared/api/api-client'
import { ApiError, apiJson } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'

export type LookupRow = { id: string; name: string }

export type EmployeeLookupsBundle = {
  titles: LookupRow[]
  genders: LookupRow[]
  nationalities: LookupRow[]
  employeeStatuses: LookupRow[]
  workAreas: LookupRow[]
  roles: LookupRow[]
  jobTitles: LookupRow[]
  rbacLevels: LookupRow[]
  grades: LookupRow[]
  contractTypes: LookupRow[]
  travelPaymentTypes: LookupRow[]
  locations: LookupRow[]
  zones: LookupRow[]
  leavingReasons: LookupRow[]
  skillTypes: LookupRow[]
  certificationTypes: LookupRow[]
  complianceTypes: LookupRow[]
  reviewTypes: LookupRow[]
  nonCoreActivityReasons: LookupRow[]
}

export async function fetchEmployeeLookups(init?: RequestInit): Promise<EmployeeLookupsBundle> {
  const res = await apiJson<ApiEnvelope<EmployeeLookupsBundle>>('/lookups/employee', { method: 'GET', ...init })
  return res.data
}

export async function createJobTitle(name: string): Promise<LookupRow> {
  const res = await apiJson<ApiEnvelope<LookupRow>>('/lookups/job-titles', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return res.data
}

export type EmployeeListRow = {
  id: string
  isActive: boolean
  fullName: string | null
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  status: { id: string; name: string } | null
  jobTitle: { id: string; name: string } | null
  role: { id: string; name: string } | null
  grade: { id: string; name: string } | null
  contractType: { id: string; name: string } | null
  visaTypeId: string | null
  visaTypeLabel?: string | null
  isInCountry: boolean
  locationId?: string | null
  location?: { id: string; name: string } | null
  baseLocationIds?: string[]
}

export type EmployeeListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type ListEmployeesParams = {
  page?: number
  limit?: number
  search?: string
  statusId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** GET /employees/:id — shape matches Nest `getById` include (nested lookups as `{ id, name }`). */
export type EmployeeDetail = {
  id: string
  isActive?: boolean
  personalDetail?: null | {
    firstName?: string | null
    lastName?: string | null
    titleId?: string | null
    title?: { id: string; name: string } | null
    genderId?: string | null
    gender?: { id: string; name: string } | null
    email?: string | null
    username?: string | null
    dateOfBirth?: string | null
    nationalityId?: string | null
    nationality?: { id: string; name: string } | null
    addressLine1?: string | null
    addressLine2?: string | null
    town?: string | null
    county?: string | null
    country?: string | null
    postcode?: string | null
    latitude?: number | string | null
    longitude?: number | string | null
    homeTelephone?: string | null
    mobileTelephone?: string | null
    photoUrl?: string | null
    statusId?: string | null
    status?: { id: string; name: string } | null
  }
  employment?: null | {
    workAreaId?: string | null
    workArea?: { id: string; name: string } | null
    roleId?: string | null
    role?: { id: string; name: string } | null
    jobTitleId?: string | null
    jobTitle?: { id: string; name: string } | null
    rbacLevelId?: string | null
    rbacLevel?: { id: string; name: string } | null
    gradeId?: string | null
    grade?: { id: string; name: string } | null
    contractTypeId?: string | null
    contractType?: { id: string; name: string } | null
    travelPaymentTypeId?: string | null
    travelPaymentType?: { id: string; name: string } | null
    baseLocationId?: string | null
    baseLocation?: { id: string; name: string } | null
    baseLocations?: Array<{ location?: { id: string; name: string } | null }> | null
    locationId?: string | null
    location?: { id: string; name: string } | null
    startDate?: string | null
    endDate?: string | null
    nationalInsuranceNo?: string | null
    nmcPinNumber?: string | null
    employeeNumber?: string | null
    payrollNumber?: string | null
    accessAllZones?: boolean | null
    visaTypeId?: string | null
    isInCountry?: boolean | null
    contractedWeeklyHours?: number | string | null
    maximumWeeklyHours?: number | string | null
    minimumWeeklyHours?: number | string | null
    weeklyHoursCapOverride?: number | string | null
    weeklyHoursCapOverrideReason?: string | null
    weeklyHoursCapOverrideExpiresAt?: string | null
    optedOutOf48Hours?: boolean | null
    isAgencyStaff?: boolean | null
    agencyName?: string | null
    agencyRating?: string | null
    isPreferredAgency?: boolean | null
    isBlacklisted?: boolean | null
    dailyRate?: number | string | null
    hourlyDayRate?: number | string | null
    hourlyNightRate?: number | string | null
  }
}

export async function fetchEmployee(id: string, init?: RequestInit): Promise<EmployeeDetail> {
  const res = await apiJson<ApiEnvelope<EmployeeDetail>>(`/employees/${id}`, { method: 'GET', ...init })
  return res.data
}

export type EmployeeChartSummary = {
  staff: { total: number; active: number; inactive: number }
  compliance: { upToDate: number; needsAttention: number }
  skills: { name: string; value: number; color: string }[]
  reviews: { reviewed: number; outstanding: number }
}

export async function fetchEmployeeChartSummary(init?: RequestInit): Promise<EmployeeChartSummary> {
  const res = await apiJson<ApiEnvelope<EmployeeChartSummary>>('/employees/chart-summary', { method: 'GET', ...init })
  return res.data
}

export async function listEmployees(params: ListEmployeesParams = {}, init?: RequestInit): Promise<{
  rows: EmployeeListRow[]
  meta: EmployeeListMeta
}> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.statusId) qs.set('statusId', params.statusId)
  if (params.sortBy) qs.set('sortBy', params.sortBy)
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder)
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<EmployeeListRow[]>>(`/employees${q ? `?${q}` : ''}`, { method: 'GET', ...init })
  const meta = (res.meta ?? {}) as Partial<EmployeeListMeta>
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

/** Server max page size is 100 (`PaginationQueryDto`). Loads every page and concatenates rows. */
export async function listAllEmployees(
  params: Omit<ListEmployeesParams, 'page' | 'limit'> = {},
): Promise<EmployeeListRow[]> {
  const pageSize = 100
  const out: EmployeeListRow[] = []
  let page = 1
  for (;;) {
    const { rows, meta } = await listEmployees({ ...params, page, limit: pageSize })
    out.push(...rows)
    if (!meta.hasNextPage || rows.length === 0) break
    page += 1
    if (page > 500) break
  }
  return out
}

export type CreateEmployeePayload = {
  firstName: string
  lastName: string
  username: string
  email?: string
  titleId?: string
  genderId?: string
  nationalityId?: string
  statusId?: string
}

export async function createEmployee(body: CreateEmployeePayload): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>('/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export type PersonalDetailsPayload = {
  firstName?: string
  lastName?: string
  titleId?: string
  genderId?: string
  email?: string
  username?: string
  dateOfBirth?: string | null
  nationalityId?: string
  addressLine1?: string
  addressLine2?: string
  town?: string
  county?: string
  country?: string
  postcode?: string
  latitude?: number
  longitude?: number
  homeTelephone?: string
  mobileTelephone?: string
  photoUrl?: string
  statusId?: string
}

export async function patchPersonalDetails(employeeId: string, body: PersonalDetailsPayload): Promise<void> {
  await apiJson(`/employees/${employeeId}/personal-details`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function uploadEmployeePhoto(employeeId: string, file: File): Promise<{ photoUrl: string }> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/employees/${employeeId}/personal-details/photo`
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
  const envelope = bodyJson as ApiEnvelope<{ photoUrl?: string | null }>
  const row = envelope.data
  if (row && typeof row.photoUrl === 'string' && row.photoUrl.trim()) {
    return { photoUrl: row.photoUrl.trim() }
  }
  throw new ApiError('Upload succeeded but photo URL was not returned.', res.status, bodyJson)
}

export type EmploymentPayload = {
  workAreaId?: string
  roleId?: string
  jobTitleId?: string
  rbacLevelId?: string
  startDate?: string | null
  endDate?: string | null
  nationalInsuranceNo?: string
  gradeId?: string
  nmcPinNumber?: string
  contractTypeId?: string
  employeeNumber?: string
  travelPaymentTypeId?: string
  payrollNumber?: string
  locationId?: string
  baseLocationId?: string
  baseLocationIds?: string[]
  accessAllZones?: boolean
  visaTypeId?: string | null
  isInCountry?: boolean
  contractedWeeklyHours?: number | null
  maximumWeeklyHours?: number | null
  minimumWeeklyHours?: number | null
  weeklyHoursCapOverride?: number | null
  weeklyHoursCapOverrideReason?: string | null
  weeklyHoursCapOverrideExpiresAt?: string | null
  optedOutOf48Hours?: boolean
  isAgencyStaff?: boolean
  agencyName?: string
  agencyRating?: string
  isPreferredAgency?: boolean
  isBlacklisted?: boolean
  dailyRate?: number | null
  hourlyDayRate?: number | null
  hourlyNightRate?: number | null
}

export async function patchEmployment(employeeId: string, body: EmploymentPayload): Promise<void> {
  await apiJson(`/employees/${employeeId}/employment`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function patchEmployeeStatus(employeeId: string, body: { statusId: string }): Promise<void> {
  await apiJson(`/employees/${employeeId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/* ─── Emergency contacts ─────────────────────────────────────── */

export type EmergencyContactRow = {
  id: string
  firstName: string
  lastName: string
  relationship: string
  phone: string
}

export async function listEmergencyContacts(employeeId: string): Promise<EmergencyContactRow[]> {
  const res = await apiJson<ApiEnvelope<EmergencyContactRow[]>>(`/employees/${employeeId}/emergency-contacts`, {
    method: 'GET',
  })
  return res.data
}

export async function createEmergencyContact(
  employeeId: string,
  body: { firstName: string; lastName: string; relationship: string; phone: string },
): Promise<EmergencyContactRow> {
  const res = await apiJson<ApiEnvelope<EmergencyContactRow>>(`/employees/${employeeId}/emergency-contacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateEmergencyContact(
  employeeId: string,
  contactId: string,
  body: Partial<{ firstName: string; lastName: string; relationship: string; phone: string }>,
): Promise<EmergencyContactRow> {
  const res = await apiJson<ApiEnvelope<EmergencyContactRow>>(
    `/employees/${employeeId}/emergency-contacts/${contactId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteEmergencyContact(employeeId: string, contactId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/emergency-contacts/${contactId}`, { method: 'DELETE' })
}

/* ─── Employee skills ────────────────────────────────────────── */

export type EmployeeSkillRow = {
  id: string
  employeeId: string
  skillTypeId: string | null
  expiryDate?: string | null
  notes?: string | null
  documentUrl?: string | null
  skillType?: { id: string; name: string } | null
}

export async function listEmployeeSkills(employeeId: string): Promise<EmployeeSkillRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeSkillRow[]>>(`/employees/${employeeId}/skills`, { method: 'GET' })
  return res.data
}

export type EmployeeSkillsOverviewRow = {
  employeeId: string
  displayName: string
  skillNames: string[]
}

export async function fetchEmployeeSkillsOverview(): Promise<EmployeeSkillsOverviewRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeSkillsOverviewRow[]>>('/employees/skills-overview', {
    method: 'GET',
  })
  return res.data
}

export type CreateEmployeeSkillPayload = {
  skillTypeId: string
  expiryDate?: string
  notes?: string
  documentUrl?: string
}

export async function createEmployeeSkill(
  employeeId: string,
  body: CreateEmployeeSkillPayload,
): Promise<EmployeeSkillRow> {
  const res = await apiJson<ApiEnvelope<EmployeeSkillRow>>(`/employees/${employeeId}/skills`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteEmployeeSkill(employeeId: string, skillId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/skills/${skillId}`, { method: 'DELETE' })
}

/* ─── Employee non-core activities ───────────────────────────── */

export type ScheduleImpactSummary = {
  jobsCancelled: number
  jobsUnallocated: number
  jobIds: string[]
}

export type NonCoreActivityRegistryRow = {
  id: string
  employeeId: string
  employeeDisplayName: string
  reasonId: string | null
  reasonName: string | null
  dateFrom: string
  dateTo: string
  includeInPayroll: boolean
  onCallForPeriod: boolean
  notes: string | null
}

export async function fetchNonCoreActivitiesRegistry(): Promise<NonCoreActivityRegistryRow[]> {
  const res = await apiJson<ApiEnvelope<NonCoreActivityRegistryRow[]>>('/employees/non-core-activities-registry', {
    method: 'GET',
  })
  return res.data
}

export type EmployeeNonCoreActivityRow = {
  id: string
  employeeId: string
  reasonId: string | null
  dateFrom: string
  dateTo: string
  includeInPayroll: boolean
  onCallForPeriod: boolean
  notes: string | null
  reason: { id: string; name: string } | null
}

export async function listEmployeeNonCoreActivities(employeeId: string): Promise<EmployeeNonCoreActivityRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeNonCoreActivityRow[]>>(
    `/employees/${employeeId}/non-core-activities`,
    { method: 'GET' },
  )
  return res.data
}

export type CreateNonCoreActivityPayload = {
  reasonId?: string
  dateFrom: string
  dateTo: string
  includeInPayroll?: boolean
  onCallForPeriod?: boolean
  notes?: string
  applyToSchedule?: boolean
}

export async function createEmployeeNonCoreActivity(
  employeeId: string,
  body: CreateNonCoreActivityPayload,
): Promise<{ data: EmployeeNonCoreActivityRow; scheduleImpact?: ScheduleImpactSummary }> {
  const res = await apiJson<
    ApiEnvelope<EmployeeNonCoreActivityRow> & { scheduleImpact?: ScheduleImpactSummary }
  >(`/employees/${employeeId}/non-core-activities`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { data: res.data, scheduleImpact: res.scheduleImpact }
}

export async function updateEmployeeNonCoreActivity(
  employeeId: string,
  activityId: string,
  body: Partial<CreateNonCoreActivityPayload>,
): Promise<EmployeeNonCoreActivityRow> {
  const res = await apiJson<ApiEnvelope<EmployeeNonCoreActivityRow>>(
    `/employees/${employeeId}/non-core-activities/${activityId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteEmployeeNonCoreActivity(employeeId: string, activityId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/non-core-activities/${activityId}`, { method: 'DELETE' })
}

/* ─── Employee holidays ──────────────────────────────────────── */

export type EmployeeHolidayRow = {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  notes: string | null
}

export type CreateEmployeeHolidayPayload = {
  startDate: string
  endDate: string
  notes?: string
  applyToSchedule?: boolean
}

export async function listEmployeeHolidays(employeeId: string): Promise<EmployeeHolidayRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeHolidayRow[]>>(`/employees/${employeeId}/holidays`, {
    method: 'GET',
  })
  return res.data
}

export async function createEmployeeHoliday(
  employeeId: string,
  body: CreateEmployeeHolidayPayload,
): Promise<{ data: EmployeeHolidayRow; scheduleImpact?: ScheduleImpactSummary }> {
  const res = await apiJson<
    ApiEnvelope<EmployeeHolidayRow> & { scheduleImpact?: ScheduleImpactSummary }
  >(`/employees/${employeeId}/holidays`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { data: res.data, scheduleImpact: res.scheduleImpact }
}

export async function updateEmployeeHoliday(
  employeeId: string,
  holidayId: string,
  body: Partial<CreateEmployeeHolidayPayload>,
): Promise<EmployeeHolidayRow> {
  const res = await apiJson<ApiEnvelope<EmployeeHolidayRow>>(
    `/employees/${employeeId}/holidays/${holidayId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteEmployeeHoliday(employeeId: string, holidayId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/holidays/${holidayId}`, { method: 'DELETE' })
}

export async function previewEmployeeScheduleImpact(
  employeeId: string,
  params: { startDate: string; endDate?: string },
): Promise<ScheduleImpactSummary> {
  const qs = new URLSearchParams({ startDate: params.startDate })
  if (params.endDate?.trim()) qs.set('endDate', params.endDate.trim())
  const res = await apiJson<ApiEnvelope<ScheduleImpactSummary>>(
    `/employees/${employeeId}/schedule-impact-preview?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

/* ─── Employee documents (multipart upload) ─────────────────── */

export type EmployeeDocumentRow = {
  id: string
  employeeId: string
  name: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedDate: string
  tags: string[]
}

export async function fetchEmployeeDocuments(employeeId: string): Promise<EmployeeDocumentRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeDocumentRow[]>>(`/employees/${employeeId}/documents`, {
    method: 'GET',
  })
  return res.data
}

function parseEnvelopeFromFetch(body: unknown): ApiEnvelope<EmployeeDocumentRow> {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    throw new ApiError('Unexpected API response', 0)
  }
  return body as ApiEnvelope<EmployeeDocumentRow>
}

export async function uploadEmployeeDocument(
  employeeId: string,
  file: File,
  opts?: { name?: string; description?: string },
): Promise<EmployeeDocumentRow> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/employees/${employeeId}/documents`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const form = new FormData()
  form.append('file', file)
  const title = (opts?.name ?? file.name).trim()
  if (title) form.append('name', title)
  if (opts?.description?.trim()) form.append('description', opts.description.trim())

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
    throw new ApiError(msg || 'Document upload failed', res.status, bodyJson)
  }
  const env = parseEnvelopeFromFetch(bodyJson)
  return env.data
}

export async function deleteEmployeeDocument(employeeId: string, documentId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/documents/${documentId}`, { method: 'DELETE' })
}

export type EmployeeDocumentRegistryRow = {
  id: string
  employeeId: string
  employeeName: string
  name: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedDate: string
  tags: string[]
}

/** GET /employees/documents-registry — all documents across staff (requires employees.documents.read). */
export async function fetchEmployeeDocumentsRegistry(init?: RequestInit): Promise<EmployeeDocumentRegistryRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeDocumentRegistryRow[]>>('/employees/documents-registry', {
    method: 'GET',
    ...init,
  })
  return res.data
}

/* ─── Working patterns (Nest enum day names) ───────────────── */

export const WORKING_PATTERN_DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

export type WorkingPatternDay = (typeof WORKING_PATTERN_DAY_ORDER)[number]

export type WorkingPatternRow = {
  id: string
  employeeId: string
  dayOfWeek: string
  startTime: string | null
  endTime: string | null
  isAvailable: boolean
  notes: string | null
}

export type WorkingPatternUpsertPayload = {
  dayOfWeek: WorkingPatternDay
  startTime?: string
  endTime?: string
  isAvailable?: boolean
  notes?: string
}

export async function listWorkingPatterns(employeeId: string): Promise<WorkingPatternRow[]> {
  const res = await apiJson<ApiEnvelope<WorkingPatternRow[]>>(`/employees/${employeeId}/working-patterns`, {
    method: 'GET',
  })
  return res.data
}

export async function createWorkingPattern(
  employeeId: string,
  body: WorkingPatternUpsertPayload,
): Promise<WorkingPatternRow> {
  const res = await apiJson<ApiEnvelope<WorkingPatternRow>>(`/employees/${employeeId}/working-patterns`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateWorkingPattern(
  employeeId: string,
  patternId: string,
  body: Partial<WorkingPatternUpsertPayload>,
): Promise<WorkingPatternRow> {
  const res = await apiJson<ApiEnvelope<WorkingPatternRow>>(
    `/employees/${employeeId}/working-patterns/${patternId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteWorkingPattern(employeeId: string, patternId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/working-patterns/${patternId}`, { method: 'DELETE' })
}
