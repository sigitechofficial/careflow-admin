import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeOnCallCall,
  createOnCallCall,
  createOnCallShift,
  deleteOnCallShift,
  fetchOnCallCalls,
  fetchOnCallNow,
  fetchOnCallShifts,
  onCallKeys,
  updateOnCallCall,
  updateOnCallShift,
} from '@/features/on-call/api'
import type { OnCallCallInput, OnCallCallStatus, OnCallShiftInput } from '@/features/on-call/types'

export function useOnCallNow() {
  return useQuery({ queryKey: onCallKeys.now(), queryFn: fetchOnCallNow, refetchInterval: 60_000 })
}

export function useOnCallShifts(from: string, to: string) {
  return useQuery({ queryKey: onCallKeys.shifts(from, to), queryFn: () => fetchOnCallShifts(from, to) })
}

export function useOnCallCalls(status: OnCallCallStatus | 'ALL') {
  return useQuery({ queryKey: onCallKeys.calls(status), queryFn: () => fetchOnCallCalls(status) })
}

/** Invalidate everything on-call after any change (rota and calls are small lists). */
function useInvalidateOnCall() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: onCallKeys.all })
}

export function useSaveOnCallShift() {
  const invalidate = useInvalidateOnCall()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: OnCallShiftInput }) =>
      id ? updateOnCallShift(id, body) : createOnCallShift(body),
    onSuccess: invalidate,
  })
}

export function useDeleteOnCallShift() {
  const invalidate = useInvalidateOnCall()
  return useMutation({ mutationFn: (id: string) => deleteOnCallShift(id), onSuccess: invalidate })
}

export function useSaveOnCallCall() {
  const invalidate = useInvalidateOnCall()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: OnCallCallInput }) =>
      id ? updateOnCallCall(id, body) : createOnCallCall(body),
    onSuccess: invalidate,
  })
}

export function useCloseOnCallCall() {
  const invalidate = useInvalidateOnCall()
  return useMutation({
    mutationFn: ({ id, closingNote }: { id: string; closingNote: string }) => closeOnCallCall(id, closingNote),
    onSuccess: invalidate,
  })
}
