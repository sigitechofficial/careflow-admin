import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { CareFormSectionRow } from '@/features/care-pathway/types/care-pathway.types'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'

/** Supervision & appraisals (API: /supervision, docs/SUPERVISION_MODULE_PLAN.md in careflow-api). */

export type SupervisionFormat = 'ONE_TO_ONE' | 'GROUP' | 'OBSERVED_PRACTICE' | 'REMOTE'
export type SupervisionSessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'AWAITING_SIGN_OFF'
  | 'COMPLETED'
  | 'CANCELLED'
export type SupervisionActionStatus = 'OPEN' | 'DONE' | 'CANCELLED'
export type SupervisionActionOwner = 'CARER' | 'SUPERVISOR' | 'MANAGER' | 'OTHER'

export type SupervisionSettings = {
  requireCarerSignature: boolean
  allowCarerDisagree: boolean
  confidentialNotesEnabled: boolean
  requireFormAnswers: boolean
  remindersEnabled: boolean
  reminderHour: number
  dueSoonDays: number
  reminderDaysBefore: number[]
  reminderDaysAfter: number[]
  escalateAfterDays: number
  notifySupervisor: boolean
  notifyCarer: boolean
  managersOnAllReminders: boolean
  emailReminders: boolean
  autoScheduleNext: boolean
}

export type SupervisionPerson = { id: string; firstName: string | null; lastName: string | null; email: string }
export type SupervisionEmployee = {
  id: string
  personalDetail: { firstName: string; lastName: string; username?: string | null } | null
  employment?: { employeeNumber: string | null } | null
}

export type CarePathwayFormStatus = 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED'

/** Settings → Supervision: the Care Pathway staff form each review type is recorded on. */
export type ReviewScheduleKind = 'REPEATING' | 'MILESTONES' | 'EVENT'
export type ReviewAudience = 'ALL_STAFF' | 'NMC_REGISTRANTS'

/** When a review type is due and who for (Settings → Supervision → Review types). */
export type ReviewSchedule = {
  scheduleKind: ReviewScheduleKind
  defaultIntervalDays: number | null
  firstDueAfterStartDays: number | null
  milestoneDays: number[]
  audience: ReviewAudience
}

export type SupervisionFormsOverview = {
  reviewTypes: Array<ReviewSchedule & {
    id: string
    name: string
    code: string | null
    description: string | null
    form: { id: string; name: string; status: CarePathwayFormStatus; lastPublishedAt: string | null } | null
  }>
  forms: Array<{ id: string; name: string; status: CarePathwayFormStatus; lastPublishedAt: string | null }>
}

/** The form as it was when the session was set up (later Care Pathway edits never change it). */
export type SupervisionFormSnapshot = {
  formId: string
  name: string
  description: string | null
  formType: string
  formVersionId: string | null
  publishedAt: string | null
  sections: CareFormSectionRow[]
}

export type SupervisionAction = {
  id: string
  sessionId: string
  employeeId: string
  description: string
  owner: SupervisionActionOwner
  ownerName: string | null
  dueDate: string | null
  status: SupervisionActionStatus
  completedAt: string | null
  completedNote: string | null
  createdAt: string
  employee?: SupervisionEmployee
}

export type SupervisionSessionDetail = {
  id: string
  reviewTypeId: string
  format: SupervisionFormat
  status: SupervisionSessionStatus
  scheduledAt: string
  heldAt: string | null
  durationMinutes: number | null
  location: string | null
  scheduledJobId: string | null
  supervisorUserId: string
  summary: string | null
  confidentialNotes: string | null
  supervisorSignature: string | null
  supervisorSignedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  reviewType: { id: string; name: string; code: string | null; defaultIntervalDays: number | null }
  supervisor: SupervisionPerson
  attendees: Array<{
    id: string
    employeeId: string
    signature: string | null
    signedAt: string | null
    agrees: boolean | null
    comment: string | null
    employee: SupervisionEmployee
  }>
  formId: string | null
  formSnapshot: SupervisionFormSnapshot | null
  /** Keyed `sectionId:fieldId`, as CarePathwayFormRenderer keys values. */
  answers: CarePlanDraftValues
  actions: SupervisionAction[]
  addenda: Array<{ id: string; text: string; createdAt: string; createdById: string }>
  permissions: { canReadConfidential: boolean; canEdit: boolean; isSupervisor: boolean }
  missingRequired: Array<{ key: string; section: string; label: string }>
  formProgress: { answered: number; total: number; required: number; requiredAnswered: number }
  settings: SupervisionSettings
}

