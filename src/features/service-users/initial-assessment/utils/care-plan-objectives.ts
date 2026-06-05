/** Personalised care/support plan — paper form (holistic tab 16). */

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
  outcomes?: string
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
  {
    id: 'morning',
    title: 'My morning visit',
    instruction: 'explain how expected outcomes are to be achieved',
  },
  {
    id: 'lunch',
    title: 'My lunch visit',
    instruction: 'explain how the expected outcomes are to be achieved',
  },
  {
    id: 'tea',
    title: 'My tea visit',
    instruction: 'explain how the expected outcomes are to be achieved',
  },
  {
    id: 'evening',
    title: 'My evening visit',
    instruction: 'explain how the expected outcomes are to be achieved',
  },
  {
    id: 'night',
    title: 'My night visit',
    instruction: 'explain how the expected outcomes are to be achieved',
  },
]

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

export const CARE_PLAN_PLAN_SUBTITLE =
  'Please include time and objective and outcomes'

function normalizeTaskBlock(raw: unknown): CarePlanTaskBlock {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as CarePlanTaskBlock
  return {
    agreedTask: typeof row.agreedTask === 'string' ? row.agreedTask : undefined,
    objectives: typeof row.objectives === 'string' ? row.objectives : undefined,
    outcomes: typeof row.outcomes === 'string' ? row.outcomes : undefined,
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
): boolean {
  if (!meta?.visits) return false
  return CARE_PLAN_VISIT_SECTIONS.every((section) => {
    const block = meta.visits?.[section.id]
    return Boolean(block?.agreedTask?.trim())
  })
}
