import type { ListPathwayCasesParams } from '@/features/specialist-pathways/types/specialist-pathway.types'

export const specialistPathwayKeys = {
  all: ['specialist-pathways'] as const,
  lists: () => [...specialistPathwayKeys.all, 'list'] as const,
  list: (params?: ListPathwayCasesParams) =>
    [...specialistPathwayKeys.lists(), params ?? {}] as const,
  summary: (locationId?: string) => [...specialistPathwayKeys.all, 'summary', locationId ?? 'all'] as const,
  details: () => [...specialistPathwayKeys.all, 'detail'] as const,
  detail: (id: string) => [...specialistPathwayKeys.details(), id] as const,
}