export type SupervisionSessionListRow = {
  id: string
  format: SupervisionFormat
  status: SupervisionSessionStatus
  scheduledAt: string
  heldAt: string | null
  completedAt: string | null
  supervisorSignedAt: string | null
  reviewType: { id: string; name: string; code: string | null }
  supervisor: SupervisionPerson
  attendees: Array<{ employeeId: string; signedAt: string | null; agrees: boolean | null; employee: SupervisionEmployee }>
  openActions: number
}

export type OpenSupervisionAction = SupervisionAction & {
  session: { id: string; heldAt: string | null; scheduledAt: string; reviewType: { name: string } }
}

export type CreateSupervisionSessionBody = {
  reviewTypeId: string
  employeeIds: string[]
  format?: SupervisionFormat
  scheduledAt: string
  supervisorUserId?: string
  location?: string
}

export type UpdateSupervisionSessionBody = Partial<{
  format: SupervisionFormat
  scheduledAt: string
  heldAt: string | null
  durationMinutes: number | null
  location: string | null
  summary: string | null
  confidentialNotes: string | null
  /** Changed answers only; '' or null clears one. */
  answers: Record<string, string | boolean | null>
}>

const BASE = '/supervision'

export async function fetchSupervisionForms(): Promise<SupervisionFormsOverview> {
  return (await apiJson<ApiEnvelope<SupervisionFormsOverview>>(`${BASE}/forms`, { method: 'GET' })).data
}

export async function setSupervisionForm(reviewTypeId: string, formId: string | null) {
  return apiJson<ApiEnvelope<unknown>>(`${BASE}/forms/${reviewTypeId}`, {
    method: 'PUT',
    body: JSON.stringify({ formId }),
  })
}

export type SupervisionOverview = {
  activeStaff: number
  dueSoonDays: number
  supervision: { overdue: number; dueSoon: number; noRecord: number }
  otherReviews: { overdue: number; dueSoon: number }
  supervisedLast3Months: number
  awaitingSignOff: number
}

export async function fetchSupervisionOverview(locationId?: string | null): Promise<SupervisionOverview> {
  const q = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  return (await apiJson<ApiEnvelope<SupervisionOverview>>(`${BASE}/overview${q}`, { method: 'GET' })).data
}

