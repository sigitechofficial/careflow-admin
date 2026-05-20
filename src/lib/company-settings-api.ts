import { useAuthStore } from '@/store/auth.store'
import { apiJson, type ApiEnvelope } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'

export type CompanyModuleCatalogItem = {
  id: string
  label: string
  description: string
}

export type CompanyBranding = {
  displayName: string
  groupName: string | null
  displayLogoUrl: string | null
  companyLogoUrl: string | null
  updatedAt: string
}

function unwrapProfile(body: unknown): CompanyProfile {
  if (!body || typeof body !== 'object') {
    throw new ApiError('Invalid company profile response', 0)
  }
  const o = body as Record<string, unknown>
  if (o.data && typeof o.data === 'object' && o.data !== null && 'companyName' in (o.data as object)) {
    return o.data as CompanyProfile
  }
  if ('companyName' in o) {
    return o as CompanyProfile
  }
  throw new ApiError('Invalid company profile response', 0)
}

export type CompanyProfile = {
  id: string
  groupName: string | null
  companyName: string
  odsCsCode: string
  displayName: string
  displayLogoUrl: string | null
  displayLogoFileName: string | null
  companyLogoUrl: string | null
  companyLogoFileName: string | null
  companyWebsite: string | null
  contactName: string
  email: string
  phoneNumber: string
  companyNumber: string | null
  vatNumber: string | null
  bankName: string | null
  bankSortCode: string | null
  bankAccountNumber: string | null
  numberOfCarers: number
  numberOfServiceUsers: number
  activeModules: string[]
  availableModules: string[]
  moduleCatalog: CompanyModuleCatalogItem[]
  updatedAt: string
}

export type UpdateCompanyProfilePayload = {
  groupName?: string
  companyName?: string
  odsCsCode?: string
  displayName?: string
  companyWebsite?: string
  contactName?: string
  email?: string
  phoneNumber?: string
  companyNumber?: string
  vatNumber?: string
  bankName?: string
  bankSortCode?: string
  bankAccountNumber?: string
  activeModules?: string[]
}

export async function fetchCompanyBranding(): Promise<CompanyBranding> {
  const res = await apiJson<ApiEnvelope<CompanyBranding>>('/settings/company/branding', { method: 'GET' })
  return res.data
}

export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  const body = await apiJson<ApiEnvelope<CompanyProfile>>('/settings/company', { method: 'GET' })
  return unwrapProfile(body)
}

export async function updateCompanyProfile(payload: UpdateCompanyProfilePayload): Promise<CompanyProfile> {
  const body = await apiJson<ApiEnvelope<CompanyProfile>>('/settings/company', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return unwrapProfile(body)
}

async function uploadLogo(path: 'display-logo' | 'company-logo', file: File): Promise<CompanyProfile> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${base}/settings/company/${path}`, { method: 'POST', headers, body: form })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, body)
  }
  return unwrapProfile(body)
}

export function uploadDisplayLogo(file: File) {
  return uploadLogo('display-logo', file)
}

export function uploadCompanyLogo(file: File) {
  return uploadLogo('company-logo', file)
}

export async function clearDisplayLogo(): Promise<CompanyProfile> {
  const body = await apiJson<ApiEnvelope<CompanyProfile>>('/settings/company/display-logo', {
    method: 'DELETE',
  })
  return unwrapProfile(body)
}
