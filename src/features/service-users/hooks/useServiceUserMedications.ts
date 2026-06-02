import { useQuery } from '@tanstack/react-query'
import { listServiceUserMedications } from '@/features/service-users/api'
import { serviceUserKeys } from '../keys'

export type UseServiceUserMedicationsOptions = {
  /** When true, includes ended/cancelled and past end-date prescriptions (Records tab). */
  includeInactive?: boolean
}

export function useServiceUserMedications(
  serviceUserId: string,
  options?: UseServiceUserMedicationsOptions,
) {
  const scope = options?.includeInactive ? 'all' : 'active'
  return useQuery({
    queryKey: serviceUserKeys.medications(serviceUserId, scope),
    queryFn: () =>
      listServiceUserMedications(serviceUserId, {
        showPastEndDate: options?.includeInactive === true,
        limit: options?.includeInactive ? 100 : undefined,
      }),
    enabled: Boolean(serviceUserId),
  })
}

export function useServiceUserArchivedMedications(serviceUserId: string) {
  return useQuery({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'medications', 'archived'] as const,
    queryFn: () =>
      listServiceUserMedications(serviceUserId, {
        archivedOnly: true,
        limit: 100,
      }),
    enabled: Boolean(serviceUserId),
  })
}
