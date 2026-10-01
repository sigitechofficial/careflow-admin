/** Goals agreed with the person at the end of the IA (final tab) — `submission.metadata.agreedGoals`. */

export type AgreedGoal = {
  /** Stable id so care-plan visits can link to a goal (goals can be removed / re-ordered). */
  id?: string
  goal?: string
  outcomeArea?: string
  measure?: string
  targetDate?: string
}

export type AgreedGoalsMetadata = {
  goals?: AgreedGoal[]
}

export const AGREED_GOALS_MAX = 5

/** Care Act 2014 eligibility outcomes (Care and Support (Eligibility Criteria) Regulations 2015). */
export const CARE_ACT_OUTCOME_AREAS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'nutrition', label: 'Managing and maintaining nutrition' },
  { value: 'personal_hygiene', label: 'Maintaining personal hygiene' },
  { value: 'toilet_needs', label: 'Managing toilet needs' },
  { value: 'clothing', label: 'Being appropriately clothed' },
  { value: 'home_safely', label: 'Using the home safely' },
  { value: 'habitable_home', label: 'Keeping the home habitable' },
  { value: 'relationships', label: 'Family and other personal relationships' },
  { value: 'work_education_volunteering', label: 'Work, training, education or volunteering' },
  { value: 'community_services', label: 'Using community services and transport' },
  { value: 'caring_for_child', label: 'Caring for a child' },
  { value: 'other', label: 'Other' },
]

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

export function normalizeAgreedGoalsMetadata(raw: unknown): AgreedGoalsMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { goals: [] }
  const goals = (raw as Record<string, unknown>).goals
  if (!Array.isArray(goals)) return { goals: [] }
  return {
    goals: goals.slice(0, AGREED_GOALS_MAX).map((g, index) => {
      const row = g && typeof g === 'object' ? (g as Record<string, unknown>) : {}
      return {
        // Goals saved before ids existed get a positional id; it is stored with the next save.
        id: str(row.id) || `goal-${index + 1}`,
        goal: str(row.goal),
        outcomeArea: str(row.outcomeArea),
        measure: str(row.measure),
        targetDate: str(row.targetDate),
      }
    }),
  }
}

export function newAgreedGoal(): AgreedGoal {
  const id = globalThis.crypto?.randomUUID?.() ?? `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return { id }
}

/** At least one goal written — mirrors the backend `hasAgreedGoal`. */
export function hasAgreedGoal(meta: AgreedGoalsMetadata | undefined): boolean {
  return (meta?.goals ?? []).some((g) => Boolean(g.goal?.trim()))
}

function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/**
 * Starts goal #1 from §1.3 "What do they want support to achieve?" so it is not typed twice.
 * Returns `meta` itself unless there are no goals yet and the §1.3 answer has text.
 */
export function prefillFirstGoalFromSupportGoals(
  meta: AgreedGoalsMetadata,
  supportGoalsText: string | null | undefined,
): AgreedGoalsMetadata {
  if ((meta.goals ?? []).length > 0) return meta
  const text = supportGoalsText ? plainText(supportGoalsText) : ''
  if (!text) return meta
  return { goals: [{ id: 'goal-1', goal: text }] }
}
