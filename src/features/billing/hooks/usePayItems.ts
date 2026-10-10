import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePayItem,
  cancelPayItem,
  createPayItem,
  fetchPayItemSuggestion,
  fetchPayItems,
  rejectPayItem,
} from '@/features/billing/api/pay-items.api'
import { billingKeys } from '@/features/billing/keys'
import type { PayItemUnit, PayItemWageType } from '@/features/billing/types/pay-items.types'

export function usePayItems(params?: { status?: string; employeeId?: string; wageTypeCode?: string }) {
  return useQuery({
    queryKey: billingKeys.payItems(params),
    queryFn: () => fetchPayItems(params),
  })
}

export function usePayItemSuggestion(
  params: { employeeId: string; wageTypeCode: PayItemWageType; unit: PayItemUnit; date: string },
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.payItemSuggestion(params),
    queryFn: () => fetchPayItemSuggestion(params),
    enabled: enabled && !!params.employeeId && !!params.date && params.unit !== 'AMOUNT',
  })
}

function useInvalidatePayItems() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'pay-items'] })
}

export function useCreatePayItem() {
  const invalidate = useInvalidatePayItems()
  return useMutation({ mutationFn: createPayItem, onSuccess: invalidate })
}

export function useApprovePayItem() {
  const invalidate = useInvalidatePayItems()
  return useMutation({ mutationFn: approvePayItem, onSuccess: invalidate })
}

export function useRejectPayItem() {
  const invalidate = useInvalidatePayItems()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPayItem(id, reason),
    onSuccess: invalidate,
  })
}

export function useCancelPayItem() {
  const invalidate = useInvalidatePayItems()
  return useMutation({ mutationFn: cancelPayItem, onSuccess: invalidate })
}
