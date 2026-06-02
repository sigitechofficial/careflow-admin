import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTemporaryInspector,
  deleteTemporaryInspector,
  fetchTemporaryInspectors,
  fetchTemporaryInspectorServiceUserOptions,
} from '@/features/employees/api/temporary-inspectors-api'
import { employeeKeys } from '@/features/employees/keys'

const STALE_TIME = 30_000

export function useTemporaryInspectorOptions(enabled = true) {
  return useQuery({
    queryKey: [...employeeKeys.all(), 'temporary-inspectors', 'options'] as const,
    queryFn: fetchTemporaryInspectorServiceUserOptions,
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useTemporaryInspectors(enabled = true) {
  return useQuery({
    queryKey: [...employeeKeys.all(), 'temporary-inspectors', 'list'] as const,
    queryFn: fetchTemporaryInspectors,
    enabled,
    staleTime: STALE_TIME,
  })
}

export function useCreateTemporaryInspector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTemporaryInspector,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...employeeKeys.all(), 'temporary-inspectors'] })
    },
  })
}

export function useDeleteTemporaryInspector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTemporaryInspector,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...employeeKeys.all(), 'temporary-inspectors'] })
    },
  })
}
