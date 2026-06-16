import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot, VisitPlanSlotCode } from '@/features/service-users/visit-plan/types'

export type VisitPlanCareContextStep = {
  id: string
  label: string
  status: 'complete' | 'current' | 'pending' | 'blocked'
  detail?: string
}

/** Typical call slots where a care plan area is usually delivered. */
function defaultSlotsForCarePlan(carePlan: AcceptedCarePlanItem): VisitPlanSlotCode[] {
  const area = carePlan.carePlanArea.trim()
  const name = carePlan.formName.trim().toLowerCase()

  if (area === 'Medication' || name.includes('medication') || name.includes('emar')) {
    return ['MORNING', 'MIDDAY', 'AFTERNOON', 'EVENING', 'NIGHT']
  }
  if (area === 'Nutrition' || name.includes('eating') || name.includes('drinking')) {
    return ['MIDDAY', 'AFTERNOON']
  }
  if (area === 'Continence' || name.includes('continence')) {
    return ['MORNING', 'EVENING', 'NIGHT']
  }
  if (area === 'Mobility' || area === 'Falls' || name.includes('mobility') || name.includes('falls')) {
    return ['MORNING', 'EVENING']
  }
  if (area === 'Skin Integrity' || name.includes('skin')) {
    return ['MORNING', 'EVENING']
  }
  if (area === 'Mental Health' || name.includes('psycholog') || name.includes('mental')) {
    return ['MORNING', 'AFTERNOON', 'EVENING']
  }
  if (area === 'Communication' || name.includes('communication')) {
    return ['MORNING', 'MIDDAY', 'AFTERNOON', 'EVENING']
  }
  if (name.includes('night') || name.includes('sleep')) {
    return ['NIGHT', 'EVENING']
  }
  return ['MORNING', 'EVENING']
}

export function carePlanSuggestedForSlot(
  carePlan: AcceptedCarePlanItem,
  slot: VisitPlanSlot,
): boolean {
  if (slot.medicationRoundCode) {
    const med =
      carePlan.carePlanArea === 'Medication' ||
      carePlan.formName.toLowerCase().includes('medication')
    if (med) return true
  }
  return defaultSlotsForCarePlan(carePlan).includes(slot.slotCode)
}

export function hasExplicitCarePlanLinks(slot: VisitPlanSlot): boolean {
  return (slot.linkedCarePlanFormIds ?? []).length > 0
}

export function resolveExplicitCarePlansForSlot(
  slot: VisitPlanSlot,
  acceptedCarePlans: AcceptedCarePlanItem[],
): AcceptedCarePlanItem[] {
  const byId = new Map(acceptedCarePlans.map((p) => [p.formId, p]))
  return (slot.linkedCarePlanFormIds ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is AcceptedCarePlanItem => Boolean(p))
}

export function suggestedCarePlansForSlot(
  slot: VisitPlanSlot,
  acceptedCarePlans: AcceptedCarePlanItem[],
): AcceptedCarePlanItem[] {
  return acceptedCarePlans.filter((cp) => carePlanSuggestedForSlot(cp, slot))
}

/** Explicit slot links when set; otherwise IA-based suggestions for display. */
export function resolveCarePlansForSlot(
  slot: VisitPlanSlot,
  acceptedCarePlans: AcceptedCarePlanItem[],
): AcceptedCarePlanItem[] {
  const explicit = resolveExplicitCarePlansForSlot(slot, acceptedCarePlans)
  if (explicit.length > 0) return explicit
  return suggestedCarePlansForSlot(slot, acceptedCarePlans)
}

/** Apply suggested links to slots that have none yet (does not overwrite explicit links). */
export function applySuggestedCarePlanLinks(
  slots: VisitPlanSlot[],
  acceptedCarePlans: AcceptedCarePlanItem[],
): VisitPlanSlot[] {
  if (acceptedCarePlans.length === 0) return slots
  return slots.map((slot) => {
    if (hasExplicitCarePlanLinks(slot)) return slot
    const suggestedIds = suggestedCarePlansForSlot(slot, acceptedCarePlans).map((p) => p.formId)
    return suggestedIds.length > 0 ? { ...slot, linkedCarePlanFormIds: suggestedIds } : slot
  })
}

export function buildCarePathwaySteps(input: {
  assessmentStatus?: string | null
  managerReviewed?: boolean
  approvedForCareStart?: boolean
  acceptedCarePlanCount: number
  visitPlanStatus?: string | null
}): VisitPlanCareContextStep[] {
  const submitted =
    input.assessmentStatus === 'SUBMITTED' || input.assessmentStatus === 'REVIEWED'
  const reviewed = input.assessmentStatus === 'REVIEWED' || input.managerReviewed === true
  const careApproved = input.approvedForCareStart === true
  const hasCarePlans = input.acceptedCarePlanCount > 0
  const hasVisitPlan = Boolean(input.visitPlanStatus)

  return [
    {
      id: 'assessment',
      label: 'Initial assessment',
      status: submitted ? 'complete' : 'current',
      detail: submitted ? 'Submitted' : 'Complete assessment first',
    },
    {
      id: 'manager',
      label: 'Manager review',
      status: !submitted ? 'pending' : reviewed ? 'complete' : 'current',
      detail: reviewed ? 'Reviewed' : submitted ? 'Awaiting manager review' : undefined,
    },
    {
      id: 'care-start',
      label: 'Care package approved',
      status: !reviewed ? 'pending' : careApproved ? 'complete' : 'blocked',
      detail: careApproved ? 'Approved for care start' : reviewed ? 'Not approved yet' : undefined,
    },
    {
      id: 'care-plans',
      label: 'Care plans accepted',
      status: !careApproved ? 'pending' : hasCarePlans ? 'complete' : 'current',
      detail: hasCarePlans
        ? `${input.acceptedCarePlanCount} accepted`
        : careApproved
          ? 'Accept recommendations from assessment'
          : undefined,
    },
    {
      id: 'visit-plan',
      label: 'Visit plan configured',
      status: !hasCarePlans ? 'pending' : hasVisitPlan ? 'complete' : 'current',
      detail: input.visitPlanStatus ?? undefined,
    },
  ]
}
