import * as React from 'react'
import { suggestVisitPlanCarers } from '@/features/service-users/visit-plan/api'
import { slotHasAssignedCarers } from '@/features/service-users/visit-plan/visit-plan-assigned-carers.util'
import { carerCandidatesByEmployeeId } from '@/features/service-users/visit-plan/visit-plan-carer-availability-warning.util'
import type { VisitPlanCarerCandidate, VisitPlanSlot } from '@/features/service-users/visit-plan/types'

export function useVisitPlanSlotCarerSuggestions(
  serviceUserId: string | undefined,
  slots: VisitPlanSlot[],
) {
  const [candidatesBySlotCode, setCandidatesBySlotCode] = React.useState<
    Record<string, VisitPlanCarerCandidate[]>
  >({})
  const [loading, setLoading] = React.useState(false)

  const fetchKey = React.useMemo(() => {
    return slots
      .filter((slot) => slot.isEnabled && slotHasAssignedCarers(slot))
      .map(
        (slot) =>
          [
            slot.slotCode,
            slot.daysOfWeek.join(','),
            slot.plannedStartTime,
            slot.plannedEndTime,
            slot.requiredCarers,
            (slot.linkedCarePlanFormIds ?? []).join(','),
          ].join('|'),
      )
      .join(';')
  }, [slots])

  React.useEffect(() => {
    if (!serviceUserId || !fetchKey) {
      setCandidatesBySlotCode({})
      return
    }

    const slotsToFetch = slots.filter((slot) => slot.isEnabled && slotHasAssignedCarers(slot))
    let cancelled = false
    setLoading(true)

    void Promise.all(
      slotsToFetch.map(async (slot) => {
        const data = await suggestVisitPlanCarers(serviceUserId, {
          slotCode: slot.slotCode,
          daysOfWeek: slot.daysOfWeek,
          plannedStartTime: slot.plannedStartTime,
          plannedEndTime: slot.plannedEndTime,
          requiredCarers: slot.requiredCarers,
          linkedCarePlanFormIds: slot.linkedCarePlanFormIds,
        })
        return { slotCode: slot.slotCode, candidates: data.candidates ?? [] }
      }),
    )
      .then((results) => {
        if (cancelled) return
        const next: Record<string, VisitPlanCarerCandidate[]> = {}
        for (const result of results) next[result.slotCode] = result.candidates
        setCandidatesBySlotCode(next)
      })
      .catch(() => {
        if (!cancelled) setCandidatesBySlotCode({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [serviceUserId, fetchKey, slots])

  const candidatesForSlot = React.useCallback(
    (slotCode: string) => carerCandidatesByEmployeeId(candidatesBySlotCode[slotCode] ?? []),
    [candidatesBySlotCode],
  )

  return { candidatesForSlot, loading }
}
