import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type FundingContractReadiness = 'READY' | 'INCOMPLETE' | 'ENDED' | 'NO_FUNDING'

export type FundingContractRow = {
  id: string
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  funders: string
  packageRef: string | null
  poNumber: string | null
  poExpiresAt: string | null
  authorisedHours: string | null
  billingContact: string | null
  effectiveFrom: string | null
  status: FundingContractReadiness
  readinessIssues: string[]
  fundingLineCount: number
}

export type FundingContractsSummary = {
  activeServiceUsers: number
  serviceUsersWithFunding: number
  ready: number
  incomplete: number
  ended: number
  missingFundingContracts: number
}

export type FundingContractsListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export async function fetchFundingContracts(params?: {
  search?: string
  readiness?: FundingContractReadiness | 'ALL'
  page?: number
  limit?: number
}): Promise<{ rows: FundingContractRow[]; meta: FundingContractsListMeta }> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.readiness && params.readiness !== 'ALL') qs.set('readiness', params.readiness)
  if (params?.page != null) qs.set('page', String(params.page))
  if (params?.limit != null) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<FundingContractRow[]>>(`/billing/funding-contracts${suffix}`, {
    method: 'GET',
  })
  const meta = (res.meta ?? {}) as Partial<FundingContractsListMeta>
  return {
    rows: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 50,
      total: meta.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage,
      hasPrevPage: meta.hasPrevPage,
    },
  }
}

export async function fetchFundingContractsSummary(): Promise<FundingContractsSummary> {
  const res = await apiJson<ApiEnvelope<FundingContractsSummary>>('/billing/funding-contracts/summary', {
    method: 'GET',
  })
  return res.data
}
