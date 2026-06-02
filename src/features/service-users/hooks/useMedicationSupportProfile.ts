import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMedicationSupportProfile,
  patchMedicationSupportProfile,
  type UpdateMedicationSupportProfilePayload,
} from '@/features/service-users/api/medication-support-profile.api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function medicationSupportProfileKey(serviceUserId: string) {
  return [...serviceUserKeys.detail(serviceUserId), 'medication-support-profile'] as const
}

export function useMedicationSupportProfile(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicationSupportProfileKey(serviceUserId),
    queryFn: ({ signal }) => getMedicationSupportProfile(serviceUserId, { signal }),
    enabled: Boolean(serviceUserId) && enabled,
    staleTime: 60_000,
  })
}

export function useUpdateMedicationSupportProfile(serviceUserId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMedicationSupportProfilePayload) =>
      patchMedicationSupportProfile(serviceUserId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: medicationSupportProfileKey(serviceUserId),
      })
    },
  })
}
