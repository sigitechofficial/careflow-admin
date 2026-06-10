import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  createMedicationRound,
  listMedicationRoundsAdmin,
  patchMedicationRound,
  type CreateMedicationRoundPayload,
  type UpdateMedicationRoundPayload,
} from '@/features/settings/api/medication-settings.api'

export const medicationRoundsAdminKey = ['medication-administration-rounds', 'admin'] as const

function invalidateMedicationRoundQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: medicationRoundsAdminKey }),
    queryClient.invalidateQueries({ queryKey: ['medication-lookups', 'rounds'] }),
    queryClient.invalidateQueries({ queryKey: [...serviceUserKeys.all(), 'medication-lookups'] }),
  ])
}

export function useMedicationRoundsAdmin(enabled = true) {
  return useQuery({
    queryKey: medicationRoundsAdminKey,
    queryFn: ({ signal }) => listMedicationRoundsAdmin({ signal }),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreateMedicationRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateMedicationRoundPayload) => createMedicationRound(body),
    onSuccess: async () => invalidateMedicationRoundQueries(queryClient),
  })
}

export function useUpdateMedicationRound() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMedicationRoundPayload }) =>
      patchMedicationRound(id, body),
    onSuccess: async () => invalidateMedicationRoundQueries(queryClient),
  })
}
