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
  fetchWelfareOutcomes,
  createWelfareOutcome,
  updateWelfareOutcome,
  deleteWelfareOutcome,
  type WelfareOutcomeTone,
  fetchEmergencyProtocols,
  createEmergencyProtocol,
  updateEmergencyProtocol,
  deleteEmergencyProtocol,
  fetchClockInArrivalReasons,
  createClockInArrivalReason,
  updateClockInArrivalReason,
  deleteClockInArrivalReason,
  type ClockInArrivalKind,
  fetchManualAuthorisationReasons,
  createManualAuthorisationReason,
  updateManualAuthorisationReason,
  deleteManualAuthorisationReason,
  fetchLeftAreaAllowReasons,
  createLeftAreaAllowReason,
  updateLeftAreaAllowReason,
  deleteLeftAreaAllowReason,
  fetchClockOutEndReasons,
  createClockOutEndReason,
  updateClockOutEndReason,
  deleteClockOutEndReason,
  type ClockOutEndKind,
  fetchVisitOutcomes,
  createVisitOutcomeReason,
  updateVisitOutcomeReason,
  deleteVisitOutcomeReason,
  deleteServiceUserEthnicity,
  deleteServiceUserFundingType,
  deleteServiceUserLanguage,
  fetchAllergyCatalogList,
  fetchBodyMapRecordTypesList,
  fetchComplianceTypesList,
  fetchLookupList,
  fetchLookupListWithInterval,
  fetchServiceUserCareTypesList,
  fetchServiceUserEthnicitiesList,
  fetchServiceUserFundingTypesList,
  fetchServiceUserLanguagesList,
  fetchVitalAcceptedRangesCatalog,
  updateAllergyCatalog,
  updateBodyMapRecordType,
  updateComplianceType,
  updateLookupItem,
  updateLookupIntervalItem,
  updateServiceUserCareType,
  updateServiceUserEthnicity,
  updateServiceUserFundingType,
  updateServiceUserLanguage,
  updateVitalAcceptedRangeCatalog,
  type ComplianceCategory,
  type IntervalLookupResource,
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

export function useLookupListWithInterval(resource: IntervalLookupResource, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.lookups(resource),
    queryFn: () => fetchLookupListWithInterval(resource),
    enabled,
    staleTime: 30_000,
  })
}

export function useUpdateLookupIntervalItem(resource: IntervalLookupResource) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      name,
      defaultRefreshMonths,
      defaultValidityMonths,
      defaultIntervalDays,
    }: {
      id: string
      name?: string
      defaultRefreshMonths?: number | null
      defaultValidityMonths?: number | null
      defaultIntervalDays?: number | null
    }) =>
      updateLookupIntervalItem(resource, id, {
        ...(name !== undefined ? { name } : {}),
        ...(defaultRefreshMonths !== undefined ? { defaultRefreshMonths } : {}),
        ...(defaultValidityMonths !== undefined ? { defaultValidityMonths } : {}),
        ...(defaultIntervalDays !== undefined ? { defaultIntervalDays } : {}),
      }),
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
      hasExpiry?: boolean
      defaultValidityMonths?: number | null
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
        hasExpiry?: boolean
        defaultValidityMonths?: number | null
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

// ─── On-entry welfare outcomes ──────────────────────────────────────────────

export function useWelfareOutcomes(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.welfareOutcomes(),
    queryFn: () => fetchWelfareOutcomes(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateWelfareOutcome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      code: string
      label: string
      tone?: WelfareOutcomeTone
      sortOrder?: number
    }) => createWelfareOutcome(body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.welfareOutcomes() }),
  })
}

export function useUpdateWelfareOutcome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        code?: string
        label?: string
        tone?: WelfareOutcomeTone
        sortOrder?: number
        isActive?: boolean
      }
    }) => updateWelfareOutcome(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.welfareOutcomes() }),
  })
}

export function useDeleteWelfareOutcome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWelfareOutcome(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.welfareOutcomes() }),
  })
}

// ─── Emergency protocols (carer-app runner) ─────────────────────────────────

export function useEmergencyProtocols(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.emergencyProtocols(),
    queryFn: () => fetchEmergencyProtocols(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateEmergencyProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      code: string
      title: string
      subtitle?: string
      version?: string
      iconKey?: string
      sortOrder?: number
      steps: { action: string; detail?: string }[]
    }) => createEmergencyProtocol(body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.emergencyProtocols() }),
  })
}

