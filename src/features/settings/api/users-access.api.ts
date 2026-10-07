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
  roles: OfficeUserRole[]
  locations: OfficeUserLocation[]
  scopeType: 'platform' | 'company' | 'branch'
}

export async function fetchOfficeUsers(signal?: AbortSignal): Promise<OfficeUserRow[]> {
  const res = await apiJson<{ data: OfficeUserRow[] }>('/users', { method: 'GET', signal })
  return res.data ?? []
}

export type CreateOfficeUserInput = {
  email: string
  password: string
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
      password: input.password,
      username: input.username?.trim() || undefined,
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
    }),
  })
  if (!res.data?.id) throw new Error('User created but no id returned')
  return res.data
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
  /** New password — signs the user out of other sessions. */
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

/** Identity roles commonly assigned for Approach A hierarchy. */
export const ASSIGNABLE_IDENTITY_ROLES = [
  'Super Admin',
  'Admin',
  'Master Staff Allocation',
  'Branch Admin',
  'Staff Allocation',
  'Manager',
  'Care Coordinator',
  'HR',
] as const

export const BRANCH_SCOPED_ROLE_NAMES = new Set([
  'Branch Admin',
  'Staff Allocation',
  'Manager',
  'Care Coordinator',
  'HR',
])

export const COMPANY_WIDE_ROLE_NAMES = new Set([
  'Super Admin',
  'Admin',
  'Master Staff Allocation',
])

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

/** Roles the actor may assign (same rank or lower; Super Admin only by Super Admin). */
export function assignableRolesForActor(actorRoles: string[]): string[] {
  const rank = maxRolePrivilege(actorRoles)
  const isSuper = actorRoles.includes('Super Admin')
  return ASSIGNABLE_IDENTITY_ROLES.filter(role => {
    if (role === 'Super Admin' && !isSuper) return false
    return (ROLE_PRIVILEGE_RANK[role] ?? 10) <= rank
  })
}
