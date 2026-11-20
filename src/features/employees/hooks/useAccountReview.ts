import { useMutation, useQuery } from '@tanstack/react-query'
import {
  decideDeletion,
  decideSignup,
  fetchAccountReview,
} from '@/features/employees/api/account-review.api'

export const accountReviewKey = (employeeId: string) => ['employees', employeeId, 'account-review'] as const

/** Staff record: how it was made, a waiting Care app sign-up, a waiting delete request. */
export function useAccountReview(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: accountReviewKey(employeeId),
    queryFn: () => fetchAccountReview(employeeId),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useDecideSignup(employeeId: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof decideSignup>[1]) => decideSignup(employeeId, body),
  })
}

export function useDecideDeletion(employeeId: string) {
  return useMutation({
    mutationFn: (body: Parameters<typeof decideDeletion>[1]) => decideDeletion(employeeId, body),
  })
}
