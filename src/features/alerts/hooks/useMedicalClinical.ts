import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import {
  createMedicalAlert,
  createMedicalHistoryEvent,
  createReasonableAdjustment,
  createServiceUserMedicalCondition,
  deactivateMedicalAlert,
  deactivateMedicalHistoryEvent,
  deactivateMonitoringConfig,
  deactivateReasonableAdjustment,
  deactivateUsualParameter,
  discontinueServiceUserMedicalCondition,
  fetchMedicalConditionCatalog,
  fetchMedicalSafetySummary,
  listMedicalAlerts,
  listMedicalHistory,
  listMonitoringConfig,
  listReasonableAdjustments,
  listMedicalConditionCarePlanRecommendations,
  listServiceUserMedicalConditions,
  listUsualParameters,
  updateMedicalAlert,
  updateMedicalHistoryEvent,
  updateReasonableAdjustment,
  updateServiceUserMedicalCondition,
  updateUsualParameter,
  upsertMonitoringConfig,
  upsertUsualParameter,
  type CreateMedicalAlertPayload,
  type CreateMedicalConditionPayload,
  type CreateMedicalHistoryPayload,
  type CreateReasonableAdjustmentPayload,
  type UpdateMedicalAlertPayload,
  type UpdateMedicalConditionPayload,
  type UpdateMedicalHistoryPayload,
  type UpdateReasonableAdjustmentPayload,
  type UpdateUsualParameterPayload,
  type UpsertMonitoringConfigPayload,
  type UpsertUsualParameterPayload,
} from '@/features/alerts/api/medical-clinical.api'
import { medicalClinicalKeys } from '@/features/alerts/api/medical-clinical.keys'
import { serviceUserKeys } from '@/features/service-users/keys'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'

export function useMedicalClinicalPermissions() {
  const can = useAuthStore((s) => s.can)
  return {
    conditions: {
      read: can('service_users.medical_conditions.read'),
      create: can('service_users.medical_conditions.create'),
      update: can('service_users.medical_conditions.update'),
      delete: can('service_users.medical_conditions.delete'),
    },
    adjustments: {
      read: can('service_users.medical_adjustments.read'),
      create: can('service_users.medical_adjustments.create'),
      update: can('service_users.medical_adjustments.update'),
      delete: can('service_users.medical_adjustments.delete'),
    },
    history: {
      read: can('service_users.medical_history.read'),
      create: can('service_users.medical_history.create'),
      update: can('service_users.medical_history.update'),
      delete: can('service_users.medical_history.delete'),
    },
    monitoring: {
      read: can('service_users.medical_monitoring.read'),
      update: can('service_users.medical_monitoring.update'),
    },
    usual: {
      read: can('service_users.medical_usual_parameters.read'),
      update: can('service_users.medical_usual_parameters.update'),
    },
    medicalAlerts: {
      read: can('service_users.medical_alerts.read'),
      create: can('service_users.medical_alerts.create'),
      update: can('service_users.medical_alerts.update'),
      delete: can('service_users.medical_alerts.delete'),
    },
  }
}

export function useMedicalConditionCatalog(search: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.catalog(search),
    queryFn: ({ signal }) => fetchMedicalConditionCatalog({ search, signal }),
    enabled,
    staleTime: 60_000,
  })
}

export function useServiceUserMedicalConditions(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.conditions(serviceUserId),
    queryFn: ({ signal }) => listServiceUserMedicalConditions(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useMedicalConditionCarePlanRecommendations(
  serviceUserId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: medicalClinicalKeys.carePlanRecommendations(serviceUserId),
    queryFn: ({ signal }) =>
      listMedicalConditionCarePlanRecommendations(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useMedicalConditionMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.conditions(serviceUserId) })
    void qc.invalidateQueries({
      queryKey: medicalClinicalKeys.carePlanRecommendations(serviceUserId),
    })
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.summary(serviceUserId) })
    // Refresh Care Plan recommendations / IA summary panels that depend on clinical context.
    void qc.invalidateQueries({ queryKey: initialAssessmentKeys.all() })
    void qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) })
  }
  return {
    create: useMutation({
      mutationFn: (body: CreateMedicalConditionPayload) =>
        createServiceUserMedicalCondition(serviceUserId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateMedicalConditionPayload }) =>
        updateServiceUserMedicalCondition(serviceUserId, id, body),
      onSuccess: invalidate,
    }),
    discontinue: useMutation({
      mutationFn: (id: string) => discontinueServiceUserMedicalCondition(serviceUserId, id),
      onSuccess: invalidate,
    }),
  }
}

