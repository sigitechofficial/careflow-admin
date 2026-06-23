import type { VisitPlanCalendarVisit } from '@/features/service-users/visit-plan/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { VisitPlanCalendarOutcomeStatus } from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'
import { visitPlanCalendarDisplayStatus } from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'

export function resolveVisitPlanCalendarCarerAllocation(params: {
  outcome?: VisitPlanCalendarVisit | null
  slot: VisitPlanSlot
  carerNames: string[]
}): {
  carersRequired: number
  carersAllocated: number
  understaffed: boolean
} {
  const carersRequired = params.outcome?.requiredCarers ?? params.slot.requiredCarers
  const rotaCount =
    params.outcome?.allocatedCount ?? params.outcome?.allocatedEmployeeIds?.length ?? 0
  const carersAllocated = rotaCount > 0 ? rotaCount : params.carerNames.length
  return {
    carersRequired,
    carersAllocated,
    understaffed: carersAllocated < carersRequired,
  }
}

/** Visit-plan slot carers count when rota has not synced allocations yet. */
export function visitPlanCalendarEffectiveOutcomeStatus(params: {
  outcome: VisitPlanCalendarVisit | null | undefined
  slot: VisitPlanSlot
  carerNames: string[]
}): VisitPlanCalendarOutcomeStatus {
  const status = visitPlanCalendarDisplayStatus(params.outcome)
  if (status !== 'NEEDS_ATTENTION' || !params.outcome) return status
  const { understaffed } = resolveVisitPlanCalendarCarerAllocation(params)
  return understaffed ? status : 'PLANNED'
}
