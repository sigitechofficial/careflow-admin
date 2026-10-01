/** Personalised care/support plan — paper form (holistic tab 16). */
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { preferredVisitTimesQuestion } from '@/features/service-users/initial-assessment/utils/preferred-visit-times'

export type CarePlanVisitId = 'morning' | 'lunch' | 'tea' | 'evening' | 'night'

export type CarePlanEquipmentId =
  | 'zimmerFrame'
  | 'reclinerChair'
  | 'perchingStool'
  | 'profilingBed'
  | 'hoistSling'
  | 'commode'
  | 'wheelchair'
  | 'standAid'

export type CarePlanTaskBlock = {
  agreedTask?: string
  objectives?: string
  /** Legacy free-text outcomes — shown only where already written; goals are linked instead. */
  outcomes?: string
  /** Agreed goals (`agreedGoals.goals[].id`) this visit supports. */
  goalIds?: string[]
}

export type CarePlanProfessionalVisitBlock = CarePlanTaskBlock & {
  whichProfessionalVisit?: string
}

export type CarePlanEquipmentRow = {
  makeModel?: string
  lastServiceDate?: string
  nextServiceDate?: string
}

export type CarePlanObjectivesMetadata = {
  visits?: Partial<Record<CarePlanVisitId, CarePlanTaskBlock>>
  professionalInterventionOutcome?: CarePlanTaskBlock
  professionalVisit?: CarePlanProfessionalVisitBlock
  equipment?: Partial<Record<CarePlanEquipmentId, CarePlanEquipmentRow>>
  otherEquipmentRequired?: string
}

export const CARE_PLAN_VISIT_SECTIONS: {
  id: CarePlanVisitId
  title: string
  instruction: string
}[] = [
  { id: 'morning', title: 'Morning visit', instruction: '— what carers do and what it should achieve' },
  { id: 'lunch', title: 'Midday visit', instruction: '— what carers do and what it should achieve' },
  { id: 'tea', title: 'Afternoon visit', instruction: '— what carers do and what it should achieve' },
  { id: 'evening', title: 'Evening visit', instruction: '— what carers do and what it should achieve' },
  { id: 'night', title: 'Night visit', instruction: '— what carers do and what it should achieve' },
]

/** Tab 2 "Preferred visit times" round codes → care-plan visit. */
const ROUND_TO_VISIT: Record<string, CarePlanVisitId> = {
  EARLY_MORNING: 'morning',
  MORNING: 'morning',
  BREAKFAST: 'morning',
  MIDDAY: 'lunch',
  LUNCH: 'lunch',
  LUNCH_TIME: 'lunch',
  AFTERNOON: 'tea',
  TEA: 'tea',
  TEA_TIME: 'tea',
  EARLY_EVENING: 'evening',
  EVENING: 'evening',
  BEDTIME: 'night',
  NIGHT: 'night',
}

/**
 * Visits to show, from the Tab 2 preferred visit times answer. `null` = show all (nothing chosen,
 * "flexible", or an answer we cannot read). Visits that already hold a plan are always shown.
 */
export function carePlanVisitsFromPreferredTimes(
  raw: unknown,
  meta?: CarePlanObjectivesMetadata,
): CarePlanVisitId[] | null {
  const chosen: string[] = []
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
      const on = entry === true || (entry && typeof entry === 'object' && (entry as { selected?: unknown }).selected === true)
      if (on) chosen.push(key)
    }
  } else if (Array.isArray(raw)) {
    chosen.push(...raw.map(String))
  } else if (typeof raw === 'string' && raw.trim()) {
    chosen.push(raw.trim())
  }
  const codes = chosen.map((c) => c.toUpperCase())
  if (!codes.length || codes.includes('FLEXIBLE')) return null
  const visits = new Set<CarePlanVisitId>()
  for (const code of codes) {
    const visit = ROUND_TO_VISIT[code]
    if (!visit) return null
    visits.add(visit)
  }
  for (const section of CARE_PLAN_VISIT_SECTIONS) {
    const block = meta?.visits?.[section.id]
    if (block && Object.values(block).some((v) => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim())) {
      visits.add(section.id)
    }
  }
  return CARE_PLAN_VISIT_SECTIONS.map((s) => s.id).filter((id) => visits.has(id))
}

