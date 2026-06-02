import { useQuery } from '@tanstack/react-query'
import {
  fetchMedicationEvent,
  listMedicationEvents,
} from '@/features/service-users/api/medication-mar.api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function medicationEventsKey(serviceUserId: string, page: number) {
  return [...serviceUserKeys.detail(serviceUserId), 'medication-events', page] as const
}

export function medicationEventDetailKey(serviceUserId: string, eventId: string | null) {
  return [...serviceUserKeys.detail(serviceUserId), 'medication-event', eventId] as const
}

export function useMedicationEventsList(
  serviceUserId: string,
  page = 1,
  enabled = true,
  filters?: {
    medicationId?: string
    medicationIds?: string[]
    needsReview?: boolean
    dateFrom?: string
    dateTo?: string
    status?: string
    statusCode?: string
  },
) {
  return useQuery({
    queryKey: [
      ...medicationEventsKey(serviceUserId, page),
      filters?.medicationId ?? '',
      filters?.medicationIds?.join(',') ?? '',
      filters?.needsReview ?? false,
      filters?.dateFrom ?? '',
      filters?.dateTo ?? '',
      filters?.status ?? '',
      filters?.statusCode ?? '',
    ],
    queryFn: ({ signal }) =>
      listMedicationEvents(
        serviceUserId,
        {
          page,
          limit: 30,
          medicationId: filters?.medicationId,
          medicationIds: filters?.medicationIds,
          needsReview: filters?.needsReview,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          status: filters?.status,
          statusCode: filters?.statusCode,
        },
        { signal },
      ),
    enabled: Boolean(serviceUserId && enabled),
  })
}

export function useMedicationEventDetail(
  serviceUserId: string,
  eventId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: medicationEventDetailKey(serviceUserId, eventId),
    queryFn: ({ signal }) => fetchMedicationEvent(serviceUserId, eventId!, { signal }),
    enabled: Boolean(serviceUserId && eventId && enabled),
  })
}
