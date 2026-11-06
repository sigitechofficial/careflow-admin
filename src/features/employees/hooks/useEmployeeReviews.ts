import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEmployeeReview,
  deleteEmployeeReview,
  fetchEmployeeReviews,
  fetchEmployeeReviewsOverview,
  updateEmployeeReview,
} from '@/features/employees/api/employee-reviews-api'
import { employeeKeys } from '@/features/employees/keys'

export function useEmployeeReviews(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.reviews(employeeId),
    queryFn: () => fetchEmployeeReviews(employeeId),
    enabled: Boolean(employeeId) && enabled,
    staleTime: 30_000,
  })
}

export function useEmployeeReviewsOverview(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.reviewsOverview(),
    queryFn: fetchEmployeeReviewsOverview,
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateEmployeeReview(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createEmployeeReview>[1]) =>
      createEmployeeReview(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.reviews(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.reviewsOverview() })
    },
  })
}

export function useUpdateEmployeeReview(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string
      body: Parameters<typeof updateEmployeeReview>[2]
    }) => updateEmployeeReview(employeeId, reviewId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.reviews(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.reviewsOverview() })
    },
  })
}

export function useDeleteEmployeeReview(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      deleteEmployeeReview(employeeId, reviewId, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: employeeKeys.reviews(employeeId) })
      void qc.invalidateQueries({ queryKey: employeeKeys.reviewsOverview() })
    },
  })
}
