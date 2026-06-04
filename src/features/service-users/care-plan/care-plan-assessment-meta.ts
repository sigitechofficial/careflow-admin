import type { CarePlanDraftValues } from './care-plan-draft-storage'
import { metaString, setMetaValue } from './care-plan-form-meta'

export const CARE_PLAN_ASSESSMENT_META = {
  selectedIds: '__meta.selectedAssessmentIds',
  history: '__meta.assessmentHistory',
} as const

export function assessmentFieldKey(assessmentId: string, fieldId: string): string {
  return `__assessment.${assessmentId}.${fieldId}`
}

export function parseSelectedAssessmentIds(values: CarePlanDraftValues): string[] {
  try {
    const raw = metaString(values, CARE_PLAN_ASSESSMENT_META.selectedIds)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setSelectedAssessmentIds(
  values: CarePlanDraftValues,
  ids: string[],
): CarePlanDraftValues {
  return setMetaValue(values, CARE_PLAN_ASSESSMENT_META.selectedIds, JSON.stringify(ids))
}

export function getAssessmentField(
  values: CarePlanDraftValues,
  assessmentId: string,
  fieldId: string,
): string {
  return metaString(values, assessmentFieldKey(assessmentId, fieldId))
}

export function setAssessmentField(
  values: CarePlanDraftValues,
  assessmentId: string,
  fieldId: string,
  next: string | boolean,
): CarePlanDraftValues {
  return setMetaValue(values, assessmentFieldKey(assessmentId, fieldId), next)
}

export type AssessmentHistoryRow = {
  id: string
  assessmentId: string
  date: string
  time: string
  recordedBy: string
}

export type AssessmentHistoryEntry = AssessmentHistoryRow & {
  snapshot: Record<string, string | boolean>
}

export const DEFAULT_ASSESSMENT_HISTORY: AssessmentHistoryEntry[] = []

export function parseAssessmentHistory(values: CarePlanDraftValues): AssessmentHistoryEntry[] {
  try {
    const raw = metaString(values, CARE_PLAN_ASSESSMENT_META.history)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AssessmentHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function assessmentHistoryFor(
  values: CarePlanDraftValues,
  assessmentId: string,
): AssessmentHistoryEntry[] {
  return parseAssessmentHistory(values)
    .filter((row) => row.assessmentId === assessmentId)
    .sort((a, b) => {
      const left = `${b.date} ${b.time}`
      const right = `${a.date} ${a.time}`
      return left.localeCompare(right)
    })
}

export function collectAssessmentSnapshot(
  values: CarePlanDraftValues,
  assessmentId: string,
): Record<string, string | boolean> {
  const prefix = `${assessmentFieldKey(assessmentId, '')}`
  const snapshot: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith(prefix)) snapshot[key] = value
  }
  return snapshot
}

export function applyAssessmentSnapshot(
  values: CarePlanDraftValues,
  snapshot: Record<string, string | boolean>,
): CarePlanDraftValues {
  return { ...values, ...snapshot }
}

export function appendAssessmentHistory(
  values: CarePlanDraftValues,
  entry: AssessmentHistoryEntry,
): CarePlanDraftValues {
  const next = [...parseAssessmentHistory(values), entry]
  return setMetaValue(values, CARE_PLAN_ASSESSMENT_META.history, JSON.stringify(next))
}

export function defaultAssessmentIdForCarePlan(
  carePlanFormName: string,
  options: { id: string; name: string }[],
): string | undefined {
  const normalized = carePlanFormName.trim().toLowerCase()
  const exact = options.find(
    (o) => o.name.trim().toLowerCase() === `assessing for ${normalized} in home care`,
  )
  if (exact) return exact.id
  return options.find((o) => {
    const n = o.name.toLowerCase()
    return n.includes(normalized) && n.includes('home care')
  })?.id
}
