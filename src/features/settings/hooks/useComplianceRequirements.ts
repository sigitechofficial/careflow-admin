import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createComplianceRequirement,
  deleteComplianceRequirement,
  fetchComplianceRequirements,
  updateComplianceRequirement,
} from '@/features/settings/api/compliance-requirements-api'
import { settingsKeys } from '@/features/settings/keys'

export function useComplianceRequirements(limit = 100) {
  return useQuery({
    queryKey: settingsKeys.complianceRequirements({ limit }),
    queryFn: () => fetchComplianceRequirements({ page: 1, limit }),
    staleTime: 30_000,
  })
}

export function useCreateComplianceRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createComplianceRequirement,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all(), 'compliance-requirements'] })
    },
  })
}

export function useUpdateComplianceRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof updateComplianceRequirement>[1]
    }) => updateComplianceRequirement(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all(), 'compliance-requirements'] })
    },
  })
}

export function useDeleteComplianceRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteComplianceRequirement,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...settingsKeys.all(), 'compliance-requirements'] })
    },
  })
}
