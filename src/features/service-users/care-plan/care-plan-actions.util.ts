import type {
  InitialAssessmentAction,
  InitialAssessmentActionPriority,
  InitialAssessmentActionStatus,
} from '@/features/service-users/initial-assessment/types'
import { formatIaAssessmentSourceLine } from '@/features/service-users/care-plan/care-plan-risk-profile.util'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'

export type CarePlanIaActionDisplay = {
  id: string
  title: string
  priority: InitialAssessmentActionPriority
  status: InitialAssessmentActionStatus
  dueDateLabel: string | null
  reason: string | null
  source: 'initial_assessment'
  sourceLabel: string
}

const ACTIVE_STATUSES: ReadonlySet<InitialAssessmentActionStatus> = new Set([
  'OPEN',
  'IN_PROGRESS',
])

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function looksLikeQuestion(text: string): boolean {
  const t = normalizeText(text)
  if (!t) return false
  if (t.endsWith('?')) return true
  return /^(any|is|are|does|do|has|have|was|were)\b/i.test(t)
}

/**
 * Clean display titles: drop "Follow-up:" prefixes and redundant "follow-up" suffixes.
 */
export function cleanIaActionTitle(rawTitle: string): string {
  let title = normalizeText(rawTitle)
  if (!title) return 'Untitled action'

  title = title.replace(/^(follow[\s-]*up)\s*[:\-–—]\s*/i, '')
  title = title.replace(/\s+follow[\s-]*up$/i, '')
  title = normalizeText(title)
  if (!title) return 'Untitled action'

  // Light title case for short labels (keep existing casing if already mixed / acronyms)
  if (title === title.toLowerCase() || title === title.toUpperCase()) {
    title = title
      .split(/\s+/)
      .map((w) => {
        if (w.length <= 3 && w === w.toUpperCase()) return w
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      })
      .join(' ')
  }

  return title
}

function phraseFromQuestion(text: string): string {
  const stripped = normalizeText(text)
    .replace(/\?+$/g, '')
    .replace(/^(any|is|are|does|do|has|have|was|were|please\s+confirm)\s+/i, '')
    .trim()
  if (!stripped) return 'Identified from Initial Assessment'
  const body = stripped.charAt(0).toUpperCase() + stripped.slice(1)
  if (/(identified|required|present|noted|recorded)$/i.test(body)) return body
  return `${body} identified`
}

function reasonRepeatsTitle(reason: string, title: string): boolean {
  const r = normalizeText(reason).toLowerCase()
  const t = normalizeText(title).toLowerCase()
  if (!r || !t) return false
  if (r === t) return true
  if (r === `${t} identified` || r === `${t} — follow-up required`) return true
  // Reason is mostly the title with trivial suffix
  if (r.startsWith(t) && r.length <= t.length + 24) {
    const rest = r.slice(t.length).replace(/^[\s:–—-]+/, '')
    if (!rest || /^(follow[\s-]*up|required|identified|review)$/i.test(rest)) return true
  }
  return false
}

/**
 * Prefer notes; fall back to phrased source question.
 * Omit reason when it would only repeat the cleaned title.
 */
export function selectIaActionReason(
  action: Pick<InitialAssessmentAction, 'notes' | 'sourceQuestionText' | 'title'>,
): string | null {
  const cleanedTitle = cleanIaActionTitle(action.title ?? '')
  const notes = normalizeText(action.notes ?? '')
  if (notes && !reasonRepeatsTitle(notes, cleanedTitle)) return notes

  const question = normalizeText(action.sourceQuestionText ?? '')
  if (!question) return null

  const phrased = looksLikeQuestion(question) ? phraseFromQuestion(question) : question
  if (reasonRepeatsTitle(phrased, cleanedTitle)) return null
  return phrased
}

export function formatActionDueDate(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatActionPriorityLabel(priority: InitialAssessmentActionPriority): string {
  switch (priority) {
    case 'URGENT':
      return 'Urgent'
    case 'HIGH':
      return 'High'
    case 'MEDIUM':
      return 'Medium'
    case 'LOW':
      return 'Low'
    default:
      return priority
  }
}

export function formatActionStatusLabel(status: InitialAssessmentActionStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Open'
    case 'IN_PROGRESS':
      return 'In progress'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

/**
 * Map IA actions for Care Plan Care Actions tab.
 * Does not write into care plan draft — IA stays in InitialAssessmentAction.
 */
export function mapIaActionsForCarePlanProfile(
  actions: InitialAssessmentAction[],
  options?: { submittedAt?: string | null },
): CarePlanIaActionDisplay[] {
  const sourceLabel = formatIaAssessmentSourceLine(options?.submittedAt)
  return actions
    .filter((a) => ACTIVE_STATUSES.has(a.status))
    .map((a) => {
      const title = cleanIaActionTitle(a.title)
      return {
        id: a.id,
        title,
        priority: a.priority,
        status: a.status,
        dueDateLabel: formatActionDueDate(a.dueDate),
        reason: selectIaActionReason(a),
        source: 'initial_assessment' as const,
        sourceLabel,
      }
    })
}

/**
 * Publish / draft invariant: IA action ids must never appear in care plan draft values.
 * Care Actions IA section is display-only (no __meta.careActions write for IA rows).
 */
export function draftDoesNotContainIaActionIds(
  values: CarePlanDraftValues,
  iaActionIds: ReadonlySet<string>,
): boolean {
  const serialized = JSON.stringify(values)
  for (const id of iaActionIds) {
    if (serialized.includes(id)) return false
  }
  return true
}
