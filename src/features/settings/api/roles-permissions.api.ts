import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  FinancialAuthority,
  RoleResponsibilitiesData,
  RoleResponsibility,
} from '@/features/settings/roles-permissions/roles-permissions.types'

export type PermissionRow = {
  id: string
  key: string
  description: string | null
  isActive?: boolean
}

export type RoleWithPermissions = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  userCount: number
  permissions: PermissionRow[]
}

export async function fetchRoles(signal?: AbortSignal): Promise<RoleWithPermissions[]> {
  const res = await apiJson<{ data: RoleWithPermissions[] }>('/roles', { method: 'GET', signal })
  return res.data ?? []
}

export async function createRole(input: {
  name: string
  description?: string
}): Promise<{ id: string; name: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string; name: string }>>('/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data!
}

export async function updateRole(
  roleId: string,
  input: { name?: string; description?: string; isActive?: boolean },
): Promise<void> {
  await apiJson(`/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function setRolePermissions(
  roleId: string,
  permissionKeys: string[],
): Promise<RoleWithPermissions> {
  const res = await apiJson<ApiEnvelope<RoleWithPermissions>>(`/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionKeys }),
  })
  return res.data!
}

export async function fetchPermissionsCatalog(signal?: AbortSignal): Promise<PermissionRow[]> {
  const res = await apiJson<{ data: PermissionRow[] }>('/permissions', { method: 'GET', signal })
  return res.data ?? []
}

export async function fetchRoleResponsibilities(signal?: AbortSignal): Promise<RoleResponsibilitiesData> {
  const res = await apiJson<ApiEnvelope<RoleResponsibilitiesData>>('/role-responsibilities', {
    method: 'GET',
    signal,
  })
  return res.data as RoleResponsibilitiesData
}

export async function fetchFinancialAuthority(signal?: AbortSignal): Promise<FinancialAuthority> {
  const res = await apiJson<ApiEnvelope<FinancialAuthority>>('/role-responsibilities/financial-authority', {
    method: 'GET',
    signal,
  })
  return res.data as FinancialAuthority
}

/** Give a job to roles; other roles lose the ability (admins always keep it). */
export async function assignRoleResponsibility(key: string, roleIds: string[]): Promise<RoleResponsibility> {
  const res = await apiJson<ApiEnvelope<RoleResponsibility>>(`/role-responsibilities/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds }),
  })
  return res.data as RoleResponsibility
}
