/** Moving and handling operations — client risk filter worksheet (holistic tab 9). */

export type MovingHandlingCapability = 'independent' | 'supervision' | 'assistance'

export type MovingHandlingTaskId =
  | 'walking'
  | 'gettingInOutOfBed'
  | 'transfersBedToChair'
  | 'moveUpBed'
  | 'toileting'
  | 'bathOrShower'

export type BathType = 'standard' | 'assisted'

export type MovingHandlingTaskRow = {
  capability?: MovingHandlingCapability | null
  staffCount?: number | null
  methods?: string[]
  bathType?: BathType | null
}

export type MovingHandlingRiskFilter = {
  historyOfFalls?: boolean | null
  unsteadyMobilising?: boolean | null
  anxiousAboutFalls?: boolean | null
  confused?: boolean | null
  aged65PlusFallRiskMeds?: boolean | null
  sensoryOrMotorImpairment?: boolean | null
  totallyIndependentLowRisk?: boolean | null
}

export type MovingHandlingOperationsMetadata = {
  riskFilter?: MovingHandlingRiskFilter
  tasks?: Partial<Record<MovingHandlingTaskId, MovingHandlingTaskRow>>
}

export const MOVING_HANDLING_RISK_FILTER_QUESTIONS = [
  {
    id: 'historyOfFalls',
    label: 'Have I had any falls in the 12 months before my care started?',
  },
  {
    id: 'unsteadyMobilising',
    label: 'Am I unsteady when I move about on my own?',
  },
  {
    id: 'anxiousAboutFalls',
    label: 'Am I, or are my relatives, anxious about me falling?',
  },
  {
    id: 'confused',
    label: 'Am I confused?',
  },
  {
    id: 'aged65PlusFallRiskMeds',
    label:
      'Am I aged 65 or older and taking any medicines that may increase my risk of falls? If I am under 65, please use clinical judgement, as I may still be at risk of falls.',
  },
  {
    id: 'sensoryOrMotorImpairment',
    label: 'Do I have any sensory or motor impairment?',
  },
] as const

export type MovingHandlingRiskFilterId =
  (typeof MOVING_HANDLING_RISK_FILTER_QUESTIONS)[number]['id']

export const MOVING_HANDLING_LOW_RISK_NOTE =
  'I am totally independent with all tasks and have no risk factors. (Assessor: tick, and record low risk in the evaluation.)'

export const MOVING_HANDLING_TASK_DEFINITIONS: ReadonlyArray<{
  id: MovingHandlingTaskId
  label: string
  methods: ReadonlyArray<{ id: string; label: string }>
  bathTypeOptions?: boolean
}> = [
  {
    id: 'walking',
    label: 'Walking',
    methods: [{ id: 'walkingAid', label: 'Walking aid' }],
  },
  {
    id: 'gettingInOutOfBed',
    label: 'Getting in/out of bed',
    methods: [
      { id: 'hoist', label: 'Hoist' },
      { id: 'legLifter', label: 'Leg lifter' },
      { id: 'slidingSheets', label: 'Sliding sheets' },
      { id: 'ropeLadder', label: 'Rope ladder' },
    ],
  },
  {
    id: 'transfersBedToChair',
    label: 'Transfers bed to chair or commode etc.',
    methods: [
      { id: 'hoist', label: 'Hoist' },
      { id: 'patslideSlidingSheets', label: 'Patslide + Sliding sheets' },
    ],
  },
  {
    id: 'moveUpBed',
    label: 'Move up the bed',
    methods: [
      { id: 'hoist', label: 'Hoist' },
      { id: 'slidingSheets', label: 'Sliding sheets' },
    ],
  },
  {
    id: 'toileting',
    label: 'Toileting',
    methods: [
      { id: 'commode', label: 'Commode' },
      { id: 'hoist', label: 'Hoist' },
      { id: 'bathBoard', label: 'Bath board' },
      { id: 'transferBoard', label: 'Transfer board' },
    ],
  },
  {
    id: 'bathOrShower',
    label: 'Bath or Shower',
    methods: [
      { id: 'showerChair', label: 'Shower Chair' },
      { id: 'bathBoard', label: 'Bath board' },
    ],
    bathTypeOptions: true,
  },
]

export const MOVING_HANDLING_FOOTER_NOTES = [
  'Please review my Client Handling Assessment every 6 months, or sooner if my condition changes.',
  'Please re-assess me if there is a significant change in my condition.',
] as const

const RISK_FILTER_FIELD_MAP: Record<
  MovingHandlingRiskFilterId,
  keyof MovingHandlingRiskFilter
> = {
  historyOfFalls: 'historyOfFalls',
  unsteadyMobilising: 'unsteadyMobilising',
  anxiousAboutFalls: 'anxiousAboutFalls',
  confused: 'confused',
  aged65PlusFallRiskMeds: 'aged65PlusFallRiskMeds',
  sensoryOrMotorImpairment: 'sensoryOrMotorImpairment',
}

export function movingHandlingRiskFilterValue(
  meta: MovingHandlingOperationsMetadata,
  id: MovingHandlingRiskFilterId,
): boolean | null | undefined {
  const field = RISK_FILTER_FIELD_MAP[id]
  return meta.riskFilter?.[field]
}

export function movingHandlingTaskRow(
  meta: MovingHandlingOperationsMetadata,
  taskId: MovingHandlingTaskId,
): MovingHandlingTaskRow {
  return meta.tasks?.[taskId] ?? {}
}

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function isMovingHandlingRiskFilterComplete(
  meta: MovingHandlingOperationsMetadata | undefined,
): boolean {
  if (!meta?.riskFilter) return false
  const answered = MOVING_HANDLING_RISK_FILTER_QUESTIONS.every((q) =>
    boolAnswered(movingHandlingRiskFilterValue(meta, q.id)),
  )
  if (!answered) return false
  if (meta.riskFilter.totallyIndependentLowRisk === true) return true
  return MOVING_HANDLING_TASK_DEFINITIONS.every((task) => {
    const row = movingHandlingTaskRow(meta, task.id)
    return row.capability != null
  })
}

export function isMovingHandlingOperationsComplete(
  meta: MovingHandlingOperationsMetadata | undefined,
): boolean {
  return isMovingHandlingRiskFilterComplete(meta)
}

export function defaultMovingHandlingOperationsMetadata(): MovingHandlingOperationsMetadata {
  return {}
}

export function normalizeMovingHandlingOperationsMetadata(
  raw: unknown,
): MovingHandlingOperationsMetadata {
  if (!raw || typeof raw !== 'object') return defaultMovingHandlingOperationsMetadata()
  const row = raw as MovingHandlingOperationsMetadata
  return {
    riskFilter: row.riskFilter ? { ...row.riskFilter } : undefined,
    tasks: row.tasks ? { ...row.tasks } : undefined,
  }
}

export function toggleMovingHandlingMethod(
  methods: string[] | undefined,
  methodId: string,
  checked: boolean,
): string[] {
  const set = new Set(methods ?? [])
  if (checked) set.add(methodId)
  else set.delete(methodId)
  return [...set]
}
