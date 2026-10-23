import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { safeguardingKeys } from '@/features/safeguarding/keys'
import {
  addSafeguardingNote,
  createSafeguarding,
  getSafeguarding,
  getSafeguardingSummary,
  listSafeguarding,
  listSafeguardingLeads,
  transitionSafeguarding,
  updateSafeguarding,
  getSafeguardingInvestigation,
  listSafeguardingInvestigators,
  pauseSafeguardingInvestigation,
  resumeSafeguardingInvestigation,
  upsertSafeguardingInvestigation,
} from '@/features/safeguarding/api/safeguarding.api'
import type {
  CreateSafeguardingInput,
  ListSafeguardingParams,
  TransitionInput,
  UpdateSafeguardingInput,
  UpsertSafeguardingInvestigationInput,
} from '@/features/safeguarding/types/safeguarding.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

export function useSafeguardingList(params?: ListSafeguardingParams, enabled = true) {
  return useQuery({
    queryKey: safeguardingKeys.list(params),
    queryFn: () => listSafeguarding(params),
    enabled,
  })
}

export function useSafeguardingSummary(locationId?: string, enabled = true) {
  return useQuery({
    queryKey: safeguardingKeys.summary(locationId),
    queryFn: () => getSafeguardingSummary(locationId),
    enabled,
  })
}

export function useSafeguardingLeads(enabled = true) {
  return useQuery({
    queryKey: safeguardingKeys.leads(),
    queryFn: () => listSafeguardingLeads(),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSafeguardingCase(id: string | undefined) {
  return useQuery({
    queryKey: safeguardingKeys.detail(id ?? ''),
    queryFn: () => getSafeguarding(id as string),
    enabled: !!id,
  })
}

function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: safeguardingKeys.all })
}

export function useCreateSafeguarding() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: CreateSafeguardingInput) => createSafeguarding(body),
    onSuccess: invalidate,
  })
}

export function useUpdateSafeguarding(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: UpdateSafeguardingInput) => updateSafeguarding(id, body),
    onSuccess: invalidate,
  })
}

export function useTransitionSafeguarding(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: TransitionInput) => transitionSafeguarding(id, body),
    onSuccess: invalidate,
  })
}

export function useSafeguardingInvestigation(id: string) {
  return useQuery({
    queryKey: safeguardingKeys.investigation(id),
    queryFn: () => getSafeguardingInvestigation(id),
  })
}

/** Eligible lead investigators (only fetched while the set-up can be edited). */
export function useSafeguardingInvestigators(enabled: boolean) {
  return useQuery({
    queryKey: safeguardingKeys.investigators(),
    queryFn: () => listSafeguardingInvestigators(),
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useUpsertSafeguardingInvestigation(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: UpsertSafeguardingInvestigationInput) => upsertSafeguardingInvestigation(id, body),
    onSuccess: (_data, body) => {
      toastSuccess(body.markComplete ? 'Investigation completed' : 'Investigation saved')
      void invalidate()
    },
    onError: e => toastApiError(e),
  })
}

export function usePauseSafeguardingInvestigation(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: { reason: string; nextReviewDate: string }) => pauseSafeguardingInvestigation(id, body),
    onSuccess: () => {
      toastSuccess('Investigation paused')
      void invalidate()
    },
    onError: e => toastApiError(e),
  })
}

export function useResumeSafeguardingInvestigation(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: () => resumeSafeguardingInvestigation(id),
    onSuccess: () => {
      toastSuccess('Investigation resumed')
      void invalidate()
    },
    onError: e => toastApiError(e),
  })
}

export function useAddSafeguardingNote(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (note: string) => addSafeguardingNote(id, note),
    onSuccess: invalidate,
  })
}
