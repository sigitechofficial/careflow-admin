import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMedicationStatusCodesAdmin,
  patchMedicationStatusCode,
  type UpdateMedicationStatusCodePayload,
} from '@/features/settings/api/medication-settings.api'

export const medicationStatusCodesAdminKey = ['medication-status-codes', 'admin'] as const

export function useMedicationStatusCodesAdmin(enabled = true) {
  return useQuery({
    queryKey: medicationStatusCodesAdminKey,
    queryFn: ({ signal }) => listMedicationStatusCodesAdmin({ signal }),
    enabled,
    staleTime: 60_000,
  })
}

export function useUpdateMedicationStatusCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMedicationStatusCodePayload }) =>
      patchMedicationStatusCode(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: medicationStatusCodesAdminKey })
    },
  })
}
