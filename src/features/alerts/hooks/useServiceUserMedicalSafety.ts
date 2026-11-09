import { useQueries } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
import { useInitialAssessmentRiskRecords } from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  fetchServiceUserDocuments,
  fetchServiceUserFlashMessage,
  listServiceUserAllergies,
} from '@/features/service-users/api'
import { listMedicationAllergies } from '@/features/service-users/api/medication-allergies.api'
import { fetchBodyMapAlerts } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { buildMedicalSafetySnapshot } from '@/features/alerts/medical-safety/build-medical-safety'
import type { MedicalSafetySnapshot } from '@/features/alerts/medical-safety/types'
import { useServiceUserMedicalConditions } from '@/features/alerts/hooks/useMedicalClinical'

export type UseServiceUserMedicalSafetyOptions = {
  enabled?: boolean
  /** Omit flash from Immediate (Overview already shows the banner). */
  omitFlashFromImmediate?: boolean
}

export function useServiceUserMedicalSafety(
  serviceUserId: string | undefined,
  options: boolean | UseServiceUserMedicalSafetyOptions = true,
) {
  const opts: UseServiceUserMedicalSafetyOptions =
    typeof options === 'boolean' ? { enabled: options } : options
  const enabled = opts.enabled ?? true

  const can = useAuthStore((s) => s.can)
  const id = serviceUserId ?? ''
  const on = enabled && Boolean(id)

  const canAllergies = can('service_users.allergies.read') || can('service_users.read')
  const canMedAllergies =
    can('service_users.medications.allergies.read') ||
    can('service_users.medications.read') ||
    can('service_users.read')
  const canDocs = can('service_users.documents.read') || can('service_users.read')
  const canFlash = can('service_users.flash_message.read') || can('service_users.read')
  const canBodyMap = can('service_users.body_map.read')
  const canProfile = can('service_users.read')
  const canConditions = can('service_users.medical_conditions.read')

  const profile = useServiceUser(id, on && canProfile)
  const iaSource = useCarePlanIaSource(id)
  const iaRisks = useInitialAssessmentRiskRecords(
    id,
    iaSource.submission?.id ?? null,
    on && iaSource.canRead && Boolean(iaSource.submission?.id),
  )
  const conditionsQuery = useServiceUserMedicalConditions(id, on && canConditions)

  const [allergies, medAllergies, documents, flash, bodyMap] = useQueries({
    queries: [
      {
        queryKey: serviceUserKeys.allergies(id),
        queryFn: ({ signal }: { signal: AbortSignal }) => listServiceUserAllergies(id, { signal }),
        enabled: on && canAllergies,
      },
      {
        queryKey: serviceUserKeys.medicationAllergies(id),
        queryFn: ({ signal }: { signal: AbortSignal }) => listMedicationAllergies(id, { signal }),
        enabled: on && canMedAllergies,
      },
      {
        queryKey: serviceUserKeys.documents(id),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchServiceUserDocuments(id, { signal }),
        enabled: on && canDocs,
      },
      {
        queryKey: serviceUserKeys.flashMessage(id),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchServiceUserFlashMessage(id, { signal }),
        enabled: on && canFlash,
      },
      {
        queryKey: bodyMapKeys.alerts(id),
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchBodyMapAlerts(id, signal),
        enabled: on && canBodyMap,
      },
    ],
  })

  const snapshot: MedicalSafetySnapshot = buildMedicalSafetySnapshot({
    serviceUserId: id,
    profile: profile.data,
    allergies: allergies.data,
    // Medicine allergies are part of the one allergy list above (the Meds tab shows a filtered view of it).
    medicationAllergies: undefined,
    flash: flash.data,
    documents: documents.data,
    iaRisks: iaRisks.data,
    bodyMapAlerts: bodyMap.data,
    omitFlashFromImmediate: opts.omitFlashFromImmediate,
    medicalConditions: canConditions
      ? conditionsQuery.isError
        ? undefined
        : (conditionsQuery.data ?? (conditionsQuery.isLoading ? undefined : []))
      : undefined,
  })

  const sourceErrors = [
    canAllergies && allergies.isError,
    canMedAllergies && medAllergies.isError,
    canDocs && documents.isError,
    canFlash && flash.isError,
    canBodyMap && bodyMap.isError,
    iaSource.canRead && (iaRisks.isError || iaSource.submissionsQuery.isError),
    canConditions && conditionsQuery.isError,
  ].filter(Boolean).length

  const hasPartialMedicalData =
    (allergies.data?.length ?? 0) > 0 ||
    (medAllergies.data?.length ?? 0) > 0 ||
    Boolean(flash.data?.message) ||
    Boolean(documents.data?.legal) ||
    (iaRisks.data?.length ?? 0) > 0 ||
    (bodyMap.data?.length ?? 0) > 0 ||
    (conditionsQuery.data?.length ?? 0) > 0 ||
    Boolean(profile.data && (profile.data.riskLevel?.code || profile.data.riskLevel?.name))

  const medicalError = sourceErrors > 0 && !hasPartialMedicalData && !profile.isLoading

  const medicalLoading =
    (canAllergies && allergies.isLoading) ||
    (canMedAllergies && medAllergies.isLoading) ||
    (canDocs && documents.isLoading) ||
    (canFlash && flash.isLoading) ||
    (canBodyMap && bodyMap.isLoading) ||
    (canConditions && conditionsQuery.isLoading) ||
    (iaSource.canRead && (iaSource.submissionsQuery.isLoading || iaRisks.isLoading)) ||
    (canProfile && profile.isLoading)

  return {
    snapshot,
    medicalLoading,
    medicalError,
    sourceErrors,
    iaRiskRecords: iaRisks.data ?? [],
    sourceReady: {
      iaRisks:
        iaSource.canRead &&
        Boolean(iaSource.submission?.id) &&
        !iaRisks.isLoading &&
        !iaRisks.isError,
      conditions: canConditions && !conditionsQuery.isLoading && !conditionsQuery.isError,
      documents: canDocs && !documents.isLoading && !documents.isError,
      flash: canFlash && !flash.isLoading && !flash.isError,
      allergies:
        ((canAllergies && !allergies.isLoading && !allergies.isError) ||
          (canMedAllergies && !medAllergies.isLoading && !medAllergies.isError)) &&
        !(canAllergies && allergies.isLoading) &&
        !(canMedAllergies && medAllergies.isLoading),
    },
    refetchMedical: () => {
      void allergies.refetch()
      void medAllergies.refetch()
      void documents.refetch()
      void flash.refetch()
      void bodyMap.refetch()
      void iaRisks.refetch()
      void iaSource.submissionsQuery.refetch()
      void profile.refetch()
      void conditionsQuery.refetch()
    },
    permissions: {
      canAllergies,
      canMedAllergies,
      canDocs,
      canFlash,
      canBodyMap,
      canProfile,
      canIa: iaSource.canRead,
      canConditions,
    },
  }
}
