import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBodyMapRecordType,
  createComplianceType,
  createLookupItem,
  createServiceUserFundingType,
  deleteBodyMapRecordType,
  deleteComplianceType,
  deleteLookupItem,
  deleteServiceUserFundingType,
  fetchBodyMapRecordTypesList,
  fetchComplianceTypesList,
  fetchLookupList,
  fetchServiceUserFundingTypesList,
  updateBodyMapRecordType,
  updateComplianceType,
  updateLookupItem,
  updateServiceUserFundingType,
  type ComplianceCategory,
  type LookupResource,
} from '@/features/settings/api/lookups-admin-api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { serviceUserKeys } from '@/features/service-users/keys'
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

function invalidateServiceUserLookupCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: settingsKeys.serviceUserFundingTypes() })
  void qc.invalidateQueries({ queryKey: serviceUserKeys.lookups() })
}

function invalidateBodyMapLookupCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: settingsKeys.bodyMapRecordTypes() })
  void qc.invalidateQueries({ queryKey: bodyMapKeys.lookups() })
}

export function useServiceUserFundingTypes(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.serviceUserFundingTypes(),
    queryFn: () => fetchServiceUserFundingTypesList(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateServiceUserFundingType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; code: string }) => createServiceUserFundingType(body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useUpdateServiceUserFundingType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; code?: string } }) =>
      updateServiceUserFundingType(id, body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useDeleteServiceUserFundingType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteServiceUserFundingType(id),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useBodyMapRecordTypes(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.bodyMapRecordTypes(),
    queryFn: () => fetchBodyMapRecordTypesList(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateBodyMapRecordType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      code: string
      parentId?: string
      sortOrder?: number
      initialAssessmentWoundType?: boolean
    }) => createBodyMapRecordType(body),
    onSuccess: () => invalidateBodyMapLookupCaches(qc),
  })
}

export function useUpdateBodyMapRecordType() {
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
        sortOrder?: number
        initialAssessmentWoundType?: boolean
      }
    }) => updateBodyMapRecordType(id, body),
    onSuccess: () => invalidateBodyMapLookupCaches(qc),
  })
}

export function useDeleteBodyMapRecordType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBodyMapRecordType(id),
    onSuccess: () => invalidateBodyMapLookupCaches(qc),
  })
}