export const CARE_PLAN_EQUIPMENT_ROWS: {
  id: CarePlanEquipmentId
  label: string
}[] = [
  { id: 'zimmerFrame', label: 'Zimmer Frame/ walking aid' },
  { id: 'reclinerChair', label: 'Recliner Chair/ high back chair, other' },
  { id: 'perchingStool', label: 'Perching Stool' },
  { id: 'profilingBed', label: 'Profiling bed' },
  { id: 'hoistSling', label: 'Hoist and Sling' },
  { id: 'commode', label: 'Commode' },
  { id: 'wheelchair', label: 'Wheel chair' },
  { id: 'standAid', label: 'Stand aid' },
]

/** Where an equipment row was found elsewhere in the assessment. */
export type CarePlanEquipmentSource = 'movingHandling' | 'mobilityAids' | 'dailyLivingAids'

export type CarePlanEquipmentDetectInput = {
  hoistInUse?: boolean
  /** Method ids ticked on any Moving & Handling task. */
  movingHandlingMethods?: string[]
  /** §12.8 mobility aids free text (only when aids are in use / required). */
  mobilityAidsText?: string
  /** §12.9 daily living aids free text (only when aids are in use / required). */
  dailyLivingAidsText?: string
}

const MOVING_HANDLING_METHOD_TO_EQUIPMENT: Record<string, CarePlanEquipmentId> = {
  walkingAid: 'zimmerFrame',
  hoist: 'hoistSling',
  commode: 'commode',
}

/** Free-text keywords → equipment row. Stand aids are matched before walking aids. */
const EQUIPMENT_KEYWORDS: { id: CarePlanEquipmentId; pattern: RegExp }[] = [
  { id: 'standAid', pattern: /\b(stand(ing)?[\s-]*aid|rotunda|stedy|return aid)\b/i },
  { id: 'wheelchair', pattern: /\bwheel[\s-]?chair/i },
  { id: 'hoistSling', pattern: /\b(hoist|sling)/i },
  { id: 'profilingBed', pattern: /\b(profiling|hospital|electric|adjustable)\s+bed\b|\bprofiling\b/i },
  { id: 'reclinerChair', pattern: /\b(recliner|riser|rise and recline|high[\s-]?back(ed)?)\b/i },
  { id: 'perchingStool', pattern: /\bperching/i },
  { id: 'commode', pattern: /\bcommode/i },
  {
    id: 'zimmerFrame',
    pattern: /\b(zimmer|walking[\s-]*(frame|aid|stick)|frame|walker|rollator|crutch(es)?|tripod|quad(ruped)? cane|stick)\b/i,
  },
]

function equipmentFromText(text: string | undefined): CarePlanEquipmentId[] {
  const plain = text?.replace(/<[^>]*>/g, ' ').trim()
  if (!plain) return []
  return EQUIPMENT_KEYWORDS.filter((k) => k.pattern.test(plain)).map((k) => k.id)
}

/** Equipment the assessment already records as in use, with where each was found. */
export function detectCarePlanEquipmentInUse(
  input: CarePlanEquipmentDetectInput,
): Partial<Record<CarePlanEquipmentId, CarePlanEquipmentSource[]>> {
  const found: Partial<Record<CarePlanEquipmentId, CarePlanEquipmentSource[]>> = {}
  const add = (id: CarePlanEquipmentId, source: CarePlanEquipmentSource) => {
    const list = (found[id] ??= [])
    if (!list.includes(source)) list.push(source)
  }
  if (input.hoistInUse) add('hoistSling', 'movingHandling')
  for (const method of input.movingHandlingMethods ?? []) {
    const id = MOVING_HANDLING_METHOD_TO_EQUIPMENT[method]
    if (id) add(id, 'movingHandling')
  }
  for (const id of equipmentFromText(input.mobilityAidsText)) add(id, 'mobilityAids')
  for (const id of equipmentFromText(input.dailyLivingAidsText)) add(id, 'dailyLivingAids')
  return found
}

