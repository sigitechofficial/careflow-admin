import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchOfficeSalaries,
  fetchOfficeSalaryDetail,
  recordOfficeSalaryPayment,
  removeOfficeSalaryPayment,
  upsertOfficeSalary,
} from '@/features/office-salaries/api'
import type {
  RecordOfficeSalaryPaymentInput,
  UpsertOfficeSalaryInput,
} from '@/features/office-salaries/types'

export const officeSalaryKeys = {
  all: () => ['office-salaries'] as const,
  list: (month: string) => [...officeSalaryKeys.all(), 'list', month] as const,
  detail: (userId: string) => [...officeSalaryKeys.all(), 'detail', userId] as const,
}

export function useOfficeSalaries(month: string) {
  return useQuery({
    queryKey: officeSalaryKeys.list(month),
    queryFn: ({ signal }) => fetchOfficeSalaries(month, { signal }),
    enabled: Boolean(month),
  })
}

export function useOfficeSalaryDetail(userId: string | null) {
  return useQuery({
    queryKey: officeSalaryKeys.detail(userId ?? ''),
    queryFn: ({ signal }) => fetchOfficeSalaryDetail(userId as string, { signal }),
    enabled: Boolean(userId),
  })
}

function useInvalidateOfficeSalaries() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: officeSalaryKeys.all() })
}

export function useUpsertOfficeSalary() {
  const invalidate = useInvalidateOfficeSalaries()
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpsertOfficeSalaryInput }) =>
      upsertOfficeSalary(userId, input),
    onSuccess: invalidate,
  })
}

export function useRecordOfficeSalaryPayment() {
  const invalidate = useInvalidateOfficeSalaries()
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: RecordOfficeSalaryPaymentInput }) =>
      recordOfficeSalaryPayment(userId, input),
    onSuccess: invalidate,
  })
}

export function useRemoveOfficeSalaryPayment() {
  const invalidate = useInvalidateOfficeSalaries()
  return useMutation({
    mutationFn: ({ userId, month }: { userId: string; month: string }) =>
      removeOfficeSalaryPayment(userId, month),
    onSuccess: invalidate,
  })
}
