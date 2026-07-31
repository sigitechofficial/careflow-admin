import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveInvoiceRun,
  calculateInvoiceRun,
  createInvoiceRun,
  fetchInvoiceRun,
  fetchInvoiceRuns,
  fetchInvoiceRunsSummary,
  fetchServiceUserInvoices,
  lockInvoiceRun,
  sendInvoiceRun,
} from '@/features/billing/api/invoice-runs.api'
import { billingKeys } from '@/features/billing/keys'

export function useInvoiceRuns(filters?: { locationId?: string }) {
  return useQuery({
    queryKey: billingKeys.invoiceRuns(filters),
    queryFn: () => fetchInvoiceRuns(filters),
  })
}

export function useInvoiceRunsSummary(locationId?: string | null) {
  return useQuery({
    queryKey: billingKeys.invoiceRunsSummary(locationId),
    queryFn: () => fetchInvoiceRunsSummary(locationId ?? undefined),
  })
}

export function useInvoiceRun(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.invoiceRun(id ?? ''),
    queryFn: () => fetchInvoiceRun(id!),
    enabled: Boolean(id),
  })
}

export function useServiceUserInvoices(serviceUserId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: billingKeys.serviceUserInvoices(serviceUserId ?? ''),
    queryFn: () => fetchServiceUserInvoices(serviceUserId!),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useCreateInvoiceRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInvoiceRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useCalculateInvoiceRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: calculateInvoiceRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useApproveInvoiceRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: approveInvoiceRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useLockInvoiceRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: lockInvoiceRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useSendInvoiceRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sendInvoiceRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}
