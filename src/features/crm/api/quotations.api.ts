import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  ClientQuoteView,
  CreateFollowUpInput,
  EnquiryQuotations,
  QuoteDiff,
  QuoteDraftInput,
  QuotePricingPreview,
  QuoteVersionDetail,
  ReconcileLegacyInput,
  RecordResponseInput,
  SendQuoteInput,
  UpdateFollowUpInput,
} from '@/features/crm/types/quotation.types'

async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

const base = (enquiryId: string) => `/crm/enquiries/${enquiryId}`
const version = (enquiryId: string, quotationId: string, versionId: string) =>
  `${base(enquiryId)}/quotations/${quotationId}/versions/${versionId}`
const post = (body?: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body ?? {}) })

export const fetchEnquiryQuotations = (enquiryId: string) =>
  data<EnquiryQuotations>(`${base(enquiryId)}/quotations`, { method: 'GET' })

export const createQuotation = (enquiryId: string, body: QuoteDraftInput) =>
  data<QuoteVersionDetail>(`${base(enquiryId)}/quotations`, post(body))

export const previewQuotePricing = (enquiryId: string, body: QuoteDraftInput) =>
  data<QuotePricingPreview>(`${base(enquiryId)}/quotations/pricing-preview`, post(body))

export const fetchQuoteVersion = (enquiryId: string, quotationId: string, versionId: string) =>
  data<QuoteVersionDetail>(version(enquiryId, quotationId, versionId), { method: 'GET' })

export const updateQuoteDraft = (enquiryId: string, quotationId: string, versionId: string, body: QuoteDraftInput) =>
  data<QuoteVersionDetail>(version(enquiryId, quotationId, versionId), { method: 'PATCH', body: JSON.stringify(body) })

export type QuoteAction = 'submit' | 'approve' | 'reject-approval' | 'cancel' | 'revise' | 'agreement'

export const runQuoteAction = (enquiryId: string, quotationId: string, versionId: string, action: QuoteAction, note?: string) =>
  data<QuoteVersionDetail>(
    `${version(enquiryId, quotationId, versionId)}/${action}`,
    post(action === 'submit' || action === 'revise' ? {} : { note }),
  )

export const sendQuote = (enquiryId: string, quotationId: string, versionId: string, body: SendQuoteInput) =>
  data<QuoteVersionDetail>(`${version(enquiryId, quotationId, versionId)}/send`, post(body))

export const retryQuoteEmail = (enquiryId: string, quotationId: string, communicationId: string) =>
  data<QuoteVersionDetail>(`${base(enquiryId)}/quotations/${quotationId}/communications/${communicationId}/retry`, post())

export const recordQuoteResponse = (enquiryId: string, quotationId: string, versionId: string, body: RecordResponseInput) =>
  data<QuoteVersionDetail>(`${version(enquiryId, quotationId, versionId)}/responses`, post(body))

/** A funder approved its share of an accepted quote; the price is not changed. */
export const confirmQuoteFunding = (
  enquiryId: string,
  quotationId: string,
  versionId: string,
  fundingId: string,
  body: { reference?: string; note?: string },
) => data<QuoteVersionDetail>(`${version(enquiryId, quotationId, versionId)}/fundings/${fundingId}/confirm`, post(body))

/** After acceptance: make the person an active service user (and, if asked, the draft care package). */
export const createServiceUserFromQuote = (
  enquiryId: string,
  quotationId: string,
  versionId: string,
  body: { createCarePackage: boolean },
) =>
  data<{ serviceUserId: string; created: boolean; carePackage: { created: boolean; error: string | null } }>(
    `${version(enquiryId, quotationId, versionId)}/service-user`,
    post(body),
  )

export const convertQuoteToCarePackage = (enquiryId: string, quotationId: string, versionId: string) =>
  data<{ visitPlanId: string; serviceUserId: string; created: boolean; hasActivePackage?: boolean }>(
    `${version(enquiryId, quotationId, versionId)}/care-package`,
    post(),
  )

export const fetchQuotePreview = (enquiryId: string, quotationId: string, versionId: string) =>
  data<ClientQuoteView>(`${version(enquiryId, quotationId, versionId)}/preview`, { method: 'GET' })

export const fetchQuoteDiff = (enquiryId: string, quotationId: string, versionId: string, withVersionId: string) =>
  data<QuoteDiff>(`${version(enquiryId, quotationId, versionId)}/compare?with=${withVersionId}`, { method: 'GET' })

export const createQuoteFollowUp = (enquiryId: string, quotationId: string, body: CreateFollowUpInput) =>
  data<unknown>(`${base(enquiryId)}/quotations/${quotationId}/follow-ups`, post(body))

export const updateQuoteFollowUp = (enquiryId: string, quotationId: string, followUpId: string, body: UpdateFollowUpInput) =>
  data<unknown>(`${base(enquiryId)}/quotations/${quotationId}/follow-ups/${followUpId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const makeQuotationCurrent = (enquiryId: string, quotationId: string) =>
  data<unknown>(`${base(enquiryId)}/quotations/${quotationId}/current`, post())

export const reconcileLegacyQuote = (enquiryId: string, body: ReconcileLegacyInput) =>
  data<unknown>(`${base(enquiryId)}/legacy-quote/reconcile`, post(body))

/** Client-facing PDF of an issued version (authorised fetch; ids only in the URL). */
export async function downloadQuotePdf(
  enquiryId: string,
  quotationId: string,
  versionId: string,
): Promise<{ blob: Blob; filename: string }> {
  const { getApiBaseUrl } = await import('@/shared/lib/api-base')
  const { useAuthStore } = await import('@/features/auth/store')
  const headers = new Headers()
  const token = useAuthStore.getState().accessToken
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${getApiBaseUrl()}${version(enquiryId, quotationId, versionId)}/pdf`, { method: 'GET', headers })
  if (!res.ok) {
    let message = `Could not download the PDF (${res.status})`
    try {
      const json = JSON.parse(await res.text()) as { message?: string }
      if (json.message) message = json.message
    } catch {
      /* plain text */
    }
    throw new Error(message)
  }
  const match = /filename="([^"]+)"/i.exec(res.headers.get('Content-Disposition') ?? '')
  return { blob: await res.blob(), filename: match?.[1] ?? 'quotation.pdf' }
}
