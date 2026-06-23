import type { BulkVisitPlanScheduleCandidate } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'

export function filterBulkGenerateRotaCandidates(
  rows: BulkVisitPlanScheduleCandidate[],
  search: string,
): BulkVisitPlanScheduleCandidate[] {
  const q = search.trim().toLowerCase()
  if (!q) return rows

  return rows.filter((row) => {
    const haystack = [row.serviceUserLabel, row.serviceUserNumber, row.locationName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function readyBulkGenerateRotaCandidates(
  rows: BulkVisitPlanScheduleCandidate[],
): BulkVisitPlanScheduleCandidate[] {
  return rows.filter((row) => row.ready)
}

export function allReadyBulkGenerateRotaCandidatesSelected(
  readyRows: BulkVisitPlanScheduleCandidate[],
  selectedPlanIds: ReadonlySet<string>,
): boolean {
  return readyRows.length > 0 && readyRows.every((row) => selectedPlanIds.has(row.planId))
}

export function buildReadyPlanIdSet(
  candidates: BulkVisitPlanScheduleCandidate[],
): Set<string> {
  return new Set(candidates.filter((row) => row.ready).map((row) => row.planId))
}

export function toggleBulkGenerateRotaPlanSelection(
  selectedPlanIds: ReadonlySet<string>,
  planId: string,
  ready: boolean,
): Set<string> {
  if (!ready) return new Set(selectedPlanIds)

  const next = new Set(selectedPlanIds)
  if (next.has(planId)) next.delete(planId)
  else next.add(planId)
  return next
}

export function toggleAllReadyBulkGenerateRotaPlans(
  selectedPlanIds: ReadonlySet<string>,
  readyRows: BulkVisitPlanScheduleCandidate[],
  selectAll: boolean,
): Set<string> {
  const next = new Set(selectedPlanIds)
  for (const row of readyRows) {
    if (selectAll) next.add(row.planId)
    else next.delete(row.planId)
  }
  return next
}
