import { useQuery } from '@tanstack/react-query'
import { listMedicationRounds } from '@/features/settings/api/medication-settings.api'

export function useMedicationRounds(enabled = true) {
  return useQuery({
    queryKey: ['medication-lookups', 'rounds'],
    queryFn: ({ signal }) => listMedicationRounds({ signal }),
    staleTime: 10 * 60_000,
    enabled,
  })
}
