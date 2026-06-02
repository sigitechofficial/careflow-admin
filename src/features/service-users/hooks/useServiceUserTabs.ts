import { useQuery } from '@tanstack/react-query'
import {
  fetchLiveInLookupsBundle,
  fetchServiceUserDomCare,
  fetchServiceUserDocuments,
  fetchServiceUserFlashMessage,
  fetchServiceUserInitialAssessment,
  fetchServiceUserLiveInProfile,
  listEnterpriseFunders,
  listEnterpriseFundingTypes,
  listServiceUserAbsences,
  listServiceUserAllergies,
  listServiceUserEnterpriseFundings,
  listServiceUserInventory,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function useServiceUserAllergies(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.allergies(serviceUserId),
    queryFn: ({ signal }) => listServiceUserAllergies(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserDocuments(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.documents(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserDocuments(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserInventory(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.inventory(serviceUserId),
    queryFn: ({ signal }) => listServiceUserInventory(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserInitialAssessment(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.initialAssessment(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserInitialAssessment(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserDomCare(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.domCare(serviceUserId),
    queryFn: () => fetchServiceUserDomCare(serviceUserId),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserLiveInProfile(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.liveIn(serviceUserId),
    queryFn: () => fetchServiceUserLiveInProfile(serviceUserId),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useLiveInLookups(enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.liveInLookups(),
    queryFn: () => fetchLiveInLookupsBundle(),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useServiceUserAbsences(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.absences(serviceUserId),
    queryFn: () => listServiceUserAbsences(serviceUserId),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserFlashMessage(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.flashMessage(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserFlashMessage(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useEnterpriseFundingTypes(enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.fundingTypes(),
    queryFn: () => listEnterpriseFundingTypes(),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useEnterpriseFunders(enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.funders(),
    queryFn: () => listEnterpriseFunders(),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useServiceUserEnterpriseFundings(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.funding(serviceUserId),
    queryFn: () => listServiceUserEnterpriseFundings(serviceUserId, { limit: 100 }),
    enabled: enabled && Boolean(serviceUserId),
  })
}
