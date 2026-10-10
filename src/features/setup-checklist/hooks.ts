import { useQuery } from '@tanstack/react-query'
import { fetchSetupChecklist } from '@/features/setup-checklist/api'

export function useSetupChecklist() {
  return useQuery({
    queryKey: ['setup-checklist'],
    queryFn: ({ signal }) => fetchSetupChecklist({ signal }),
    staleTime: 30_000,
  })
}
