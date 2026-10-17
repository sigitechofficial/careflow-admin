import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from '@/features/billing/keys'
import {
  approveWageRecovery,
  fetchWageRecoveries,
  fetchWageRecovery,
  fetchWageRecoveryPolicy,
  recordWageRecoveryPolicy,
  rejectWageRecovery,
  withdrawWageRecoveryPolicy,
} from '@/features/billing/api/wage-recoveries.api'

const recoveriesKey = [...billingKeys.all, 'wage-recoveries'] as const

export function useWageRecoveries(status?: string) {
  return useQuery({ queryKey: [...recoveriesKey, 'list', status ?? ''], queryFn: () => fetchWageRecoveries(status) })
}

export function useWageRecovery(id: string | null) {
  return useQuery({
    queryKey: [...recoveriesKey, 'detail', id ?? ''],
    queryFn: () => fetchWageRecovery(id as string),
    enabled: !!id,
  })
}

export function useWageRecoveryPolicy() {
  return useQuery({ queryKey: [...recoveriesKey, 'policy'], queryFn: fetchWageRecoveryPolicy })
}

export function useWageRecoveryActions() {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: recoveriesKey })
  return {
    approve: useMutation({
      mutationFn: ({ id, authorityBasis, reason }: { id: string; authorityBasis: string; reason: string }) =>
        approveWageRecovery(id, authorityBasis, reason),
      onSuccess,
    }),
    reject: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => rejectWageRecovery(id, note), onSuccess }),
    recordPolicy: useMutation({ mutationFn: recordWageRecoveryPolicy, onSuccess }),
    withdrawPolicy: useMutation({ mutationFn: withdrawWageRecoveryPolicy, onSuccess }),
  }
}
