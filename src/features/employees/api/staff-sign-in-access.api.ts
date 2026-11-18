import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** none: never given · invited: waiting for them to choose a password · active · off: switched off. */
export type SignInState = 'none' | 'invited' | 'active' | 'off'

export type SignInAccessStatus = {
  employeeId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  canHaveAccess: boolean
  blockedReason: string | null
  rbacLevel: string | null
  rbacLevelKind: 'office' | 'field' | null
  suggested: { website: boolean; app: boolean }
  website: {
    state: SignInState
    email: string | null
    roles: string[]
    isSuperAdmin: boolean
    lastSignInAt: string | null
    signedInDevices: number
    linkSentAt: string | null
  }
  app: {
    state: SignInState
    email: string | null
    lastSignInAt: string | null
    signedInDevices: number
    linkSentAt: string | null
  }
  onePassword: boolean
  canManageWebsite: boolean
}

export type SignInAccessChange = { message: string; status: SignInAccessStatus }

const base = (employeeId: string) => `/employees/${employeeId}/sign-in-access`

export async function fetchSignInAccess(employeeId: string): Promise<SignInAccessStatus> {
  const res = await apiJson<ApiEnvelope<SignInAccessStatus>>(base(employeeId))
  return res.data
}

async function change(path: string, init: RequestInit): Promise<SignInAccessChange> {
  const res = await apiJson<ApiEnvelope<{ status: SignInAccessStatus }>>(path, init)
  return { message: res.message ?? '', status: res.data.status }
}

/**
 * Switch the office login and/or Care app on or off. On: emails a set-password link, or with `password` the office
 * sets it now (the email never contains it). Off: signs them out.
 */
export function setSignInAccess(employeeId: string, body: { website?: boolean; app?: boolean; password?: string }) {
  return change(base(employeeId), { method: 'PUT', body: JSON.stringify(body) })
}

export function resendSignInLink(employeeId: string) {
  return change(`${base(employeeId)}/send-link`, { method: 'POST' })
}

/** Set their password now (office login and Care app: one password). Nothing is emailed. */
export function setStaffPassword(employeeId: string, password: string) {
  return change(`${base(employeeId)}/password`, { method: 'POST', body: JSON.stringify({ password }) })
}

export function signOutEverywhere(employeeId: string) {
  return change(`${base(employeeId)}/sign-out`, { method: 'POST' })
}
