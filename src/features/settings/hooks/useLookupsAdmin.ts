import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createComplianceType,
  createLookupItem,
  deleteComplianceType,
  deleteLookupItem,
  fetchComplianceTypesList,
  fetchLookupList,
  updateComplianceType,
  updateLookupItem,
  type ComplianceCategory,
  type LookupResource,
} from '@/features/settings/api/lookups-admin-api'
import { settingsKeys } from '@/features/settings/keys'

export function useLookupList(resource: LookupResource, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.lookups(resource),
    queryFn: () => fetchLookupList(resource),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateLookupItem(resource: LookupResource) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createLookupItem(resource, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.lookups(resource) })
    },
  })
}

export function useUpdateLookupItem(resource: LookupResource) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateLookupItem(resource, id, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.lookups(resource) })
    },
  })
}

export function useDeleteLookupItem(resource: LookupResource) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLookupItem(resource, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.lookups(resource) })
    },
  })
}

export function useComplianceTypes(
  params?: { search?: string; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: settingsKeys.complianceTypes(params),
    queryFn: () => fetchComplianceTypesList(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateComplianceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      code: string
      category: ComplianceCategory
      isMandatoryByDefault?: boolean
    }) => createComplianceType(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.complianceTypes() })
    },
  })
}

export function useUpdateComplianceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        name?: string
        code?: string
        category?: ComplianceCategory
        isMandatoryByDefault?: boolean
      }
    }) => updateComplianceType(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.complianceTypes() })
    },
  })
}

export function useDeleteComplianceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteComplianceType(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.complianceTypes() })
    },
  })
}
