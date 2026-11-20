import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ReviewPerson = { id: string; name: string; roles: string[] } | null

export type SetupItem = { key: string; label: string; tab: string }

export type AccountReview = {
  /** May the signed-in user approve / decline (review roles, or edit / delete staff permission). */
  canDecide?: { signup: boolean; deletion: boolean }
  createdAt: string
  creationSource: 'ADMIN' | 'CARE_APP_SIGNUP'
  createdBy: ReviewPerson
  signup: {
    status: 'APPROVED' | 'PENDING' | 'DECLINED'
    decidedAt: string | null
    decidedBy: ReviewPerson
    note: string | null
    /** What the carer typed in the Care app. */
    submitted: {
      signedUpAt: string
      firstName: string | null
      lastName: string | null
      email: string | null
      mobile: string | null
      dateOfBirth: string | null
      address: string | null
      nationalInsuranceNo: string | null
      branch: string | null
    } | null
    /** After approval: what the office still needs to add, and the staff-record tab for each. */
    missing: SetupItem[] | null
    /** Waiting sign-up: branches for the approval card, "Zone · Branch" names. */
    branchOptions: Array<{ id: string; label: string }> | null
    current: {
      locationId: string | null
      roleId: string | null
      rbacLevelId: string | null
      contractedWeeklyHours: number | null
    }
    defaults: { roleId: string | null; rbacLevelId: string | null; workAreaId: string | null } | null
  } | null
  deletionRequest: {
    id: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'DECLINED'
    requestedAt: string
    decidedAt: string | null
    decisionNote: string | null
    decidedBy: ReviewPerson
    futureVisits: {
      count: number
      visits: Array<{ jobId: string; start: string; end: string; client: string }>
    } | null
  } | null
}

const base = (employeeId: string) => `/employees/${employeeId}/account-review`

export async function fetchAccountReview(employeeId: string): Promise<AccountReview> {
  const res = await apiJson<ApiEnvelope<AccountReview>>(base(employeeId), { method: 'GET' })
  return res.data
}

export async function decideSignup(
  employeeId: string,
  body: {
    decision: 'approve' | 'decline'
    locationId?: string
    roleId?: string
    rbacLevelId?: string
    contractedWeeklyHours?: number
    note?: string
  },
): Promise<{ message: string; missing: SetupItem[] }> {
  const res = await apiJson<ApiEnvelope<{ missing?: SetupItem[] }>>(`${base(employeeId)}/signup`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { message: res.message ?? 'Saved', missing: res.data?.missing ?? [] }
}

export async function decideDeletion(
  employeeId: string,
  body: { decision: 'approve' | 'decline'; note?: string },
): Promise<{ message: string }> {
  const res = await apiJson<ApiEnvelope<unknown>>(`${base(employeeId)}/deletion`, { method: 'POST', body: JSON.stringify(body) })
  return { message: res.message ?? 'Saved' }
}
