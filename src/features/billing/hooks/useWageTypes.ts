import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBankHoliday,
  fetchBankHolidays,
  fetchHolidayCalendarStatus,
  setHolidayPremiumBasis,
  fetchDayPriority,
  fetchTravelGapSettings,
  fetchWageTypes,
  importBankHolidaysFromGovUk,
  previewPay,
  setDayPriority,
  setTravelGapSettings,
  updateBankHoliday,
  updateWageType,
} from '@/features/billing/api/wage-types.api'
import { billingKeys } from '@/features/billing/keys'
import type { CalendarRegion, PayPreviewInput, TravelGapSettings } from '@/features/billing/types/wage-types.types'

export function useWageTypes(enabled = true) {
  return useQuery({
    queryKey: billingKeys.wageTypes(),
    queryFn: fetchWageTypes,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useUpdateWageType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: { name?: string; description?: string | null; isActive?: boolean } }) =>
      updateWageType(code, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.wageTypes() }),
  })
}

export function useBankHolidays(params?: { region?: CalendarRegion; year?: string }) {
  return useQuery({
    queryKey: billingKeys.bankHolidays(params),
    queryFn: () => fetchBankHolidays(params),
  })
}

function useInvalidateBankHolidays() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'bank-holidays'] })
}

export function useCreateBankHoliday() {
  const invalidate = useInvalidateBankHolidays()
  return useMutation({ mutationFn: createBankHoliday, onSuccess: invalidate })
}

export function useUpdateBankHoliday() {
  const invalidate = useInvalidateBankHolidays()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { name?: string; isActive?: boolean; substituteForDate?: string | null }
    }) => updateBankHoliday(id, body),
    onSuccess: invalidate,
  })
}

/** Calendar completeness and the weekend-holiday policy (PC-22 to PC-24). */
export function useHolidayCalendarStatus() {
  return useQuery({
    queryKey: [...billingKeys.all, 'bank-holidays', 'status'] as const,
    queryFn: fetchHolidayCalendarStatus,
  })
}

export function useSetHolidayPremiumBasis() {
  const invalidate = useInvalidateBankHolidays()
  return useMutation({ mutationFn: setHolidayPremiumBasis, onSuccess: invalidate })
}

export function useImportBankHolidays() {
  const invalidate = useInvalidateBankHolidays()
  return useMutation({ mutationFn: importBankHolidaysFromGovUk, onSuccess: invalidate })
}

/** Pay preview: calculation only, nothing is saved. */
export function usePayPreview() {
  return useMutation({ mutationFn: (body: PayPreviewInput) => previewPay(body) })
}

export function useTravelGapSettings() {
  return useQuery({ queryKey: billingKeys.travelGaps(), queryFn: fetchTravelGapSettings })
}

export function useSetTravelGapSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TravelGapSettings & { reason: string }) => setTravelGapSettings(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.travelGaps() }),
  })
}

export function useDayPriority() {
  return useQuery({ queryKey: billingKeys.dayPriority(), queryFn: fetchDayPriority })
}

export function useSetDayPriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setDayPriority,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.dayPriority() }),
  })
}
