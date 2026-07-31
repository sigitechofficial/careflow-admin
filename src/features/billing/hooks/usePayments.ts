import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPaymentAllocation,
  createPayment,
  fetchAgedDebt,
  fetchOutstandingInvoiceRuns,
  fetchPayment,
  fetchPayments,
  fetchPaymentsSummary,
  removePaymentAllocation,
} from '@/features/billing/api/payments.api'
import { billingKeys } from '@/features/billing/keys'

export function usePayments(filters?: { locationId?: string }) {
  return useQuery({
    queryKey: billingKeys.payments(filters),
    queryFn: () => fetchPayments(filters),
  })
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.payment(id ?? ''),
    queryFn: () => fetchPayment(id!),
    enabled: Boolean(id),
  })
}

export function usePaymentsSummary() {
  return useQuery({
    queryKey: billingKeys.paymentsSummary(),
    queryFn: fetchPaymentsSummary,
  })
}

export function useAgedDebt() {
  return useQuery({
    queryKey: billingKeys.agedDebt(),
    queryFn: fetchAgedDebt,
  })
}

export function useOutstandingInvoiceRuns(enabled = true, locationId?: string | null) {
  return useQuery({
    queryKey: billingKeys.outstandingInvoiceRuns(locationId),
    queryFn: () => fetchOutstandingInvoiceRuns(locationId ?? undefined),
    enabled,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useAddPaymentAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, ...body }: { paymentId: string; invoiceRunId: string; amount: number; notes?: string }) =>
      addPaymentAllocation(paymentId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useRemovePaymentAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, allocationId }: { paymentId: string; allocationId: string }) =>
      removePaymentAllocation(paymentId, allocationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}
