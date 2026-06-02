import { ApiError, apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { AuditEventType } from '@/features/audit/audit-event-types'

export type AuditLogUserBrief = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
} | null

export type AuditLogContext = {
  serviceUserId: string | null
  serviceUserName: string | null
  subject: string | null
  eventLabel: string
  summary: string
  eventType: AuditEventType
}

export type AuditLogRow = {
  id: string
  userId: string | null
  module: string
  action: string
  eventType: AuditEventType | null
  recordType: string | null
  recordId: string | null
  description: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  status: string
  createdAt: string
  user?: AuditLogUserBrief
  context?: AuditLogContext
}

export type ListAuditLogsParams = {
  page?: number
  limit?: number
  search?: string
  userId?: string
  serviceUserId?: string
  module?: string
  action?: string
  eventType?: AuditEventType
  recordType?: string
  recordId?: string
  dateFrom?: string
  dateTo?: string
  ipAddress?: string
  sortBy?: 'createdAt' | 'module' | 'action'
  sortOrder?: 'asc' | 'desc'
}

export type PaginatedMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export async function listAuditLogs(
  params: ListAuditLogsParams = {},
): Promise<{ rows: AuditLogRow[]; meta: PaginatedMeta }> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.userId) qs.set('userId', params.userId)
  if (params.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params.module) qs.set('module', params.module)
  if (params.action) qs.set('action', params.action)
  if (params.eventType) qs.set('eventType', params.eventType)
  if (params.recordType) qs.set('recordType', params.recordType)
  if (params.recordId) qs.set('recordId', params.recordId)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  if (params.ipAddress?.trim()) qs.set('ipAddress', params.ipAddress.trim())
  if (params.sortBy) qs.set('sortBy', params.sortBy)
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder)
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<AuditLogRow[]>>(`/audit-logs${q ? `?${q}` : ''}`, {
    method: 'GET',
  })
  const meta = (res.meta ?? {}) as Partial<PaginatedMeta>
  return {
    rows: res.data ?? [],
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
      total: meta.total ?? res.data?.length ?? 0,
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage ?? false,
      hasPrevPage: meta.hasPrevPage ?? false,
    },
  }
}

export async function listServiceUserMedicationActivity(
  serviceUserId: string,
  params: { page?: number; limit?: number } = {},
): Promise<{ rows: AuditLogRow[]; meta: PaginatedMeta }> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  const q = qs.toString()
  try {
    const res = await apiJson<ApiEnvelope<AuditLogRow[]>>(
      `/service-users/${serviceUserId}/medications/activity-log${q ? `?${q}` : ''}`,
      { method: 'GET' },
    )
    const meta = (res.meta ?? {}) as Partial<PaginatedMeta>
    return {
      rows: res.data ?? [],
      meta: {
        page: meta.page ?? 1,
        limit: meta.limit ?? 20,
        total: meta.total ?? res.data?.length ?? 0,
        totalPages: meta.totalPages ?? 1,
        hasNextPage: meta.hasNextPage ?? false,
        hasPrevPage: meta.hasPrevPage ?? false,
      },
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return listAuditLogs({
        ...params,
        serviceUserId,
        module: 'MEDICATION',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    }
    throw e
  }
}
