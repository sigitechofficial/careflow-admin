import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addReferralFollowUp,
  addReferralNote,
  changeQuotationStatus,
  changeReferralStatus,
  createQuotation,
  createReferral,
  fetchQuotation,
  fetchQuotations,
  fetchReferral,
  fetchReferralHistory,
  fetchReferrals,
  reviseQuotation,
  updateQuotation,
  updateReferral,
  type QuotationDetail,
  type QuotationPayload,
  type QuotationStatusPayload,
  type ReferralDetail,
  type ReferralPayload,
  type ReferralStatus,
} from '@/features/service-users/referrals/referrals.api'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  downloadServiceUserDocumentRecord,
  fetchServiceUserDocumentTypes,
  uploadServiceUserDocumentRecord,
  type CreateServiceUserDocumentRecordPayload,
} from '@/features/service-users/documents/service-user-document-store.api'

export const referralKeys = {
  all: (suId: string) => [...serviceUserKeys.detail(suId), 'referrals'] as const,
  list: (suId: string) => [...referralKeys.all(suId), 'list'] as const,
  detail: (suId: string, id: string) => [...referralKeys.all(suId), 'detail', id] as const,
  history: (suId: string) => [...referralKeys.all(suId), 'history'] as const,
  quotations: (suId: string) => [...referralKeys.all(suId), 'quotations'] as const,
  quotation: (suId: string, id: string) => [...referralKeys.all(suId), 'quotation', id] as const,
}

export function useReferrals(serviceUserId: string) {
  return useQuery({ queryKey: referralKeys.list(serviceUserId), queryFn: () => fetchReferrals(serviceUserId) })
}

export function useReferral(serviceUserId: string, referralId: string | null) {
  return useQuery({
    queryKey: referralKeys.detail(serviceUserId, referralId ?? ''),
    queryFn: () => fetchReferral(serviceUserId, referralId!),
    enabled: Boolean(referralId),
  })
}

export function useReferralHistory(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: referralKeys.history(serviceUserId),
    queryFn: () => fetchReferralHistory(serviceUserId),
    enabled,
  })
}

export function useQuotations(serviceUserId: string) {
  return useQuery({ queryKey: referralKeys.quotations(serviceUserId), queryFn: () => fetchQuotations(serviceUserId) })
}

export function useQuotation(serviceUserId: string, quotationId: string | null) {
  return useQuery({
    queryKey: referralKeys.quotation(serviceUserId, quotationId ?? ''),
    queryFn: () => fetchQuotation(serviceUserId, quotationId!),
    enabled: Boolean(quotationId),
  })
}

/** Every write refreshes the referral area (lists, history, linked quotes) for this service user. */
function useOnWrite(serviceUserId: string) {
  const qc = useQueryClient()
  return (detail?: ReferralDetail | QuotationDetail) => {
    if (detail && 'events' in detail && 'sourceType' in detail) {
      qc.setQueryData(referralKeys.detail(serviceUserId, detail.id), detail)
    } else if (detail && 'revisions' in detail) {
      qc.setQueryData(referralKeys.quotation(serviceUserId, detail.id), detail)
    }
    void qc.invalidateQueries({ queryKey: referralKeys.all(serviceUserId) })
  }
}

export function useReferralMutations(serviceUserId: string) {
  const onWrite = useOnWrite(serviceUserId)
  return {
    create: useMutation({
      mutationFn: (body: ReferralPayload) => createReferral(serviceUserId, body),
      onSuccess: onWrite,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<ReferralPayload> }) =>
        updateReferral(serviceUserId, id, body),
      onSuccess: onWrite,
    }),
    status: useMutation({
      mutationFn: ({ id, status, reason }: { id: string; status: ReferralStatus; reason?: string }) =>
        changeReferralStatus(serviceUserId, id, { status, reason }),
      onSuccess: onWrite,
    }),
    followUp: useMutation({
      mutationFn: ({ id, note, nextFollowUpAt }: { id: string; note: string; nextFollowUpAt?: string | null }) =>
        addReferralFollowUp(serviceUserId, id, { note, nextFollowUpAt }),
      onSuccess: onWrite,
    }),
    note: useMutation({
      mutationFn: ({ id, note }: { id: string; note: string }) => addReferralNote(serviceUserId, id, note),
      onSuccess: onWrite,
    }),
  }
}

export function useQuotationMutations(serviceUserId: string) {
  const onWrite = useOnWrite(serviceUserId)
  return {
    create: useMutation({
      mutationFn: (body: QuotationPayload) => createQuotation(serviceUserId, body),
      onSuccess: onWrite,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: QuotationPayload }) => updateQuotation(serviceUserId, id, body),
      onSuccess: onWrite,
    }),
    status: useMutation({
      mutationFn: ({ id, body }: { id: string; body: QuotationStatusPayload }) =>
        changeQuotationStatus(serviceUserId, id, body),
      onSuccess: onWrite,
    }),
    revise: useMutation({
      mutationFn: ({ id, note }: { id: string; note?: string }) => reviseQuotation(serviceUserId, id, note),
      onSuccess: onWrite,
    }),
  }
}

/** Create a referral right after a new service user is saved (Add Service User page). */
export function useCreateReferralFor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceUserId, body }: { serviceUserId: string; body: ReferralPayload }) =>
      createReferral(serviceUserId, body),
    onSuccess: (_d, { serviceUserId }) => void qc.invalidateQueries({ queryKey: referralKeys.all(serviceUserId) }),
  })
}

// ---------------------------------------------------------------- linked documents (existing document store)

export const REFERRAL_DOCUMENT_LINK = 'SERVICE_USER_REFERRAL'
export const QUOTATION_DOCUMENT_LINK = 'CARE_QUOTATION'

export function useServiceUserDocumentTypes(enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.all(), 'document-types'] as const,
    queryFn: () => fetchServiceUserDocumentTypes(),
    enabled,
    staleTime: 5 * 60_000,
  })
}

/** Upload into the service user's document store, linked to a referral or quotation. */
export function useUploadLinkedDocument(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateServiceUserDocumentRecordPayload) =>
      uploadServiceUserDocumentRecord(serviceUserId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: referralKeys.all(serviceUserId) })
      void qc.invalidateQueries({ queryKey: serviceUserKeys.documentStore(serviceUserId) })
    },
  })
}

export function downloadLinkedDocument(serviceUserId: string, documentId: string, fallbackName?: string) {
  return downloadServiceUserDocumentRecord(serviceUserId, documentId, fallbackName)
}
