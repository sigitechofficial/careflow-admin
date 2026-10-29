import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { crmKeys } from '@/features/crm/keys'
import {
  convertQuoteToCarePackage,
  createQuotation,
  createQuoteFollowUp,
  downloadQuotePdf,
  fetchEnquiryQuotations,
  fetchQuoteDiff,
  fetchQuotePreview,
  fetchQuoteVersion,
  makeQuotationCurrent,
  previewQuotePricing,
  reconcileLegacyQuote,
  recordQuoteResponse,
  retryQuoteEmail,
  runQuoteAction,
  sendQuote,
  updateQuoteDraft,
  updateQuoteFollowUp,
  type QuoteAction,
} from '@/features/crm/api/quotations.api'
import type {
  CreateFollowUpInput,
  QuoteDraftInput,
  ReconcileLegacyInput,
  RecordResponseInput,
  SendQuoteInput,
  UpdateFollowUpInput,
} from '@/features/crm/types/quotation.types'

export type { QuoteAction }

export function useEnquiryQuotations(enquiryId: string | undefined) {
  return useQuery({
    queryKey: crmKeys.quotations(enquiryId ?? ''),
    queryFn: () => fetchEnquiryQuotations(enquiryId!),
    enabled: !!enquiryId,
  })
}

export function useQuoteVersion(enquiryId: string, quotationId: string, versionId: string) {
  return useQuery({
    queryKey: crmKeys.quoteVersion(enquiryId, versionId),
    queryFn: () => fetchQuoteVersion(enquiryId, quotationId, versionId),
    enabled: !!versionId,
  })
}

export function useQuotePreview(enquiryId: string, quotationId: string, versionId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...crmKeys.quoteVersion(enquiryId, versionId), 'preview'],
    queryFn: () => fetchQuotePreview(enquiryId, quotationId, versionId),
    enabled,
  })
}

export function useQuoteDiff(enquiryId: string, quotationId: string, versionId: string, withVersionId: string | null) {
  return useQuery({
    queryKey: [...crmKeys.quoteVersion(enquiryId, versionId), 'diff', withVersionId ?? ''],
    queryFn: () => fetchQuoteDiff(enquiryId, quotationId, versionId, withVersionId!),
    enabled: !!withVersionId,
  })
}

/** Pricing for unsaved editor content (nothing is stored). */
export function useQuotePricingPreview(enquiryId: string) {
  return useMutation({ mutationFn: (body: QuoteDraftInput) => previewQuotePricing(enquiryId, body) })
}

/** Every quote write refreshes the enquiry too (stage, follow-up and timeline change with it). */
function useInvalidateEnquiry() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: crmKeys.all })
}

export function useCreateQuotation(enquiryId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({ mutationFn: (body: QuoteDraftInput) => createQuotation(enquiryId, body), onSuccess: invalidate })
}

export function useUpdateQuoteDraft(enquiryId: string, quotationId: string, versionId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({
    mutationFn: (body: QuoteDraftInput) => updateQuoteDraft(enquiryId, quotationId, versionId, body),
    onSuccess: invalidate,
  })
}

export function useQuoteAction(enquiryId: string, quotationId: string, versionId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({
    mutationFn: ({ action, note }: { action: QuoteAction; note?: string }) =>
      runQuoteAction(enquiryId, quotationId, versionId, action, note),
    onSuccess: invalidate,
  })
}

export function useSendQuote(enquiryId: string, quotationId: string, versionId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({
    mutationFn: (body: SendQuoteInput) => sendQuote(enquiryId, quotationId, versionId, body),
    // A failed email is still recorded, so refresh either way.
    onSettled: invalidate,
  })
}

export function useRetryQuoteEmail(enquiryId: string, quotationId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({
    mutationFn: (communicationId: string) => retryQuoteEmail(enquiryId, quotationId, communicationId),
    onSettled: invalidate,
  })
}

export function useRecordQuoteResponse(enquiryId: string, quotationId: string, versionId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({
    mutationFn: (body: RecordResponseInput) => recordQuoteResponse(enquiryId, quotationId, versionId, body),
    onSuccess: invalidate,
  })
}

export function useConvertQuoteToCarePackage(enquiryId: string, quotationId: string, versionId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({
    mutationFn: () => convertQuoteToCarePackage(enquiryId, quotationId, versionId),
    onSuccess: invalidate,
  })
}

export function useQuoteFollowUps(enquiryId: string, quotationId: string) {
  const invalidate = useInvalidateEnquiry()
  const create = useMutation({
    mutationFn: (body: CreateFollowUpInput) => createQuoteFollowUp(enquiryId, quotationId, body),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFollowUpInput }) =>
      updateQuoteFollowUp(enquiryId, quotationId, id, body),
    onSuccess: invalidate,
  })
  return { create, update }
}

export function useMakeQuotationCurrent(enquiryId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({ mutationFn: (quotationId: string) => makeQuotationCurrent(enquiryId, quotationId), onSuccess: invalidate })
}

export function useReconcileLegacyQuote(enquiryId: string) {
  const invalidate = useInvalidateEnquiry()
  return useMutation({ mutationFn: (body: ReconcileLegacyInput) => reconcileLegacyQuote(enquiryId, body), onSuccess: invalidate })
}

/** Download the client PDF and save it in the browser. */
export function useDownloadQuotePdf(enquiryId: string, quotationId: string, versionId: string) {
  return useMutation({
    mutationFn: async () => {
      const { blob, filename } = await downloadQuotePdf(enquiryId, quotationId, versionId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}
