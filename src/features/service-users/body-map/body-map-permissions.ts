/** Mirrors backend @AnyPermission fallbacks for body map (§17). */

function anyOf(permissions: readonly string[], keys: readonly string[]): boolean {
  return keys.some(k => permissions.includes(k))
}

export function canReadBodyMap(permissions: readonly string[]): boolean {
  return anyOf(permissions, ['service_users.body_map.read', 'service_users.read'])
}

export function canCreateBodyMap(permissions: readonly string[]): boolean {
  return anyOf(permissions, ['service_users.body_map.create', 'service_users.update'])
}

export function canUpdateBodyMap(permissions: readonly string[]): boolean {
  return anyOf(permissions, ['service_users.body_map.update', 'service_users.update'])
}

export function canReviewBodyMap(permissions: readonly string[]): boolean {
  return anyOf(permissions, [
    'service_users.body_map.review',
    'service_users.body_map.update',
    'service_users.update',
  ])
}

export function canCloseBodyMap(permissions: readonly string[]): boolean {
  return anyOf(permissions, [
    'service_users.body_map.close',
    'service_users.body_map.update',
    'service_users.update',
  ])
}

export function canExportBodyMap(permissions: readonly string[]): boolean {
  return anyOf(permissions, [
    'service_users.body_map.export',
    'service_users.body_map.review',
    'service_users.body_map.close',
    'service_users.update',
  ])
}

/** CQC inspector / auditor: view and export only (§17, b4-10). */
export function isBodyMapInspectionOnly(permissions: readonly string[]): boolean {
  return (
    canReadBodyMap(permissions) &&
    !canCreateBodyMap(permissions) &&
    !canUpdateBodyMap(permissions) &&
    !canReviewBodyMap(permissions) &&
    !canCloseBodyMap(permissions)
  )
}
