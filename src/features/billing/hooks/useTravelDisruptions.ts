import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from '@/features/billing/keys'
import {
  approveDisruption,
  approveTravelInterval,
  decideDisruption,
  fetchDisruptionDecisions,
  fetchUndecidedCancellations,
  fetchVisitTravelTime,
  recordDisruption,
  recordTravelInterval,
  rejectDisruption,
  rejectTravelInterval,
} from '@/features/billing/api/travel-disruptions.api'

const travelKey = (visitReconciliationId: string) => [...billingKeys.all, 'travel-intervals', visitReconciliationId] as const
const disruptionsKey = [...billingKeys.all, 'visit-disruptions'] as const

export function useVisitTravelTime(visitReconciliationId: string | undefined) {
  return useQuery({
    queryKey: travelKey(visitReconciliationId ?? ''),
    queryFn: () => fetchVisitTravelTime(visitReconciliationId as string),
    enabled: !!visitReconciliationId,
  })
}

export function useTravelIntervalActions(visitReconciliationId: string) {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: travelKey(visitReconciliationId) })
  return {
    record: useMutation({ mutationFn: recordTravelInterval, onSuccess }),
    approve: useMutation({ mutationFn: approveTravelInterval, onSuccess }),
    reject: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => rejectTravelInterval(id, note), onSuccess }),
  }
}

export function useDisruptionDecisions() {
  return useQuery({ queryKey: [...disruptionsKey, 'decisions'], queryFn: () => fetchDisruptionDecisions() })
}

export function useUndecidedCancellations() {
  return useQuery({ queryKey: [...disruptionsKey, 'undecided'], queryFn: fetchUndecidedCancellations })
}

export function useDisruptionActions() {
  const qc = useQueryClient()
  const onSuccess = async () => {
    await qc.invalidateQueries({ queryKey: disruptionsKey })
    await qc.invalidateQueries({ queryKey: [...billingKeys.all, 'pay-items'] })
  }
  return {
    record: useMutation({ mutationFn: recordDisruption, onSuccess }),
    decide: useMutation({
      mutationFn: ({ id, amount, note }: { id: string; amount: number; note: string }) => decideDisruption(id, amount, note),
      onSuccess,
    }),
    approve: useMutation({ mutationFn: approveDisruption, onSuccess }),
    reject: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => rejectDisruption(id, note), onSuccess }),
  }
}
