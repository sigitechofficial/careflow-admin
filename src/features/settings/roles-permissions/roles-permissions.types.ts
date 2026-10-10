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
}

export type RoleResponsibilitiesData = {
  /** Always do every job (not choosable). */
  adminRoles: string[]
  roles: Array<{ id: string; name: string }>
  responsibilities: RoleResponsibility[]
}
