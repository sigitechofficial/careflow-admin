import { apiJson, ApiError, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { fetchWithResilience } from '@/shared/api/http-client'
import { useAuthStore } from '@/features/auth/store'
import type { AboutMeV1 } from '@/features/service-users/service-user-about-me'
import { defaultAboutMe } from '@/features/service-users/service-user-about-me'
import type { DateDisplayFormat, TimeDisplayFormat } from '@/shared/lib/display-format.util'

function nestErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback
  const m = (body as { message?: unknown }).message
  if (typeof m === 'string') return m
  if (Array.isArray(m)) return m.map(String).join('; ')
  return fallback
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export async function backendServiceUserPortalLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')

  const res = await fetchWithResilience(
    `${base}/auth/service-user/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    },
    { retry: { maxRetries: 0 } },
  )

  const body: unknown = await readJsonResponse(res)
  if (!res.ok) {
    throw new Error(nestErrorMessage(body, res.statusText || 'Login failed'))
  }
  return (body as ApiEnvelope<{ accessToken: string; refreshToken: string }>).data
}

export type PortalLookup = { id: string; name: string } | null

export type PortalRiskLevel = { id: string; name: string; color: string | null } | null

export type PortalEmployeeBrief = {
  id: string
  firstName: string | null
  lastName: string | null
} | null

export type PortalProfileExtras = {
  suffix: string | null
  maidenName: string | null
  placeOfBirth: string | null
  religion: string | null
  ethnicity: string | null
  sexualOrientation: string | null
  disability: string | null
  maternity: string | null
  language: string | null
  preferredContactMethod: string | null
  emailType: string | null
  otherContactMethod: string | null
  dateOfDeath: string | null
  asNumber: string | null
}

export type PortalPhoto = {
  id: string
  fileUrl: string
  originalName: string | null
  isProfilePhoto: boolean
  uploadedAt: string
}

export type PortalProfile = {
  serviceUserId: string
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
  nationalInsuranceNumber: string | null
  socialServicesRef: string | null
  serviceStartDate: string | null
  serviceEndDate: string | null
  profilePhotoUrl: string | null
  title: PortalLookup
  gender: PortalLookup
  maritalStatus: PortalLookup
  status: PortalLookup
  careType: PortalLookup
  fundingType: PortalLookup
  riskLevel: PortalRiskLevel
  location: PortalLookup
  keyWorker: PortalEmployeeBrief
  namedNurse: PortalEmployeeBrief
  profileExtras: PortalProfileExtras
  address: {
    addressLine1: string | null
    addressLine2: string | null
    town: string | null
    county: string | null
    postcode: string | null
    country: string | null
    accessInstructions: string | null
    keySafeNumber: string | null
  } | null
  photos: PortalPhoto[]
}

export type PatchPortalProfilePayload = {
  firstName?: string
  lastName?: string
  middleName?: string
  preferredName?: string
  email?: string
  phone?: string
  mobile?: string
  titleId?: string | null
  genderId?: string | null
  maritalStatusId?: string | null
  dateOfBirth?: string | null
  addressLine1?: string
  addressLine2?: string
  town?: string
  county?: string
  postcode?: string
  country?: string
  accessInstructions?: string
  keySafeNumber?: string
  suffix?: string
  maidenName?: string
  placeOfBirth?: string
  religion?: string
  ethnicity?: string
  sexualOrientation?: string
  disability?: string
  maternity?: string
  language?: string
  preferredContactMethod?: string
  emailType?: string
  otherContactMethod?: string
}

export type PortalLookups = {
  titles: Array<{ id: string; name: string }>
  genders: Array<{ id: string; name: string }>
  maritalStatuses: Array<{ id: string; name: string }>
  relationshipTypes: Array<{ id: string; name: string }>
  allergies: Array<{ id: string; name: string; code: string; category: string }>
}

export type PortalContact = {
  id: string
  firstName: string
  lastName: string | null
  name: string
  relationship: string | null
  relationshipTypeId: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  address: string | null
  isPrimary: boolean
  isEmergencyContact: boolean
  canReceiveUpdates: boolean
  notes: string | null
}

export type CreatePortalContactPayload = {
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

export type PortalAllergy = {
  id: string
  allergyName: string
  comment: string | null
}

export type CreatePortalAllergyPayload = {
  allergyCatalogId?: string
  allergyName?: string
  comment: string
}

export type PortalMedicationSchedule = {
  dueTime: string | null
  dueVisitName: string | null
  dose: string | null
  roundName: string | null
}

export type PortalActiveMedication = {
  id: string
  name: string
  dose: string | null
  strength: string | null
  routeName: string | null
  status: string
  statusLabel: string
  schedules: PortalMedicationSchedule[]
}

export type PortalMedicationTimelineItem = {
  id: string
  medicationName: string
  status: string
  statusLabel: string
  statusCode: string | null
  scheduledAt: string | null
  recordedAt: string | null
  dose: string | null
  roundLabel: string | null
  reason: string | null
  isPrn: boolean
  carerName: string | null
}

export type PortalMedications = {
  activeMedications: PortalActiveMedication[]
  timeline: PortalMedicationTimelineItem[]
}

export type PortalCalendarEvent = {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  status: string
  location: string | null
  eventType: PortalLookup
}

export type PortalCompletedVisit = {
  id: string
  visitName: string
  scheduledStartAt: string
  scheduledEndAt: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  status: string
  carers: string[]
  notes: string | null
}

export type PortalDashboardVisitTask = {
  id: string
  name: string
  categoryName: string
  priority: string
}

export type PortalDashboardUpcomingVisit = {
  id: string
  scheduledJobId: string
  visitName: string
  scheduledStartAt: string
  scheduledEndAt: string | null
  status: string
  carers: string[]
  roundLabel: string | null
  tasks: PortalDashboardVisitTask[]
}

export type PortalDashboard = {
  profile: {
    serviceUserId: string
    firstName: string
    lastName: string
    preferredName: string | null
    dateOfBirth: string | null
    profilePhotoUrl: string | null
    careType: PortalLookup
  }
  allergiesCount: number
  activeMedicationsCount: number
  contacts: Array<{
    id: string
    name: string
    relationship: string | null
    phone: string | null
    email: string | null
    isPrimary: boolean
  }>
  upcomingVisits: PortalDashboardUpcomingVisit[]
  upcomingEvents: Array<{
    id: string
    title: string
    startAt: string
    endAt: string | null
    status: string
    eventType: PortalLookup
  }>
  carePlans: Array<{
    id: string
    status: string
    name: string
    updatedAt: string
  }>
  aboutMeConfigured: boolean
}

export type PortalAccountStatus = {
  configured: boolean
  isEnabled: boolean
  email: string | null
  lastLoginAt: string | null
}

export type PortalDisplaySettings = {
  timezone: string
  dateDisplayFormat: DateDisplayFormat
  timeDisplayFormat: TimeDisplayFormat
}

export async function fetchPortalDisplaySettings(): Promise<PortalDisplaySettings> {
  const res = await apiJson<ApiEnvelope<PortalDisplaySettings>>('/portal/display-settings')
  return res.data
}

export async function fetchPortalDashboard(): Promise<PortalDashboard> {
  const res = await apiJson<ApiEnvelope<PortalDashboard>>('/portal/dashboard')
  return res.data
}

export async function fetchPortalLookups(): Promise<PortalLookups> {
  const res = await apiJson<ApiEnvelope<PortalLookups>>('/portal/lookups')
  return res.data
}

export async function fetchPortalProfile(): Promise<PortalProfile> {
  const res = await apiJson<ApiEnvelope<PortalProfile>>('/portal/profile')
  return res.data
}

export async function patchPortalProfile(body: PatchPortalProfilePayload): Promise<PortalProfile> {
  const res = await apiJson<ApiEnvelope<PortalProfile>>('/portal/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function uploadPortalPhoto(file: File, setAsProfile = false): Promise<PortalPhoto> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)

  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const form = new FormData()
  form.append('file', file)
  if (setAsProfile) form.append('setAsProfile', 'true')

  const res = await fetch(`${base}/portal/photos`, { method: 'POST', headers, body: form })
  const bodyJson = await readJsonResponse(res)
  if (!res.ok) {
    throw new ApiError(nestErrorMessage(bodyJson, res.statusText || 'Upload failed'), res.status, bodyJson)
  }
  const envelope = bodyJson as ApiEnvelope<PortalPhoto>
  return envelope.data
}

export async function fetchPortalAboutMe(): Promise<AboutMeV1> {
  const res = await apiJson<ApiEnvelope<{ aboutMe: AboutMeV1 | null }>>('/portal/about-me')
  return res.data.aboutMe ?? defaultAboutMe()
}

export async function patchPortalAboutMe(aboutMe: AboutMeV1): Promise<AboutMeV1> {
  const res = await apiJson<ApiEnvelope<{ aboutMe: AboutMeV1 }>>('/portal/about-me', {
    method: 'PATCH',
    body: JSON.stringify({ aboutMe }),
  })
  return res.data.aboutMe
}

export async function fetchPortalContacts(): Promise<PortalContact[]> {
  const res = await apiJson<ApiEnvelope<PortalContact[]>>('/portal/contacts')
  return res.data
}

export async function createPortalContact(body: CreatePortalContactPayload): Promise<PortalContact> {
  const res = await apiJson<ApiEnvelope<PortalContact>>('/portal/contacts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function fetchPortalAllergies(): Promise<PortalAllergy[]> {
  const res = await apiJson<ApiEnvelope<PortalAllergy[]>>('/portal/allergies')
  return res.data
}

export async function createPortalAllergy(body: CreatePortalAllergyPayload): Promise<PortalAllergy> {
  const res = await apiJson<ApiEnvelope<PortalAllergy>>('/portal/allergies', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function fetchPortalMedications(): Promise<PortalMedications> {
  const res = await apiJson<ApiEnvelope<PortalMedications>>('/portal/medications')
  return res.data
}

export async function fetchPortalCalendar(): Promise<PortalCalendarEvent[]> {
  const res = await apiJson<ApiEnvelope<PortalCalendarEvent[]>>('/portal/calendar')
  return res.data
}

export async function fetchPortalCompletedVisits(): Promise<PortalCompletedVisit[]> {
  const res = await apiJson<ApiEnvelope<PortalCompletedVisit[]>>('/portal/completed-visits')
  return res.data
}

export type PortalVisitPlanSlot = {
  id: string
  label: string
  daysOfWeek: number[]
  daysLabel: string
  plannedStartTime: string
  plannedEndTime: string
  durationMinutes: number | null
  requiredCarers: number
  scheduleFrequency: string
  slotKind: string
  nightDuty?: string
  notes: string
  carers: Array<{
    displayName: string
    role: string
    dayLabel: string | null
  }>
}

export type PortalVisitPlan = {
  id: string
  status: string
  effectiveFrom: string
  effectiveTo: string | null
  weeklyContractedHours: string | null
  numberOfCarers: number
  notes: string
  reviewDueAt: string | null
  suspendedAt: string | null
  pauseReason: { id: string; name: string } | null
  expectedResumeAt: string | null
  slots: PortalVisitPlanSlot[]
}

export type PortalVisitPlansResponse = {
  active: PortalVisitPlan | null
  plans: PortalVisitPlan[]
}

export async function fetchPortalVisitPlans(): Promise<PortalVisitPlansResponse> {
  const res = await apiJson<ApiEnvelope<PortalVisitPlansResponse>>('/portal/visit-plans')
  return res.data
}

export async function fetchServiceUserPortalAccount(serviceUserId: string): Promise<PortalAccountStatus> {
  return apiJson<PortalAccountStatus>(`/service-users/${serviceUserId}/portal-account`)
}

export async function upsertServiceUserPortalAccount(
  serviceUserId: string,
  body: { email?: string; isEnabled?: boolean },
): Promise<PortalAccountStatus> {
  return apiJson<PortalAccountStatus>(`/service-users/${serviceUserId}/portal-account`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function setServiceUserPortalPassword(serviceUserId: string, password: string): Promise<void> {
  await apiJson(`/service-users/${serviceUserId}/portal-account/set-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export type PortalAccountStatusFilter = 'all' | 'configured' | 'not_configured' | 'enabled' | 'disabled'

export type ServiceUserPortalAccountRow = {
  serviceUserId: string
  firstName: string
  lastName: string
  preferredName: string | null
  serviceUserEmail: string | null
  isActive: boolean
  configured: boolean
  isEnabled: boolean
  portalEmail: string | null
  lastLoginAt: string | null
}

export type ServiceUserPortalAccountsSummary = {
  totalActive: number
  configured: number
  enabled: number
  neverLoggedIn: number
}

export type ListServiceUserPortalAccountsParams = {
  page?: number
  limit?: number
  search?: string
  portalStatus?: PortalAccountStatusFilter
}

export type ServiceUserPortalAccountsListResponse = {
  success?: boolean
  message?: string
  data: ServiceUserPortalAccountRow[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
    summary?: ServiceUserPortalAccountsSummary
  }
}

export async function fetchServiceUserPortalAccounts(
  params: ListServiceUserPortalAccountsParams = {},
  init?: RequestInit,
): Promise<ServiceUserPortalAccountsListResponse> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.portalStatus && params.portalStatus !== 'all') qs.set('portalStatus', params.portalStatus)
  const q = qs.toString()
  return apiJson<ServiceUserPortalAccountsListResponse>(
    `/service-users/portal-accounts${q ? `?${q}` : ''}`,
    { method: 'GET', ...init },
  )
}
