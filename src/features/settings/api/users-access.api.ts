import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type OfficeUserRole = { id: string; name: string }
export type OfficeUserLocation = { id: string; name: string }

export type OfficeUserRow = {
  id: string
  email: string
  username: string | null
  firstName: string | null
  lastName: string | null
  isActive: boolean
  createdAt: string
  /** Invited, and has not chosen a password yet. */
  invitePending?: boolean
  roles: OfficeUserRole[]
  locations: OfficeUserLocation[]
  scopeType: 'platform' | 'company' | 'branch'
}

export async function fetchOfficeUsers(signal?: AbortSignal): Promise<OfficeUserRow[]> {
  const res = await apiJson<{ data: OfficeUserRow[] }>('/users', { method: 'GET', signal })
  return res.data ?? []
}

/** A new office user: no password, they choose it from the welcome email ({@link sendOfficeUserInvite}). */
export type CreateOfficeUserInput = {
  email: string
  /** Set by the office now (they give it to the person); without it the person chooses their own from the email. */
  password?: string
  username?: string
  firstName?: string
  lastName?: string
}

export async function createOfficeUser(
  input: CreateOfficeUserInput,
): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email.trim(),
      ...(input.password ? { password: input.password } : {}),
      username: input.username?.trim() || undefined,
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
    }),
  })
  if (!res.data?.id) throw new Error('User created but no id returned')
  return res.data
}

/** Email the welcome (website login) with a link to choose their password. Returns the message to show. */
export async function sendOfficeUserInvite(userId: string, opts: { passwordGiven?: boolean } = {}): Promise<string> {
  const res = await apiJson<ApiEnvelope<{ emailed: string }>>(`/users/${userId}/send-invite`, {
    method: 'POST',
    body: JSON.stringify({ passwordGiven: Boolean(opts.passwordGiven) }),
  })
  return res.message
}

export async function setOfficeUserRoles(
  userId: string,
  roleNames: string[],
): Promise<{ requiresBranchAssignment?: boolean }> {
  const res = await apiJson<ApiEnvelope<{ requiresBranchAssignment?: boolean }>>(
    `/users/${userId}/roles`,
    { method: 'PUT', body: JSON.stringify({ roleNames }) },
  )
  return res.data ?? {}
}

export type UpdateOfficeUserInput = {
  firstName?: string
  lastName?: string
  email?: string
  /** New password set by the office (also their Care app password when linked); signs them out everywhere. */
  password?: string
}

export async function updateOfficeUser(userId: string, input: UpdateOfficeUserInput): Promise<void> {
  await apiJson(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function setOfficeUserLocations(userId: string, locationIds: string[]): Promise<void> {
  await apiJson(`/users/${userId}/locations`, {
    method: 'PUT',
    body: JSON.stringify({ locationIds }),
  })
}

/**
 * Roles never offered on Office users. Carer roles come from the RBAC level on the Employment tab;
 * an Independent reviewer account is made only by "Add a reviewer" on a survey.
 */
export const NON_OFFICE_ROLE_NAMES = new Set([
  'Senior Carer/Nurse',
  'Carer/Domestic',
  'Independent reviewer',
])

export const COMPANY_WIDE_ROLE_NAMES = new Set([
  'Super Admin',
  'Admin',
  'Master Staff Allocation',
])

/**
 * Any role other than the company-wide ones needs a branch: the backend gives such a user with no
 * branch no access at all (it never falls back to all branches). Covers roles added later too.
 */
export function rolesNeedBranches(roleNames: string[]): boolean {
  return roleNames.length > 0 && !roleNames.some(r => COMPANY_WIDE_ROLE_NAMES.has(r))
}

/** Must stay aligned with backend `ROLE_PRIVILEGE_RANK`. */
export const ROLE_PRIVILEGE_RANK: Record<string, number> = {
  'Super Admin': 100,
  Admin: 80,
  'Master Staff Allocation': 60,
  'Branch Admin': 50,
  Manager: 40,
  'Care Coordinator': 30,
  HR: 30,
  'Staff Allocation': 20,
}

export function maxRolePrivilege(roles: string[]): number {
  let max = 0
  for (const role of roles) {
    const rank = ROLE_PRIVILEGE_RANK[role] ?? 10
    if (rank > max) max = rank
  }
  return max
}

/**
 * Roles the actor may assign, from the active roles in the database (same rank or lower; Super Admin
 * only by Super Admin). Highest rank first, then by name.
 */
export function assignableRolesForActor(
  actorRoles: string[],
  roles: { name: string; isActive: boolean }[],
): string[] {
  const rank = maxRolePrivilege(actorRoles)
  const isSuper = actorRoles.includes('Super Admin')
  const roleRank = (name: string) => ROLE_PRIVILEGE_RANK[name] ?? 10
  return roles
    .filter(r => r.isActive && !NON_OFFICE_ROLE_NAMES.has(r.name))
    .map(r => r.name)
    .filter(name => {
      if (name === 'Super Admin' && !isSuper) return false
      return roleRank(name) <= rank
    })
    .sort((a, b) => roleRank(b) - roleRank(a) || a.localeCompare(b))
}
