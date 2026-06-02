import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMedicationRoundsAdmin,
  patchMedicationRound,
  type UpdateMedicationRoundPayload,
} from '@/features/settings/api/medication-settings.api'

export const medicationRoundsAdminKey = ['medication-administration-rounds', 'admin'] as const

export function useMedicationRoundsAdmin(enabled = true) {
  return useQuery({
    queryKey: medicationRoundsAdminKey,
    queryFn: ({ signal }) => listMedicationRoundsAdmin({ signal }),
    enabled,
    staleTime: 60_000,
  })
}

export function useUpdateMedicationRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMedicationRoundPayload }) =>
      patchMedicationRound(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: medicationRoundsAdminKey }),
        queryClient.invalidateQueries({ queryKey: ['medication-lookups', 'rounds'] }),
      ])
    },
  })
}
