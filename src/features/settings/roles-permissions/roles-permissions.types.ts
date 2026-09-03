export const ROLES_PERMISSIONS_SUB_IDS = ['office-users', 'roles', 'permissions'] as const

export type RolesPermissionsSubTab = (typeof ROLES_PERMISSIONS_SUB_IDS)[number]
