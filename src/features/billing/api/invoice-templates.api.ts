import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  InvoiceTemplate,
  InvoiceTemplateInput,
  InvoiceTemplateResolveResult,
  InvoiceTemplateSystemField,
  InvoiceTemplateValidationResult,
} from '@/features/billing/types/invoice-templates.types'

export async function fetchInvoiceTemplates(params?: {
  search?: string
  status?: string
  templateType?: string
  funderId?: string
}): Promise<InvoiceTemplate[]> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.status) qs.set('status', params.status)
  if (params?.templateType) qs.set('templateType', params.templateType)
  if (params?.funderId) qs.set('funderId', params.funderId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<InvoiceTemplate[]>>(`/billing/invoice-templates${suffix}`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchInvoiceTemplate(id: string): Promise<InvoiceTemplate> {
  const res = await apiJson<ApiEnvelope<InvoiceTemplate>>(`/billing/invoice-templates/${id}`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchInvoiceTemplateSystemFields(): Promise<InvoiceTemplateSystemField[]> {
  const res = await apiJson<ApiEnvelope<InvoiceTemplateSystemField[]>>(
    '/billing/invoice-templates/system-fields',
    { method: 'GET' },
  )
  return res.data
}

export async function createInvoiceTemplate(body: InvoiceTemplateInput): Promise<InvoiceTemplate> {
  const res = await apiJson<ApiEnvelope<InvoiceTemplate>>('/billing/invoice-templates', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateInvoiceTemplate(
  id: string,
  body: Partial<InvoiceTemplateInput>,
): Promise<InvoiceTemplate> {
  const res = await apiJson<ApiEnvelope<InvoiceTemplate>>(`/billing/invoice-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteInvoiceTemplate(id: string): Promise<void> {
  await apiJson(`/billing/invoice-templates/${id}`, { method: 'DELETE' })
}

export async function resolveServiceUserInvoiceTemplate(
  serviceUserId: string,
  fundingId?: string,
): Promise<InvoiceTemplateResolveResult> {
  const qs = fundingId ? `?fundingId=${encodeURIComponent(fundingId)}` : ''
  const res = await apiJson<ApiEnvelope<InvoiceTemplateResolveResult>>(
    `/billing/invoice-templates/resolve/${serviceUserId}${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function validateInvoiceTemplate(
  templateId: string,
  body: { serviceUserId: string; fundingId?: string },
): Promise<InvoiceTemplateValidationResult> {
  const res = await apiJson<ApiEnvelope<InvoiceTemplateValidationResult>>(
    `/billing/invoice-templates/${templateId}/validate`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function fetchFundingContractOptions(search?: string): Promise<
  Array<{ id: string; label: string; serviceUserId: string }>
> {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  const res = await apiJson<ApiEnvelope<Array<{ id: string; label: string; serviceUserId: string }>>>(
    `/billing/invoice-templates/funding-contract-options${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchInvoiceTemplatesSummary(): Promise<{
  total: number
  active: number
  fundersMissingDefaultTemplate: number
  hasOrganisationDefault: boolean
}> {
  const res = await apiJson<
    ApiEnvelope<{
      total: number
      active: number
      fundersMissingDefaultTemplate: number
      hasOrganisationDefault: boolean
    }>
  >('/billing/invoice-templates/summary', { method: 'GET' })
  return res.data
}
