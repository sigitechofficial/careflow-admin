import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addMedicationPackItem,
  createMedicationPack,
  createServiceUserMedication,
  deleteServiceUserMedication,
  restoreServiceUserMedication,
  fetchMedicationLookups,
  listMedicationPacks,
  patchServiceUserMedicationStatus,
  updateServiceUserMedication,
  type MedicationRecordStatusValue,
  type UpdateServiceUserMedicationPayload,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'

const STALE_TIME = 60_000

export function useMedicationLookups(enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.all(), 'medication-lookups'] as const,
    queryFn: fetchMedicationLookups,
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useMedicationPacks(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-packs'] as const,
    queryFn: () => listMedicationPacks(serviceUserId),
    enabled: Boolean(serviceUserId) && enabled,
    staleTime: STALE_TIME,
  })
}

function invalidateMedications(qc: ReturnType<typeof useQueryClient>, serviceUserId: string) {
  void qc.invalidateQueries({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'medications'],
  })
  void qc.invalidateQueries({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-packs'],
  })
  void qc.invalidateQueries({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'medication-chart'],
  })
}

export function useCreateServiceUserMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      body,
    }: {
      serviceUserId: string
      body: Parameters<typeof createServiceUserMedication>[1]
    }) => createServiceUserMedication(serviceUserId, body),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}

export function useCreateMedicationPack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      body,
    }: {
      serviceUserId: string
      body: Parameters<typeof createMedicationPack>[1]
    }) => createMedicationPack(serviceUserId, body),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}

export function useAddMedicationPackItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      packId,
      body,
    }: {
      serviceUserId: string
      packId: string
      body: Parameters<typeof addMedicationPackItem>[2]
    }) => addMedicationPackItem(serviceUserId, packId, body),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}

export function useUpdateServiceUserMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      medicationId,
      body,
    }: {
      serviceUserId: string
      medicationId: string
      body: UpdateServiceUserMedicationPayload
    }) => updateServiceUserMedication(serviceUserId, medicationId, body),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}

export function usePatchServiceUserMedicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      medicationId,
      status,
    }: {
      serviceUserId: string
      medicationId: string
      status: MedicationRecordStatusValue
    }) => patchServiceUserMedicationStatus(serviceUserId, medicationId, status),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}

export function useDeleteServiceUserMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      medicationId,
    }: {
      serviceUserId: string
      medicationId: string
    }) => deleteServiceUserMedication(serviceUserId, medicationId),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}

export function useRestoreServiceUserMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      serviceUserId,
      medicationId,
    }: {
      serviceUserId: string
      medicationId: string
    }) => restoreServiceUserMedication(serviceUserId, medicationId),
    onSuccess: (_data, { serviceUserId }) => invalidateMedications(qc, serviceUserId),
  })
}
