import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMedicationSupplyDelivery,
  fetchMedicationSupplyBundle,
  type CreateSupplyDeliveryPayload,
} from '@/features/service-users/api/medication-mar.api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function medicationSupplyKey(serviceUserId: string) {
  return [...serviceUserKeys.detail(serviceUserId), 'medication-supply'] as const
}

export function useMedicationSupplyBundle(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicationSupplyKey(serviceUserId),
    queryFn: ({ signal }) => fetchMedicationSupplyBundle(serviceUserId, { signal }),
    enabled: Boolean(serviceUserId && enabled),
  })
}

export function useLogMedicationDelivery(serviceUserId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSupplyDeliveryPayload) =>
      createMedicationSupplyDelivery(serviceUserId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: medicationSupplyKey(serviceUserId) })
      await queryClient.invalidateQueries({
        queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-chart'],
      })
    },
  })
}
