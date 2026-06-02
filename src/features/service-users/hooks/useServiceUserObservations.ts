import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createServiceUserObservation,
  fetchObservationTypes,
  fetchObservationShareTargets,
  fetchWellbeingScale,
  listServiceUserObservations,
} from '@/features/service-users/api/observations-api'
import { serviceUserKeys } from '../keys'

const observationLookupKeys = {
  types: () => ['observation-lookups', 'types'] as const,
  shareTargets: () => ['observation-lookups', 'share-targets'] as const,
  wellbeingScale: () => ['observation-lookups', 'wellbeing-scale'] as const,
}

/** Stable lookup data — cached for 10 min. */
export function useObservationTypes() {
  return useQuery({
    queryKey: observationLookupKeys.types(),
    queryFn: fetchObservationTypes,
    staleTime: 10 * 60 * 1000,
  })
}

export function useObservationShareTargets() {
  return useQuery({
    queryKey: observationLookupKeys.shareTargets(),
    queryFn: fetchObservationShareTargets,
    staleTime: 10 * 60 * 1000,
  })
}

export function useWellbeingScale() {
  return useQuery({
    queryKey: observationLookupKeys.wellbeingScale(),
    queryFn: fetchWellbeingScale,
    staleTime: 10 * 60 * 1000,
  })
}

export function useServiceUserObservations(serviceUserId: string, typeCode?: string) {
  return useQuery({
    queryKey: [...serviceUserKeys.observations(serviceUserId), typeCode],
    queryFn: () => listServiceUserObservations(serviceUserId, { typeCode }),
    enabled: Boolean(serviceUserId),
  })
}

export function useCreateServiceUserObservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      body,
    }: {
      serviceUserId: string
      body: Parameters<typeof createServiceUserObservation>[1]
    }) => createServiceUserObservation(serviceUserId, body),
    onSuccess: (_data, { serviceUserId }) => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.observations(serviceUserId) })
    },
  })
}
