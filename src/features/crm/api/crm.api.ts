import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateEnquiryInput,
  Enquiry,
  EnquiryDuplicates,
  EnquiryOwner,
  FundingTypeOption,
  EnquirySummary,
  ListEnquiriesParams,
  MoveEnquiryInput,
  UpdateEnquiryInput,
} from '@/features/crm/types/crm.types'

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return ''
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

export async function listEnquiries(params?: ListEnquiriesParams): Promise<Enquiry[]> {
  return data<Enquiry[]>(`/crm/enquiries${buildQuery(params)}`, { method: 'GET' })
}

export async function getEnquirySummary(locationId?: string): Promise<EnquirySummary> {
  return data<EnquirySummary>(`/crm/enquiries/summary${buildQuery({ locationId })}`, { method: 'GET' })
}

export type DuplicateQuery = {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  phone?: string
  excludeId?: string
}

export async function fetchEnquiryDuplicates(q: DuplicateQuery): Promise<EnquiryDuplicates> {
  return data<EnquiryDuplicates>(`/crm/enquiries/duplicates${buildQuery(q)}`, { method: 'GET' })
}

export async function linkEnquiryServiceUser(enquiryId: string, serviceUserId: string): Promise<Enquiry> {
  return data<Enquiry>(`/crm/enquiries/${enquiryId}/link-service-user`, {
    method: 'POST',
    body: JSON.stringify({ serviceUserId }),
  })
}

export async function fetchEnquiryOwners(): Promise<EnquiryOwner[]> {
  return data<EnquiryOwner[]>('/crm/enquiries/owners', { method: 'GET' })
}

export async function fetchEnquiryFundingTypes(): Promise<FundingTypeOption[]> {
  return data<FundingTypeOption[]>('/crm/enquiries/funding-types', { method: 'GET' })
}

export async function getEnquiry(id: string): Promise<Enquiry> {
  return data<Enquiry>(`/crm/enquiries/${id}`, { method: 'GET' })
}

export async function createEnquiry(body: CreateEnquiryInput): Promise<Enquiry> {
  return data<Enquiry>('/crm/enquiries', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateEnquiry(id: string, body: UpdateEnquiryInput): Promise<Enquiry> {
  return data<Enquiry>(`/crm/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function moveEnquiry(id: string, body: MoveEnquiryInput): Promise<Enquiry> {
  return data<Enquiry>(`/crm/enquiries/${id}/move`, { method: 'POST', body: JSON.stringify(body) })
}

export async function addEnquiryNote(id: string, note: string): Promise<Enquiry> {
  return data<Enquiry>(`/crm/enquiries/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}
