import { useQuery } from '@tanstack/react-query'
import {
  listAuditLogs,
  listServiceUserMedicationActivity,
  type ListAuditLogsParams,
} from '@/features/audit/api/audit-logs.api'

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (params: ListAuditLogsParams) => [...auditLogKeys.all, 'list', params] as const,
  medicationActivity: (serviceUserId: string, page: number) =>
    [...auditLogKeys.all, 'medication-activity', serviceUserId, page] as const,
}

export function useAuditLogs(params: ListAuditLogsParams, enabled = true) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => listAuditLogs(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useMedicationActivityLog(serviceUserId: string, page = 1, enabled = true) {
  return useQuery({
    queryKey: auditLogKeys.medicationActivity(serviceUserId, page),
    queryFn: () => listServiceUserMedicationActivity(serviceUserId, { page, limit: 50 }),
    enabled: Boolean(serviceUserId) && enabled,
    staleTime: 30_000,
  })
}