export function useReasonableAdjustments(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.adjustments(serviceUserId),
    queryFn: ({ signal }) => listReasonableAdjustments(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useReasonableAdjustmentMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.adjustments(serviceUserId) })
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.summary(serviceUserId) })
  }
  return {
    create: useMutation({
      mutationFn: (body: CreateReasonableAdjustmentPayload) =>
        createReasonableAdjustment(serviceUserId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateReasonableAdjustmentPayload }) =>
        updateReasonableAdjustment(serviceUserId, id, body),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: string) => deactivateReasonableAdjustment(serviceUserId, id),
      onSuccess: invalidate,
    }),
  }
}

export function useMedicalHistory(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.history(serviceUserId),
    queryFn: ({ signal }) => listMedicalHistory(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useMedicalHistoryMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.history(serviceUserId) })
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.summary(serviceUserId) })
  }
  return {
    create: useMutation({
      mutationFn: (body: CreateMedicalHistoryPayload) =>
        createMedicalHistoryEvent(serviceUserId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateMedicalHistoryPayload }) =>
        updateMedicalHistoryEvent(serviceUserId, id, body),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: string) => deactivateMedicalHistoryEvent(serviceUserId, id),
      onSuccess: invalidate,
    }),
  }
}

export function useMonitoringConfig(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.monitoring(serviceUserId),
    queryFn: ({ signal }) => listMonitoringConfig(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useMonitoringConfigMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.monitoring(serviceUserId) })
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.summary(serviceUserId) })
  }
  return {
    upsert: useMutation({
      mutationFn: (body: UpsertMonitoringConfigPayload) =>
        upsertMonitoringConfig(serviceUserId, body),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (configKey: string) => deactivateMonitoringConfig(serviceUserId, configKey),
      onSuccess: invalidate,
    }),
  }
}

export function useUsualParameters(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.usual(serviceUserId),
    queryFn: ({ signal }) => listUsualParameters(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useUsualParameterMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.usual(serviceUserId) })
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.summary(serviceUserId) })
  }
  return {
    upsert: useMutation({
      mutationFn: (body: UpsertUsualParameterPayload) => upsertUsualParameter(serviceUserId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateUsualParameterPayload }) =>
        updateUsualParameter(serviceUserId, id, body),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: string) => deactivateUsualParameter(serviceUserId, id),
      onSuccess: invalidate,
    }),
  }
}

export function useMedicalAlerts(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.medicalAlerts(serviceUserId),
    queryFn: ({ signal }) => listMedicalAlerts(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useMedicalAlertMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.medicalAlerts(serviceUserId) })
    void qc.invalidateQueries({ queryKey: medicalClinicalKeys.summary(serviceUserId) })
  }
  return {
    create: useMutation({
      mutationFn: (body: CreateMedicalAlertPayload) =>
        createMedicalAlert(serviceUserId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateMedicalAlertPayload }) =>
        updateMedicalAlert(serviceUserId, id, body),
      onSuccess: invalidate,
    }),
    deactivate: useMutation({
      mutationFn: (id: string) => deactivateMedicalAlert(serviceUserId, id),
      onSuccess: invalidate,
    }),
  }
}

export function useMedicalSafetySummary(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: medicalClinicalKeys.summary(serviceUserId),
    queryFn: ({ signal }) => fetchMedicalSafetySummary(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}
