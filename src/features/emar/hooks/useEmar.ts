import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchDoseExceptions,
  fetchDoseReport,
  fetchMedicationOverview,
  fetchStockMovements,
  reviewDose,
  type DoseExceptionStatus,
} from '@/features/emar/api/emar.api'

export type {
  AdministeredDose,
  DoseException,
  DoseExceptionList,
  DoseExceptionStatus,
  DoseStatus,
  MedicationOverview,
  StockMovement,
  StockMovementType,
} from '@/features/emar/api/emar.api'

export const medicationKeys = {
  all: ['medication-module'] as const,
  overview: (loc: string | null | undefined, days: number) => [...medicationKeys.all, 'overview', loc ?? null, days] as const,
  exceptions: (p: object) => [...medicationKeys.all, 'exceptions', p] as const,
  report: (kind: string, p: object) => [...medicationKeys.all, 'report', kind, p] as const,
  stock: (p: object) => [...medicationKeys.all, 'stock', p] as const,
}

/** Medication module dashboard figures (last `days` days). Refreshes every minute. */
export function useMedicationOverview(locationId: string | null | undefined, days: number, enabled: boolean) {
  return useQuery({
    queryKey: medicationKeys.overview(locationId, days),
    queryFn: ({ signal }) => fetchMedicationOverview({ days, locationId }, signal),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useDoseExceptions(params: {
  dateFrom: string
  dateTo: string
  locationId?: string | null
  status?: DoseExceptionStatus
  unreviewedOnly?: boolean
}) {
  const p = { ...params, limit: 200 }
  return useQuery({
    queryKey: medicationKeys.exceptions(p),
    queryFn: ({ signal }) => fetchDoseExceptions(p, signal),
    placeholderData: keepPreviousData,
  })
}

export function useDoseReport(
  kind: 'administered' | 'late-administrations',
  params: { dateFrom: string; dateTo: string; page: number; limit: number },
) {
  return useQuery({
    queryKey: medicationKeys.report(kind, params),
    queryFn: ({ signal }) => fetchDoseReport(kind, params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useStockMovements(params: { dateFrom: string; dateTo: string }) {
  return useQuery({
    queryKey: medicationKeys.stock(params),
    queryFn: ({ signal }) => fetchStockMovements(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Mark a missed / refused / not given / held dose as reviewed by a manager. */
export function useReviewDose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { serviceUserId: string; eventId: string; notes?: string }) => reviewDose(v.serviceUserId, v.eventId, v.notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: medicationKeys.all })
      void qc.invalidateQueries({ queryKey: ['home-signals'] })
    },
  })
}