export async function setReviewSchedule(reviewTypeId: string, schedule: ReviewSchedule) {
  return apiJson<ApiEnvelope<unknown>>(`${BASE}/review-types/${reviewTypeId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(schedule),
  })
}

/** "Every 90 days (first after 30)", "30, 90, 180 days after starting", "When recorded". */
export function describeSchedule(s: ReviewSchedule): string {
  if (s.scheduleKind === 'MILESTONES') {
    return s.milestoneDays.length ? `${s.milestoneDays.join(', ')} days after starting` : 'No milestones'
  }
  if (s.scheduleKind === 'EVENT') {
    return s.defaultIntervalDays ? `When it happens, then every ${s.defaultIntervalDays} days` : 'When it happens'
  }
  if (!s.defaultIntervalDays) return 'Not scheduled'
  const first = s.firstDueAfterStartDays != null && s.firstDueAfterStartDays !== s.defaultIntervalDays
    ? ` (first ${s.firstDueAfterStartDays} days after starting)`
    : ''
  return `Every ${s.defaultIntervalDays} days${first}`
}

export const REVIEW_AUDIENCE_LABELS: Record<ReviewAudience, string> = {
  ALL_STAFF: 'All staff',
  NMC_REGISTRANTS: 'Staff with an NMC PIN',
}

/** Per repeating review for one carer: held in the last 12 months vs what the schedule expects. */
export type EmployeeSupervisionSummary = {
  startDate: string | null
  types: Array<{
    reviewTypeId: string
    name: string
    code: string | null
    intervalDays: number
    expectedPerYear: number
    /** Due dates that came round in the last 12 months (pro-rated from the start date). */
    expectedLast12Months: number
    heldLast12Months: number
    lastDone: string | null
    nextDue: string | null
    status: 'SCHEDULED' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' | null
  }>
}

export async function fetchEmployeeSupervisionSummary(employeeId: string): Promise<EmployeeSupervisionSummary> {
  return (
    await apiJson<ApiEnvelope<EmployeeSupervisionSummary>>(`${BASE}/employees/${employeeId}/summary`, { method: 'GET' })
  ).data
}

export async function fetchSupervisors(): Promise<SupervisionPerson[]> {
  return (await apiJson<ApiEnvelope<SupervisionPerson[]>>(`${BASE}/supervisors`, { method: 'GET' })).data
}

export async function fetchEmployeeSupervisor(employeeId: string): Promise<SupervisionPerson | null> {
  return (
    await apiJson<ApiEnvelope<{ supervisor: SupervisionPerson | null }>>(`${BASE}/employees/${employeeId}/supervisor`, {
      method: 'GET',
    })
  ).data.supervisor
}

export async function setEmployeeSupervisor(employeeId: string, supervisorUserId: string | null) {
  return (
    await apiJson<ApiEnvelope<{ supervisor: SupervisionPerson | null }>>(`${BASE}/employees/${employeeId}/supervisor`, {
      method: 'PUT',
      body: JSON.stringify({ supervisorUserId }),
    })
  ).data.supervisor
}

export async function fetchSupervisionSessions(params: {
  employeeId?: string
  status?: SupervisionSessionStatus
  limit?: number
}): Promise<SupervisionSessionListRow[]> {
  const qs = new URLSearchParams()
  if (params.employeeId) qs.set('employeeId', params.employeeId)
  if (params.status) qs.set('status', params.status)
  if (params.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return (await apiJson<ApiEnvelope<SupervisionSessionListRow[]>>(`${BASE}/sessions${q ? `?${q}` : ''}`, { method: 'GET' }))
    .data
}

export async function fetchSupervisionSession(id: string): Promise<SupervisionSessionDetail> {
  return (await apiJson<ApiEnvelope<SupervisionSessionDetail>>(`${BASE}/sessions/${id}`, { method: 'GET' })).data
}

async function sessionCall(path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<SupervisionSessionDetail> {
  return (
    await apiJson<ApiEnvelope<SupervisionSessionDetail>>(`${BASE}/sessions${path}`, {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  ).data
}

export const createSupervisionSession = (body: CreateSupervisionSessionBody) => sessionCall('', 'POST', body)
export const updateSupervisionSession = (id: string, body: UpdateSupervisionSessionBody) =>
  sessionCall(`/${id}`, 'PATCH', body)
export const startSupervisionSession = (id: string) => sessionCall(`/${id}/start`, 'POST')
export const signSupervisionSession = (id: string, signature: string) =>
  sessionCall(`/${id}/sign`, 'POST', { signature })
export const signSupervisionAttendee = (
  id: string,
  employeeId: string,
  body: { signature?: string; agrees: boolean; comment?: string },
) => sessionCall(`/${id}/attendees/${employeeId}/sign`, 'POST', body)
export const cancelSupervisionSession = (id: string, reason: string) =>
  sessionCall(`/${id}/cancel`, 'POST', { reason })
export const addSupervisionAddendum = (id: string, text: string) => sessionCall(`/${id}/addenda`, 'POST', { text })

export async function addSupervisionAction(
  sessionId: string,
  body: { employeeId: string; description: string; owner?: SupervisionActionOwner; ownerName?: string; dueDate?: string },
): Promise<SupervisionAction> {
  return (
    await apiJson<ApiEnvelope<SupervisionAction>>(`${BASE}/sessions/${sessionId}/actions`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data
}

export async function updateSupervisionAction(
  actionId: string,
  body: Partial<{ status: SupervisionActionStatus; completedNote: string | null; dueDate: string | null; description: string }>,
): Promise<SupervisionAction> {
  return (
    await apiJson<ApiEnvelope<SupervisionAction>>(`${BASE}/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  ).data
}

export async function fetchOpenSupervisionActions(employeeId: string): Promise<OpenSupervisionAction[]> {
  return (
    await apiJson<ApiEnvelope<OpenSupervisionAction[]>>(`${BASE}/employees/${employeeId}/open-actions`, { method: 'GET' })
  ).data
}

export function employeeName(e: SupervisionEmployee | undefined | null): string {
  const p = e?.personalDetail
  return p ? `${p.firstName} ${p.lastName}`.trim() : 'Carer'
}

/**
 * What tells two carers with the same name apart: employee number when set, else the (unique)
 * username, else the start of the record id.
 */
export function employeeRef(e: SupervisionEmployee | undefined | null): string {
  const number = e?.employment?.employeeNumber?.trim()
  if (number) return `#${number}`
  const username = e?.personalDetail?.username?.trim()
  if (username) return `@${username}`
  return e?.id ? `ID ${e.id.slice(0, 8)}` : ''
}

export function personName(p: SupervisionPerson | undefined | null): string {
  if (!p) return '—'
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email
}

export const SUPERVISION_FORMAT_LABELS: Record<SupervisionFormat, string> = {
  ONE_TO_ONE: 'One-to-one',
  GROUP: 'Group',
  OBSERVED_PRACTICE: 'Observed practice / spot check',
  REMOTE: 'Phone / video',
}

export const SUPERVISION_STATUS_LABELS: Record<SupervisionSessionStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  AWAITING_SIGN_OFF: 'Awaiting carer sign-off',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const SUPERVISION_OWNER_LABELS: Record<SupervisionActionOwner, string> = {
  CARER: 'Carer',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  OTHER: 'Other',
}
