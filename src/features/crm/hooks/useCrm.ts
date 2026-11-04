import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { crmKeys } from '@/features/crm/keys'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  addEnquiryNote,
  createEnquiry,
  fetchEnquiryDuplicates,
  fetchEnquiryCarePlans,
  fetchEnquiryFundingTypes,
  fetchEnquiryOwners,
  fetchQuoteFunders,
  startEnquiryInitialAssessment,
  createEnquiryPreAdmission,
  getEnquiry,
  getEnquirySummary,
  listEnquiries,
  moveEnquiry,
  updateEnquiry,
  type DuplicateQuery,
} from '@/features/crm/api/crm.api'
import type {
  CreateEnquiryInput,
  ListEnquiriesParams,
  MoveEnquiryInput,
  UpdateEnquiryInput,
} from '@/features/crm/types/crm.types'

export function useEnquiries(params?: ListEnquiriesParams) {
  return useQuery({ queryKey: crmKeys.list(params), queryFn: () => listEnquiries(params) })
}

export function useEnquirySummary(locationId?: string) {
  return useQuery({
    queryKey: crmKeys.summary(locationId),
    queryFn: () => getEnquirySummary(locationId),
  })
}

/** Possible duplicates for the person being entered; runs only when there is enough to match on. */
export function useEnquiryDuplicates(q: DuplicateQuery, enabled: boolean) {
  return useQuery({
    queryKey: crmKeys.duplicates(q),
    queryFn: () => fetchEnquiryDuplicates(q),
    enabled,
    staleTime: 30_000,
  })
}

export function useEnquiryOwners() {
  return useQuery({
    queryKey: crmKeys.owners(),
    queryFn: () => fetchEnquiryOwners(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEnquiryCarePlans() {
  return useQuery({
    queryKey: crmKeys.carePlans(),
    queryFn: () => fetchEnquiryCarePlans(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useEnquiryFundingTypes() {
  return useQuery({
    queryKey: crmKeys.fundingTypes(),
    queryFn: () => fetchEnquiryFundingTypes(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useQuoteFunders() {
  return useQuery({
    queryKey: crmKeys.funders(),
    queryFn: () => fetchQuoteFunders(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useEnquiry(id: string | undefined) {
  return useQuery({
    queryKey: crmKeys.detail(id ?? ''),
    queryFn: () => getEnquiry(id as string),
    enabled: !!id,
  })
}

function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: crmKeys.all })
}

export function useCreateEnquiry() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: CreateEnquiryInput) => createEnquiry(body),
    onSuccess: invalidate,
  })
}

export function useUpdateEnquiry(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: UpdateEnquiryInput) => updateEnquiry(id, body),
    onSuccess: invalidate,
  })
}

export function useMoveEnquiry(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (body: MoveEnquiryInput) => moveEnquiry(id, body),
    onSuccess: invalidate,
  })
}

/** Move any enquiry (the board drags cards between stage columns). */
export function useMoveAnyEnquiry() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, ...body }: MoveEnquiryInput & { id: string }) => moveEnquiry(id, body),
    onSettled: invalidate,
  })
}

export function useStartEnquiryInitialAssessment(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: () => startEnquiryInitialAssessment(id),
    onSuccess: invalidate,
  })
}

export function useCreateEnquiryPreAdmission(id: string) {
  const invalidate = useInvalidateAll()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createEnquiryPreAdmission(id),
    // A new service user: the service user lists refresh too.
    onSuccess: () => Promise.all([invalidate(), qc.invalidateQueries({ queryKey: serviceUserKeys.all() })]),
  })
}

export function useAddEnquiryNote(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (note: string) => addEnquiryNote(id, note),
    onSuccess: invalidate,
  })
}
