import type { ListEnquiriesParams } from '@/features/crm/types/crm.types'

export const crmKeys = {
  all: ['crm-enquiries'] as const,
  lists: () => [...crmKeys.all, 'list'] as const,
  list: (params?: ListEnquiriesParams) => [...crmKeys.lists(), params ?? {}] as const,
  summary: (locationId?: string) => [...crmKeys.all, 'summary', locationId ?? 'all'] as const,
  duplicates: (q: Record<string, string | undefined>) => [...crmKeys.all, 'duplicates', q] as const,
  owners: () => [...crmKeys.all, 'owners'] as const,
  fundingTypes: () => [...crmKeys.all, 'funding-types'] as const,
  funders: () => [...crmKeys.all, 'funders'] as const,
  carePlans: () => [...crmKeys.all, 'care-plans'] as const,
  details: () => [...crmKeys.all, 'detail'] as const,
  detail: (id: string) => [...crmKeys.details(), id] as const,
  quotations: (enquiryId: string) => [...crmKeys.all, 'quotations', enquiryId] as const,
  quoteVersion: (enquiryId: string, versionId: string) =>
    [...crmKeys.quotations(enquiryId), 'version', versionId] as const,
}
