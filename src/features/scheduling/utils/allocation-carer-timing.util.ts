/**
 * Helpers for per-carer assignment timing vs the main visit window.
 */

/** HH:mm from `<input type="time" />` — rejects empty/partial mid-edit values. */
export function isValidTimeHm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

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
  if (
    !isValidTimeHm(params.previousStartHm) ||
    !isValidTimeHm(params.previousEndHm) ||
    !isValidTimeHm(params.nextStartHm) ||
    !isValidTimeHm(params.nextEndHm)
  ) {
    return params.drafts
  }
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

/** Incomplete drafts (e.g. cleared by a mid-edit time input) snap back to the visit window. */
export function healIncompleteCarerTimingDrafts(
  drafts: CarerTimingDraft[],
  visitStartHm: string,
  visitEndHm: string,
): CarerTimingDraft[] {
  if (!isValidTimeHm(visitStartHm) || !isValidTimeHm(visitEndHm)) return drafts
  let changed = false
  const next = drafts.map(draft => {
    if (isValidTimeHm(draft.startHm) && isValidTimeHm(draft.endHm)) return draft
    changed = true
    return { ...draft, startHm: visitStartHm, endHm: visitEndHm }
  })
  return changed ? next : drafts
}
