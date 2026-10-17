export const ROLES_PERMISSIONS_SUB_IDS = ['office-users', 'roles', 'responsibilities', 'permissions'] as const

export type RolesPermissionsSubTab = (typeof ROLES_PERMISSIONS_SUB_IDS)[number]

/** A plain-language job (e.g. "Create payroll") and the roles that do it. */
export type RoleResponsibility = {
  key: string
  label: string
  description: string
  /** Roles that can do the whole job today. */
  roleIds: string[]
  /** Roles that can do part of it. */
  partialRoleIds: string[]
  /** Financial authorisation: no admin role holds it automatically; an admin role can be chosen. */
  explicitOnly?: boolean
}

export type RoleResponsibilitiesData = {
  /** Always do every job (not choosable). */
  adminRoles: string[]
  roles: Array<{ id: string; name: string }>
  /** Admin roles as a choice, for the jobs they do not hold automatically. */
  adminRoleOptions?: Array<{ id: string; name: string }>
  responsibilities: RoleResponsibility[]
}

/** Who can prepare, approve, close, pay and audit carer pay today (read-only). */
export type FinancialAuthority = {
  powers: Array<{
    key: string
    label: string
    permissions: string[]
    requiredForPayroll: boolean
    users: Array<{ id: string; name: string; roles: string[] }>
  }>
  warnings: Array<{ powerKey: string; kind: 'NO_HOLDER' | 'SAME_PERSON'; message: string }>
}
