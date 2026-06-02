import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addMedicationPackCompartment,
  addMedicationPackMember,
  countersignMedicationPackDelivery,
  createMedicationPackDelivery,
  downloadMedicationPackManifestPdf,
  endMedicationPack,
  endMedicationPackMember,
  getMedicationPackManifest,
  listMedicationPackCompartments,
  listMedicationPackDeliveries,
  listMedicationPackMembers,
  publishMedicationPack,
  reconcileMedicationPackDeliveryLine,
  removeMedicationPackCompartment,
  supersedeMedicationPack,
  type CreateMedicationPackCompartmentPayload,
  type CreateMedicationPackDeliveryPayload,
  type MedicationPackDeliveryLineStateValue,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'

const STALE_TIME = 30_000

function packsBase(serviceUserId: string) {
  return [...serviceUserKeys.detail(serviceUserId), 'medication-packs'] as const
}

export function packMembersKey(serviceUserId: string, packId: string) {
  return [...packsBase(serviceUserId), packId, 'members'] as const
}

export function packManifestKey(serviceUserId: string, packId: string) {
  return [...packsBase(serviceUserId), packId, 'manifest'] as const
}

export function packDeliveriesKey(serviceUserId: string, packId: string) {
  return [...packsBase(serviceUserId), packId, 'deliveries'] as const
}

export function packCompartmentsKey(serviceUserId: string, packId: string) {
  return [...packsBase(serviceUserId), packId, 'compartments'] as const
}

function invalidatePacks(qc: ReturnType<typeof useQueryClient>, serviceUserId: string) {
  void qc.invalidateQueries({ queryKey: packsBase(serviceUserId) })
  void qc.invalidateQueries({
    queryKey: [...serviceUserKeys.detail(serviceUserId), 'medications'],
  })
}

export function useMedicationPackMembers(serviceUserId: string, packId: string | null, enabled = true) {
  return useQuery({
    queryKey: packMembersKey(serviceUserId, packId ?? ''),
    queryFn: () => listMedicationPackMembers(serviceUserId, packId as string),
    enabled: Boolean(serviceUserId && packId) && enabled,
    staleTime: STALE_TIME,
  })
}

export function useMedicationPackManifest(serviceUserId: string, packId: string | null, enabled = true) {
  return useQuery({
    queryKey: packManifestKey(serviceUserId, packId ?? ''),
    queryFn: () => getMedicationPackManifest(serviceUserId, packId as string),
    enabled: Boolean(serviceUserId && packId) && enabled,
    staleTime: STALE_TIME,
  })
}

export function useDownloadPackManifestPdf(serviceUserId: string) {
  return useMutation({
    mutationFn: (packId: string) => downloadMedicationPackManifestPdf(serviceUserId, packId),
  })
}

export function useAddMedicationPackMember(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, serviceUserMedicationId }: { packId: string; serviceUserMedicationId: string }) =>
      addMedicationPackMember(serviceUserId, packId, serviceUserMedicationId),
    onSuccess: () => invalidatePacks(qc, serviceUserId),
  })
}

export function useEndMedicationPackMember(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, memberId, reason }: { packId: string; memberId: string; reason?: string }) =>
      endMedicationPackMember(serviceUserId, packId, memberId, reason),
    onSuccess: () => invalidatePacks(qc, serviceUserId),
  })
}

export function usePublishMedicationPack(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, notes }: { packId: string; notes?: string }) =>
      publishMedicationPack(serviceUserId, packId, { confirmAccurate: true, notes }),
    onSuccess: () => invalidatePacks(qc, serviceUserId),
  })
}

export function useSupersedeMedicationPack(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, newPackName, reason }: { packId: string; newPackName?: string; reason?: string }) =>
      supersedeMedicationPack(serviceUserId, packId, { newPackName, carryMembers: true, reason }),
    onSuccess: () => invalidatePacks(qc, serviceUserId),
  })
}

export function useEndMedicationPack(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, reason }: { packId: string; reason?: string }) =>
      endMedicationPack(serviceUserId, packId, reason),
    onSuccess: () => invalidatePacks(qc, serviceUserId),
  })
}

// ---- Flow 2: deliveries --------------------------------------------------

export function useMedicationPackDeliveries(serviceUserId: string, packId: string | null, enabled = true) {
  return useQuery({
    queryKey: packDeliveriesKey(serviceUserId, packId ?? ''),
    queryFn: () => listMedicationPackDeliveries(serviceUserId, packId as string),
    enabled: Boolean(serviceUserId && packId) && enabled,
    staleTime: STALE_TIME,
  })
}

export function useCreateMedicationPackDelivery(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, body }: { packId: string; body: CreateMedicationPackDeliveryPayload }) =>
      createMedicationPackDelivery(serviceUserId, packId, body),
    onSuccess: (_d, { packId }) => {
      void qc.invalidateQueries({ queryKey: packDeliveriesKey(serviceUserId, packId) })
    },
  })
}

export function useReconcileMedicationPackDeliveryLine(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      packId,
      deliveryId,
      lineId,
      confirmedPresent,
      state,
      notes,
    }: {
      packId: string
      deliveryId: string
      lineId: string
      confirmedPresent: boolean
      state?: MedicationPackDeliveryLineStateValue
      notes?: string
    }) =>
      reconcileMedicationPackDeliveryLine(serviceUserId, packId, deliveryId, lineId, {
        confirmedPresent,
        state,
        notes,
      }),
    onSuccess: (_d, { packId }) => {
      void qc.invalidateQueries({ queryKey: packDeliveriesKey(serviceUserId, packId) })
    },
  })
}

export function useCountersignMedicationPackDelivery(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, deliveryId, notes }: { packId: string; deliveryId: string; notes?: string }) =>
      countersignMedicationPackDelivery(serviceUserId, packId, deliveryId, notes),
    onSuccess: (_d, { packId }) => {
      void qc.invalidateQueries({ queryKey: packDeliveriesKey(serviceUserId, packId) })
    },
  })
}

// ---- Compartments --------------------------------------------------------

export function useMedicationPackCompartments(serviceUserId: string, packId: string | null, enabled = true) {
  return useQuery({
    queryKey: packCompartmentsKey(serviceUserId, packId ?? ''),
    queryFn: () => listMedicationPackCompartments(serviceUserId, packId as string),
    enabled: Boolean(serviceUserId && packId) && enabled,
    staleTime: STALE_TIME,
  })
}

export function useAddMedicationPackCompartment(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, body }: { packId: string; body: CreateMedicationPackCompartmentPayload }) =>
      addMedicationPackCompartment(serviceUserId, packId, body),
    onSuccess: (_d, { packId }) => {
      void qc.invalidateQueries({ queryKey: packCompartmentsKey(serviceUserId, packId) })
    },
  })
}

export function useRemoveMedicationPackCompartment(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ packId, compartmentId }: { packId: string; compartmentId: string }) =>
      removeMedicationPackCompartment(serviceUserId, packId, compartmentId),
    onSuccess: (_d, { packId }) => {
      void qc.invalidateQueries({ queryKey: packCompartmentsKey(serviceUserId, packId) })
    },
  })
}
