import type {
  ApplicablePoliciesParams,
  PolicyCategoryListParams,
  PolicyListParams,
  PolicyTagListParams,
} from '@/features/policies/types/policy.types'

export const policyKeys = {
  all: ['policies'] as const,
  lists: () => [...policyKeys.all, 'list'] as const,
  list: (params?: PolicyListParams) => [...policyKeys.lists(), params ?? {}] as const,
  applicable: (params?: ApplicablePoliciesParams) => [...policyKeys.all, 'applicable', params ?? {}] as const,
  details: () => [...policyKeys.all, 'detail'] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
  versions: (id: string) => [...policyKeys.all, 'versions', id] as const,
  version: (id: string, versionId: string) => [...policyKeys.all, 'version', id, versionId] as const,
  categories: (params?: PolicyCategoryListParams) => [...policyKeys.all, 'categories', params ?? {}] as const,
  tags: (params?: PolicyTagListParams) => [...policyKeys.all, 'tags', params ?? {}] as const,
}
