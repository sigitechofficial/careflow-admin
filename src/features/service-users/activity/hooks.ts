import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeCancellationBilling,
  fetchServiceUserCompletedVisits,
  type ServiceUserActivityVisitQuery,
} from '@/features/service-users/activity/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import { getApiBaseUrl } from '@/shared/lib/api-base'

export function useServiceUserVisitActivity(
  serviceUserId: string,
  params?: ServiceUserActivityVisitQuery,
) {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 50
  const dateFrom = params?.dateFrom?.trim() || undefined
  const dateTo = params?.dateTo?.trim() || undefined
  const statuses = params?.statuses
  const sortOrder = params?.sortOrder
  return useQuery({
    queryKey: [
      ...serviceUserKeys.visitActivity(serviceUserId, { page, limit, dateFrom, dateTo }),
      statuses?.join(',') ?? 'completed',
      sortOrder ?? 'desc',
    ],
    queryFn: () =>
      fetchServiceUserCompletedVisits(serviceUserId, { page, limit, dateFrom, dateTo, statuses, sortOrder }),
    enabled: Boolean(getApiBaseUrl()) && Boolean(serviceUserId),
  })
}

/** Change a cancelled visit's billing decision, then refresh the service user's visits and timebank. */
export function useChangeCancellationBilling(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof changeCancellationBilling>[1] & { scheduledJobId: string }) =>
      changeCancellationBilling(input.scheduledJobId, { chargeDecision: input.chargeDecision, note: input.note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.all() })
      void qc.invalidateQueries({ queryKey: ['timebank'] })
    },
  })
}
