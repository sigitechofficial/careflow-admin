/**
 * Helpers for per-carer assignment timing vs the main visit window.
 */

export function allocationTimingWithinVisit(params: {
  assignmentStartHm: string
  assignmentEndHm: string
  visitStartHm: string
  visitEndHm: string
}): string | null {
  const { assignmentStartHm, assignmentEndHm, visitStartHm, visitEndHm } = params
  if (!assignmentStartHm || !assignmentEndHm) {
    return 'Start and end times are required for each assigned carer'
  }
  if (assignmentEndHm <= assignmentStartHm) {
    return 'End time must be later than start time'
  }
  if (assignmentStartHm < visitStartHm || assignmentEndHm > visitEndHm) {
    return 'Assignment timing must stay within the visit window'
  }
  return null
}

export function isInheritedHmTiming(params: {
  assignmentStartHm: string
  assignmentEndHm: string
  visitStartHm: string
  visitEndHm: string
}): boolean {
  return (
    params.assignmentStartHm === params.visitStartHm &&
    params.assignmentEndHm === params.visitEndHm
  )
}

export type CarerTimingDraft = {
  allocationId: string
  employeeId: string
  startHm: string
  endHm: string
}

/** When visit window changes, update drafts that still matched the previous window. */
export function propagateVisitWindowToInheritedDrafts(params: {
  drafts: CarerTimingDraft[]
  previousStartHm: string
  previousEndHm: string
  nextStartHm: string
  nextEndHm: string
}): CarerTimingDraft[] {
  return params.drafts.map(draft => {
    const inherited = isInheritedHmTiming({
      assignmentStartHm: draft.startHm,
      assignmentEndHm: draft.endHm,
      visitStartHm: params.previousStartHm,
      visitEndHm: params.previousEndHm,
    })
    if (!inherited) return draft
    return { ...draft, startHm: params.nextStartHm, endHm: params.nextEndHm }
  })
}
