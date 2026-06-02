import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backendMe, backendMyLoginHistory } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'

export function useMe(enabled = true) {
  const accessToken = useAuthStore(s => s.accessToken)
  return useQuery({
    queryKey: ['auth', 'me'] as const,
    queryFn: () => backendMe(accessToken!),
    enabled: enabled && Boolean(accessToken),
    staleTime: 30_000,
  })
}

export function useLoginHistory(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'login-history'] as const,
    queryFn: ({ signal }) => backendMyLoginHistory({ signal }),
    enabled,
    staleTime: 30_000,
  })
}

export function useRefreshMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error('Not signed in')
      return backendMe(token)
    },
    onSuccess: me => {
      useAuthStore.getState().applyMeUser(me)
      void qc.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}