export function useUpdateEmergencyProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        code?: string
        title?: string
        subtitle?: string
        version?: string
        iconKey?: string
        sortOrder?: number
        isActive?: boolean
        steps?: { action: string; detail?: string }[]
      }
    }) => updateEmergencyProtocol(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.emergencyProtocols() }),
  })
}

export function useDeleteEmergencyProtocol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEmergencyProtocol(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.emergencyProtocols() }),
  })
}

// ─── Clock-in early / late arrival reasons ─────────────────────────────────

export function useClockInArrivalReasons(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.clockInArrivalReasons(),
    queryFn: () => fetchClockInArrivalReasons(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateClockInArrivalReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      kind: ClockInArrivalKind
      label: string
      requiresNotes?: boolean
      sortOrder?: number
    }) => createClockInArrivalReason(body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.clockInArrivalReasons() }),
  })
}

export function useUpdateClockInArrivalReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        label?: string
        requiresNotes?: boolean
        sortOrder?: number
        isActive?: boolean
      }
    }) => updateClockInArrivalReason(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.clockInArrivalReasons() }),
  })
}

export function useDeleteClockInArrivalReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClockInArrivalReason(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.clockInArrivalReasons() }),
  })
}

// ─── Office Manual check-in authorisation reasons ───────────────────────────

export function useManualAuthorisationReasons(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.manualAuthorisationReasons(),
    queryFn: () => fetchManualAuthorisationReasons(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateManualAuthorisationReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { label: string; requiresNotes?: boolean; sortOrder?: number }) =>
      createManualAuthorisationReason(body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.manualAuthorisationReasons() }),
  })
}

export function useUpdateManualAuthorisationReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        label?: string
        requiresNotes?: boolean
        sortOrder?: number
        isActive?: boolean
      }
    }) => updateManualAuthorisationReason(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.manualAuthorisationReasons() }),
  })
}

export function useDeleteManualAuthorisationReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteManualAuthorisationReason(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.manualAuthorisationReasons() }),
  })
}

// ─── Office left-area allow reasons ───────────────────────────────────────

export function useLeftAreaAllowReasons(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.leftAreaAllowReasons(),
    queryFn: () => fetchLeftAreaAllowReasons(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateLeftAreaAllowReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { label: string; requiresNotes?: boolean; sortOrder?: number }) =>
      createLeftAreaAllowReason(body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.leftAreaAllowReasons() }),
  })
}

export function useUpdateLeftAreaAllowReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        label?: string
        requiresNotes?: boolean
        sortOrder?: number
        isActive?: boolean
      }
    }) => updateLeftAreaAllowReason(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.leftAreaAllowReasons() }),
  })
}

export function useDeleteLeftAreaAllowReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLeftAreaAllowReason(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.leftAreaAllowReasons() }),
  })
}

// ─── Clock-out early / late end reasons ────────────────────────────────────

export function useClockOutEndReasons(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.clockOutEndReasons(),
    queryFn: () => fetchClockOutEndReasons(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateClockOutEndReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      kind: ClockOutEndKind
      label: string
      requiresNotes?: boolean
      sortOrder?: number
    }) => createClockOutEndReason(body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.clockOutEndReasons() }),
  })
}

export function useUpdateClockOutEndReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        label?: string
        requiresNotes?: boolean
        sortOrder?: number
        isActive?: boolean
      }
    }) => updateClockOutEndReason(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.clockOutEndReasons() }),
  })
}

export function useDeleteClockOutEndReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClockOutEndReason(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.clockOutEndReasons() }),
  })
}

export function useVisitOutcomes(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.visitOutcomes(),
    queryFn: () => fetchVisitOutcomes(),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateVisitOutcomeReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      outcomeId,
      body,
    }: {
      outcomeId: string
      body: { label: string; requiresNotes?: boolean; sortOrder?: number }
    }) => createVisitOutcomeReason(outcomeId, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.visitOutcomes() }),
  })
}

export function useUpdateVisitOutcomeReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { label?: string; requiresNotes?: boolean; sortOrder?: number; isActive?: boolean }
    }) => updateVisitOutcomeReason(id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.visitOutcomes() }),
  })
}

export function useDeleteVisitOutcomeReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVisitOutcomeReason(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: settingsKeys.visitOutcomes() }),
  })
}
