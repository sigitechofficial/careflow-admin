import { useQueries } from '@tanstack/react-query'
import type { ComboboxOption } from '@/shared/ui/combobox'
import { fetchCarePlanInstances } from '@/features/service-users/care-plans/api'
import { fetchServiceUserAssessments } from '@/features/service-users/assessments/api'
import { listServiceUserMedications } from '@/features/service-users/api'

type ServiceUserRef = { id: string; name: string | null }

/**
 * Records a contributing factor can point at, for every service user involved:
 * care plans, assessments and active medications. Only loads the kinds that are needed.
 */
export function useContributingFactorOptions(
  serviceUsers: ServiceUserRef[],
  need: { carePlans: boolean; assessments: boolean; medications: boolean },
) {
  // With several service users, say whose record it is.
  const suffix = (su: ServiceUserRef) =>
    serviceUsers.length > 1 ? ` — ${su.name ?? 'Service user'}` : ''

  const carePlans = useQueries({
    queries: serviceUsers.map((su) => ({
      queryKey: ['incident-factor-options', 'care-plans', su.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchCarePlanInstances(su.id, { signal }),
      enabled: need.carePlans,
      staleTime: 60_000,
    })),
  })
  const assessments = useQueries({
    queries: serviceUsers.map((su) => ({
      queryKey: ['incident-factor-options', 'assessments', su.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchServiceUserAssessments(su.id, { signal }),
      enabled: need.assessments,
      staleTime: 60_000,
    })),
  })
  const medications = useQueries({
    queries: serviceUsers.map((su) => ({
      queryKey: ['incident-factor-options', 'medications', su.id],
      queryFn: () => listServiceUserMedications(su.id, {}),
      enabled: need.medications,
      staleTime: 60_000,
    })),
  })

  const carePlanOptions: ComboboxOption[] = serviceUsers.flatMap((su, i) =>
    (carePlans[i]?.data?.instances ?? []).map((cp) => ({
      value: cp.id,
      label: `${cp.formName ?? 'Care plan'}${suffix(su)}`,
    })),
  )
  const assessmentOptions: ComboboxOption[] = serviceUsers.flatMap((su, i) =>
    (assessments[i]?.data ?? []).map((a) => ({
      value: `${su.id}:${a.assessmentKey}`,
      label: `${a.title}${suffix(su)}`,
    })),
  )
  const medicationOptions: ComboboxOption[] = serviceUsers.flatMap((su, i) =>
    (medications[i]?.data?.rows ?? []).map((m) => ({
      value: m.id,
      label: `${m.medicationName}${m.strength ? ` ${m.strength}` : ''}${suffix(su)}`,
    })),
  )

  return {
    carePlanOptions,
    assessmentOptions,
    medicationOptions,
    loading: {
      carePlans: carePlans.some((q) => q.isLoading),
      assessments: assessments.some((q) => q.isLoading),
      medications: medications.some((q) => q.isLoading),
    },
  }
}
