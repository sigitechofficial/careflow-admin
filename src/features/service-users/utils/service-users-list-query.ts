import type { ListServiceUsersParams } from '@/features/service-users/api'
import type { QuickSelectListId } from '@/features/service-users/components/ServiceUserQuickSelectBar'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'

/** Default status filter on `/service-users/all` — in-service active users only. */
export const DEFAULT_SERVICE_USER_STATUS_CODE = 'ACTIVE'

export const DEFAULT_SERVICE_USERS_PAGE_SIZE = 25

/** `all` or a status lookup code from the database (e.g. ACTIVE, PRE_ADMISSION). */
export type StatusFilterValue = 'all' | string

export function statusFilterLabel(code: string, name: string): string {
  if (code === DEFAULT_SERVICE_USER_STATUS_CODE) return 'In service (active)'
  return name
}

export function statusIdForFilter(
  lookups: ServiceUserLookupsBundle | null | undefined,
  filter: StatusFilterValue,
): string | undefined {
  if (!lookups || filter === 'all') return undefined
  return lookups.statuses.find((s) => s.code === filter)?.id
}

export function statusFilterForQuickSelect(id: QuickSelectListId): StatusFilterValue {
  switch (id) {
    case 'all':
      return 'all'
    case 'active':
      return DEFAULT_SERVICE_USER_STATUS_CODE
    case 'discharged':
      return 'DISCHARGED'
    case 'deleted':
      return 'all'
  }
}

export function listQueryForFilters(
  lookups: ServiceUserLookupsBundle | null | undefined,
  listFilter: QuickSelectListId | null,
  statusFilter: StatusFilterValue,
  onHoldOnly: boolean,
) {
  if (listFilter === 'deleted') {
    return { showDeleted: true, showInactive: true, statusId: undefined }
  }
  if (listFilter === 'all') {
    return { showDeleted: false, showInactive: true, statusId: undefined }
  }
  if (listFilter === 'active') {
    return {
      showDeleted: false,
      showInactive: false,
      statusId: statusIdForFilter(lookups, DEFAULT_SERVICE_USER_STATUS_CODE),
    }
  }
  if (listFilter === 'discharged') {
    return {
      showDeleted: false,
      showInactive: true,
      statusId: statusIdForFilter(lookups, 'DISCHARGED'),
    }
  }
  if (onHoldOnly) {
    return {
      showDeleted: false,
      showInactive: true,
      statusId: statusIdForFilter(lookups, 'ON_HOLD'),
    }
  }
  return {
    showDeleted: false,
    showInactive: statusFilter !== DEFAULT_SERVICE_USER_STATUS_CODE ? true : undefined,
    statusId: statusIdForFilter(lookups, statusFilter),
  }
}

export function buildServiceUsersListParams(
  lookups: ServiceUserLookupsBundle | null | undefined,
  options: {
    page: number
    search?: string
    listFilter: QuickSelectListId | null
    statusFilter: StatusFilterValue
    onHoldOnly: boolean
    locationId?: string
  },
): ListServiceUsersParams {
  const query = listQueryForFilters(
    lookups,
    options.listFilter,
    options.statusFilter,
    options.onHoldOnly,
  )
  return {
    page: options.page,
    limit: DEFAULT_SERVICE_USERS_PAGE_SIZE,
    search: options.search || undefined,
    statusId: query.statusId,
    showInactive: query.showInactive,
    showDeleted: query.showDeleted,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    locationId: options.locationId || undefined,
  }
}

/** Route-loader default: first page of in-service (ACTIVE) service users. */
export function defaultServiceUsersListParams(
  lookups: ServiceUserLookupsBundle,
): ListServiceUsersParams {
  return buildServiceUsersListParams(lookups, {
    page: 1,
    listFilter: null,
    statusFilter: DEFAULT_SERVICE_USER_STATUS_CODE,
    onHoldOnly: false,
  })
}
