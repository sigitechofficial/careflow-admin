export const POLICY_PATHS = {
  root: '/policies',
  library: '/policies',
  create: '/policies/new',
  detail: '/policies/$policyId',
  edit: '/policies/$policyId/edit',
  categories: '/policies/categories',
  tags: '/policies/tags',
  readyMade: '/policies/ready-made',
  mine: '/policies/mine',
} as const

export type PolicyLibrarySearch = {
  page?: number
  search?: string
  status?: string
  categoryId?: string
  owner?: 'mine'
  reviewDateFrom?: string
  reviewDateTo?: string
  locationId?: string
  serviceTypeCode?: string
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function validatePolicyLibrarySearch(raw: Record<string, unknown>): PolicyLibrarySearch {
  const out: PolicyLibrarySearch = {}
  const page = typeof raw.page === 'number' ? raw.page : Number(raw.page)
  if (Number.isInteger(page) && page > 1) out.page = page
  const search = asTrimmedString(raw.search)
  if (search) out.search = search
  const status = asTrimmedString(raw.status)
  if (status) out.status = status
  const categoryId = asTrimmedString(raw.categoryId)
  if (categoryId) out.categoryId = categoryId
  if (raw.owner === 'mine') out.owner = 'mine'
  const reviewDateFrom = asTrimmedString(raw.reviewDateFrom)
  if (reviewDateFrom) out.reviewDateFrom = reviewDateFrom
  const reviewDateTo = asTrimmedString(raw.reviewDateTo)
  if (reviewDateTo) out.reviewDateTo = reviewDateTo
  const locationId = asTrimmedString(raw.locationId)
  if (locationId) out.locationId = locationId
  const serviceTypeCode = asTrimmedString(raw.serviceTypeCode)
  if (serviceTypeCode) out.serviceTypeCode = serviceTypeCode
  return out
}
