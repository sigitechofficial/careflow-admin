import type { ListSafeguardingParams } from '@/features/safeguarding/types/safeguarding.types'

export const safeguardingKeys = {
  all: ['safeguarding'] as const,
  lists: () => [...safeguardingKeys.all, 'list'] as const,
  list: (params?: ListSafeguardingParams) => [...safeguardingKeys.lists(), params ?? {}] as const,
  summary: (locationId?: string) => [...safeguardingKeys.all, 'summary', locationId ?? 'all'] as const,
  leads: () => [...safeguardingKeys.all, 'leads'] as const,
  details: () => [...safeguardingKeys.all, 'detail'] as const,
  detail: (id: string) => [...safeguardingKeys.details(), id] as const,
  investigation: (id: string) => [...safeguardingKeys.all, 'investigation', id] as const,
  investigators: () => [...safeguardingKeys.all, 'investigators'] as const,
}
