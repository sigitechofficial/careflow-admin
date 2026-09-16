import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignChargeCardToMatching,
  createChargeCard,
  deleteChargeCard,
  fetchChargeCard,
  fetchChargeCardAssignmentPreview,
  fetchChargeCards,
  resolveServiceUserChargeCard,
  updateChargeCard,
} from '@/features/billing/api/charge-cards.api'
import { billingKeys } from '@/features/billing/keys'
import type { ChargeCardInput } from '@/features/billing/types/billing-cards.types'

export function useChargeCards(filters?: { search?: string; status?: string; locationId?: string }) {
  return useQuery({
    queryKey: billingKeys.chargeCards(filters),
    queryFn: () => fetchChargeCards(filters),
  })
}

export function useChargeCard(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.chargeCard(id ?? ''),
    queryFn: () => fetchChargeCard(id!),
    enabled: enabled && !!id,
  })
}

export function useCreateChargeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ChargeCardInput) => createChargeCard(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useUpdateChargeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ChargeCardInput> }) =>
      updateChargeCard(id, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.chargeCard(vars.id) })
    },
  })
}

export function useDeleteChargeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteChargeCard(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useChargeCardAssignmentPreview(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.chargeCardAssignmentPreview(id ?? ''),
    queryFn: () => fetchChargeCardAssignmentPreview(id!),
    enabled: enabled && !!id,
  })
}

export function useAssignChargeCardToMatching() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, onlyUnassigned }: { id: string; onlyUnassigned?: boolean }) =>
      assignChargeCardToMatching(id, { onlyUnassigned }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: ['service-users'] })
    },
  })
}

export function useResolveServiceUserChargeCard(serviceUserId: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.chargeCardResolve(serviceUserId ?? ''),
    queryFn: () => resolveServiceUserChargeCard(serviceUserId!),
    enabled: enabled && !!serviceUserId,
  })
}
