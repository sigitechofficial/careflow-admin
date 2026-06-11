import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAllergyCatalog,
  createBodyMapRecordType,
  createComplianceType,
  createLookupItem,
  createServiceUserCareType,
  createServiceUserEthnicity,
  createServiceUserFundingType,
  createServiceUserLanguage,
  deleteAllergyCatalog,
  deleteBodyMapRecordType,
  deleteComplianceType,
  deleteLookupItem,
  deleteServiceUserCareType,
  deleteServiceUserEthnicity,
  deleteServiceUserFundingType,
  deleteServiceUserLanguage,
  fetchAllergyCatalogList,
  fetchBodyMapRecordTypesList,
  fetchComplianceTypesList,
  fetchLookupList,
  fetchServiceUserCareTypesList,
  fetchServiceUserEthnicitiesList,
  fetchServiceUserFundingTypesList,
  fetchServiceUserLanguagesList,
  fetchVitalAcceptedRangesCatalog,
  updateAllergyCatalog,
  updateBodyMapRecordType,
  updateComplianceType,
  updateLookupItem,
  updateServiceUserCareType,
  updateServiceUserEthnicity,
  updateServiceUserFundingType,
  updateServiceUserLanguage,
  updateVitalAcceptedRangeCatalog,
  type ComplianceCategory,
  type LookupResource,
} from '@/features/settings/api/lookups-admin-api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { serviceUserKeys } from '@/features/service-users/keys'
import { settingsKeys } from '@/features/settings/keys'
import { vitalAcceptedRangeLookupKey } from '@/features/service-users/initial-assessment/hooks/useVitalAcceptedRangeLookup'

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
  void qc.invalidateQueries({ queryKey: settingsKeys.serviceUserCareTypes() })
  void qc.invalidateQueries({ queryKey: settingsKeys.serviceUserFundingTypes() })
  void qc.invalidateQueries({ queryKey: settingsKeys.serviceUserEthnicities() })
  void qc.invalidateQueries({ queryKey: settingsKeys.serviceUserLanguages() })
  void qc.invalidateQueries({ queryKey: settingsKeys.allergyCatalog() })
  void qc.invalidateQueries({ queryKey: serviceUserKeys.lookups() })
}

export function useServiceUserCareTypes(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.serviceUserCareTypes(),
    queryFn: () => fetchServiceUserCareTypesList(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateServiceUserCareType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; code: string }) => createServiceUserCareType(body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useUpdateServiceUserCareType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; code?: string } }) =>
      updateServiceUserCareType(id, body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useDeleteServiceUserCareType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteServiceUserCareType(id),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
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

export function useServiceUserEthnicities(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.serviceUserEthnicities(),
    queryFn: () => fetchServiceUserEthnicitiesList(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateServiceUserEthnicity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; code: string }) => createServiceUserEthnicity(body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useUpdateServiceUserEthnicity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; code?: string } }) =>
      updateServiceUserEthnicity(id, body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useDeleteServiceUserEthnicity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteServiceUserEthnicity(id),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useServiceUserLanguages(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.serviceUserLanguages(),
    queryFn: () => fetchServiceUserLanguagesList(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateServiceUserLanguage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; code: string }) => createServiceUserLanguage(body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useUpdateServiceUserLanguage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; code?: string } }) =>
      updateServiceUserLanguage(id, body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useDeleteServiceUserLanguage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteServiceUserLanguage(id),
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
      markerColorHex?: string
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
        markerColorHex?: string
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

export function useAllergyCatalog(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.allergyCatalog(),
    queryFn: () => fetchAllergyCatalogList(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateAllergyCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      code: string
      category?: import('@/features/settings/api/lookups-admin-api').AllergyCatalogCategory
      sortOrder?: number
    }) => createAllergyCatalog(body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useUpdateAllergyCatalog() {
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
        category?: import('@/features/settings/api/lookups-admin-api').AllergyCatalogCategory
        sortOrder?: number
      }
    }) => updateAllergyCatalog(id, body),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useDeleteAllergyCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAllergyCatalog(id),
    onSuccess: () => invalidateServiceUserLookupCaches(qc),
  })
}

export function useVitalAcceptedRangesCatalog(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.vitalAcceptedRanges(),
    queryFn: () => fetchVitalAcceptedRangesCatalog(),
    enabled,
    staleTime: 30_000,
  })
}

export function useUpdateVitalAcceptedRangeCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { min?: number; max?: number }
    }) => updateVitalAcceptedRangeCatalog(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.vitalAcceptedRanges() })
      void qc.invalidateQueries({ queryKey: vitalAcceptedRangeLookupKey })
    },
  })
}