export const CARE_PLAN_PLAN_SUBTITLE = 'For each visit, record what carers do and what it should achieve.'

function normalizeTaskBlock(raw: unknown): CarePlanTaskBlock {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as CarePlanTaskBlock
  return {
    agreedTask: typeof row.agreedTask === 'string' ? row.agreedTask : undefined,
    objectives: typeof row.objectives === 'string' ? row.objectives : undefined,
    outcomes: typeof row.outcomes === 'string' ? row.outcomes : undefined,
    goalIds: Array.isArray(row.goalIds) ? row.goalIds.filter((id): id is string => typeof id === 'string') : undefined,
  }
}

function normalizeProfessionalVisitBlock(raw: unknown): CarePlanProfessionalVisitBlock {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as CarePlanProfessionalVisitBlock
  return {
    ...normalizeTaskBlock(row),
    whichProfessionalVisit:
      typeof row.whichProfessionalVisit === 'string' ? row.whichProfessionalVisit : undefined,
  }
}

function normalizeEquipmentRow(raw: unknown): CarePlanEquipmentRow {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as CarePlanEquipmentRow
  return {
    makeModel: typeof row.makeModel === 'string' ? row.makeModel : undefined,
    lastServiceDate:
      typeof row.lastServiceDate === 'string' ? row.lastServiceDate : undefined,
    nextServiceDate:
      typeof row.nextServiceDate === 'string' ? row.nextServiceDate : undefined,
  }
}

export function defaultCarePlanObjectivesMetadata(): CarePlanObjectivesMetadata {
  return {}
}

export function normalizeCarePlanObjectivesMetadata(raw: unknown): CarePlanObjectivesMetadata {
  if (!raw || typeof raw !== 'object') return defaultCarePlanObjectivesMetadata()
  const row = raw as CarePlanObjectivesMetadata

  const visits: Partial<Record<CarePlanVisitId, CarePlanTaskBlock>> = {}
  if (row.visits && typeof row.visits === 'object') {
    for (const section of CARE_PLAN_VISIT_SECTIONS) {
      if (section.id in row.visits) {
        visits[section.id] = normalizeTaskBlock(row.visits[section.id])
      }
    }
  }

  const equipment: Partial<Record<CarePlanEquipmentId, CarePlanEquipmentRow>> = {}
  if (row.equipment && typeof row.equipment === 'object') {
    for (const item of CARE_PLAN_EQUIPMENT_ROWS) {
      if (item.id in row.equipment) {
        equipment[item.id] = normalizeEquipmentRow(row.equipment[item.id])
      }
    }
  }

  return {
    visits,
    professionalInterventionOutcome: normalizeTaskBlock(row.professionalInterventionOutcome),
    professionalVisit: normalizeProfessionalVisitBlock(row.professionalVisit),
    equipment,
    otherEquipmentRequired:
      typeof row.otherEquipmentRequired === 'string' ? row.otherEquipmentRequired : undefined,
  }
}

export function isCarePlanObjectivesComplete(
  meta: CarePlanObjectivesMetadata | undefined,
  /** Visits shown (from preferred visit times); all when omitted. */
  visitIds?: CarePlanVisitId[] | null,
): boolean {
  if (!meta?.visits) return false
  const shown = visitIds ? CARE_PLAN_VISIT_SECTIONS.filter((s) => visitIds.includes(s.id)) : CARE_PLAN_VISIT_SECTIONS
  return shown.every((section) => {
    const block = meta.visits?.[section.id]
    return Boolean(block?.agreedTask?.trim())
  })
}

/** Visits to show for this IA, read from the Tab 2 "Preferred visit times" answer. */
export function carePlanVisitIdsFromSections(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  meta?: CarePlanObjectivesMetadata,
): CarePlanVisitId[] | null {
  const q = preferredVisitTimesQuestion(sections.flatMap((sec) => sec.questions))
  return carePlanVisitsFromPreferredTimes(q ? answers[q.id]?.selectedOptions : undefined, meta)
}
