import type { Permission, RoleId } from '@/auth/types'

const EMPLOYEE_ALL: Permission[] = [
  'employees.read',
  'employees.create',
  'employees.update',
  'employees.delete',
  'employees.status.update',
  'employees.documents.read',
  'employees.documents.upload',
  'employees.documents.delete',
  'employees.compliance.read',
  'employees.compliance.update',
  'employees.reports.read',
]

/** Role → default permissions (merged with `/auth/me` keys in API mode). */
export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  super_admin: [
    'users.read',
    'users.write',
    'users.create',
    'schedule.read',
    'schedule.write',
    'employee.read',
    'employee.write',
    ...EMPLOYEE_ALL,
    'lookups.read',
    'roles.manage',
    'permissions.manage',
    'incidents.read',
    'incidents.write',
    'audit.read',
    'audit_logs.read',
    'security.admin',
    'sso.configure',
  ],
  admin: [
    'users.read',
    'users.write',
    'users.create',
    'schedule.read',
    'schedule.write',
    'employee.read',
    'employee.write',
    ...EMPLOYEE_ALL,
    'lookups.read',
    'incidents.read',
    'incidents.write',
    'audit.read',
    'audit_logs.read',
  ],
  manager: [
    'users.read',
    'schedule.read',
    'schedule.write',
    'employee.read',
    'employees.read',
    'employees.create',
    'employees.update',
    'employees.compliance.read',
    'employees.compliance.update',
    'employees.reports.read',
    'lookups.read',
    'incidents.read',
    'incidents.write',
  ],
  staff: ['schedule.read', 'employee.read', 'employees.read', 'incidents.read'],
  auditor: [
    'users.read',
    'schedule.read',
    'employee.read',
    'employees.read',
    'incidents.read',
    'audit.read',
    'audit_logs.read',
  ],
  temporary_inspector: ['temporary_inspector.session'],
}

export function permissionsForRole(role: RoleId): Permission[] {
  return [...ROLE_PERMISSIONS[role]]
}

export function hasPermission(
  granted: Permission[] | undefined,
  required: Permission | Permission[],
): boolean {
  if (!granted?.length) return false
  const need = Array.isArray(required) ? required : [required]
  return need.every(p => granted.includes(p))
}

export function hasRole(role: RoleId | undefined, anyOf: RoleId[]): boolean {
  if (!role) return false
  return anyOf.includes(role)
}
