import {
  MCA_COMMENTS_FIELD_KEY,
  MCA_FUNCTIONAL_FIELD_KEYS,
  MCA_OUTCOME_FIELD_KEY,
  MCA_TWO_STAGE_FIELD_KEYS,
} from '@/features/service-users/initial-assessment/utils/mca-screening'

export const MCA_SCREENING_OUTCOME_OPTIONS = [
  {
    value: 'has_capacity',
    label:
      'There is a reasonable belief that the person does have capacity to make informed decision regarding the question being asked.',
  },
  {
    value: 'lacks_capacity',
    label:
      'There is reasonable belief that the person does not have capacity to make an informed decision regarding the question being asked.',
  },
] as const

export type McaScreeningOutcomeValue = (typeof MCA_SCREENING_OUTCOME_OPTIONS)[number]['value']

export type McaScreeningStandaloneMetadata = {
  mcaStage1Impairment?: boolean | null
  mcaStage2UnableToDecide?: boolean | null
  mcaFunctionalUnderstand?: boolean | null
  mcaFunctionalRetain?: boolean | null
  mcaFunctionalWeigh?: boolean | null
  mcaFunctionalCommunicate?: boolean | null
  mcaScreeningOutcome?: McaScreeningOutcomeValue | string | null
  mcaScreeningComments?: string
}

export type McaScreeningSnapshotRow = {
  questionId?: string
  fieldKey?: string
  questionText?: string
  answer?: {
    checked?: boolean | null
    booleanValue?: boolean | null
    textValue?: string | null
    selectedOptions?: unknown
  } | null
}

type FieldDef = {
  fieldKey: string
  questionText: string
  kind: 'yesNo' | 'select' | 'textarea'
  required: boolean
}

/** Static MCA field catalogue — mirrors initial-assessment-mca-screening.seed.ts */
export const MCA_SCREENING_FIELD_DEFINITIONS: FieldDef[] = [
  {
    fieldKey: MCA_TWO_STAGE_FIELD_KEYS[0],
    questionText:
      'Does the person have an impairment or disturbance in the functioning of the mind or brain?',
    kind: 'yesNo',
    required: true,
  },
  {
    fieldKey: MCA_TWO_STAGE_FIELD_KEYS[1],
    questionText:
      'Does that impairment or disturbance mean that the person is unable to make the decision in question at the time that it needs to be made?',
    kind: 'yesNo',
    required: true,
  },
  {
    fieldKey: MCA_FUNCTIONAL_FIELD_KEYS[0],
    questionText: 'Can the person understand the provided information relevant to the decision?',
    kind: 'yesNo',
    required: true,
  },
  {
    fieldKey: MCA_FUNCTIONAL_FIELD_KEYS[1],
    questionText: 'Can the person retain the information given?',
    kind: 'yesNo',
    required: true,
  },
  {
    fieldKey: MCA_FUNCTIONAL_FIELD_KEYS[2],
    questionText:
      'Can the person use or weigh the information given as part of their decision making process?',
    kind: 'yesNo',
    required: true,
  },
  {
    fieldKey: MCA_FUNCTIONAL_FIELD_KEYS[3],
    questionText:
      'Can the person communicate their decision? (whether by talking or any other means)',
    kind: 'yesNo',
    required: true,
  },
  {
    fieldKey: MCA_OUTCOME_FIELD_KEY,
    questionText: 'Outcome of the mental capacity screening tool',
    kind: 'select',
    required: true,
  },
  {
    fieldKey: MCA_COMMENTS_FIELD_KEY,
    questionText: 'MCA screening tool comments',
    kind: 'textarea',
    required: false,
  },
]

const FIELD_BY_KEY = new Map(MCA_SCREENING_FIELD_DEFINITIONS.map((d) => [d.fieldKey, d]))

export function defaultMcaScreeningStandaloneMetadata(): McaScreeningStandaloneMetadata {
  return {}
}

function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

function readBooleanAnswer(answer: McaScreeningSnapshotRow['answer']): boolean | null {
  if (!answer) return null
  if (answer.booleanValue === true || answer.checked === true) return true
  if (answer.booleanValue === false || answer.checked === false) return false
  return null
}

function readTextAnswer(answer: McaScreeningSnapshotRow['answer']): string {
  if (!answer) return ''
  if (typeof answer.textValue === 'string') return answer.textValue
  const selected = answer.selectedOptions
  if (Array.isArray(selected) && selected.length > 0) {
    return String(selected[0] ?? '')
  }
  if (selected && typeof selected === 'object' && 'value' in (selected as object)) {
    return String((selected as { value: unknown }).value ?? '')
  }
  return ''
}

export function metadataFromMcaSnapshotRows(rows: unknown): McaScreeningStandaloneMetadata {
  if (!Array.isArray(rows)) return defaultMcaScreeningStandaloneMetadata()

  const meta: McaScreeningStandaloneMetadata = {}
  for (const raw of rows as McaScreeningSnapshotRow[]) {
    const fieldKey =
      raw.fieldKey ??
      (typeof raw.questionId === 'string' && FIELD_BY_KEY.has(raw.questionId)
        ? raw.questionId
        : MCA_SCREENING_FIELD_DEFINITIONS.find(
            (d) => d.questionText === raw.questionText?.trim(),
          )?.fieldKey)

    if (!fieldKey) continue
    const def = FIELD_BY_KEY.get(fieldKey)
    if (!def) continue

    if (def.kind === 'yesNo') {
      const value = readBooleanAnswer(raw.answer)
      ;(meta as Record<string, unknown>)[fieldKey] = value
    } else if (def.kind === 'select') {
      const text = readTextAnswer(raw.answer).trim()
      if (text) meta.mcaScreeningOutcome = text
    } else if (def.kind === 'textarea') {
      meta.mcaScreeningComments = readTextAnswer(raw.answer)
    }
  }
  return meta
}

export function buildMcaSnapshotFromMetadata(
  meta: McaScreeningStandaloneMetadata,
): McaScreeningSnapshotRow[] {
  return MCA_SCREENING_FIELD_DEFINITIONS.map((def) => {
    const raw = (meta as Record<string, unknown>)[def.fieldKey]
    if (def.kind === 'yesNo') {
      const value = typeof raw === 'boolean' ? raw : null
      return {
        fieldKey: def.fieldKey,
        questionText: def.questionText,
        answer:
          value === null
            ? null
            : {
                booleanValue: value,
                checked: value,
              },
      }
    }
    if (def.kind === 'select') {
      const value = typeof raw === 'string' ? raw.trim() : ''
      return {
        fieldKey: def.fieldKey,
        questionText: def.questionText,
        answer: value ? { textValue: value, selectedOptions: [value] } : null,
      }
    }
    const text = typeof raw === 'string' ? raw : ''
    return {
      fieldKey: def.fieldKey,
      questionText: def.questionText,
      answer: text.trim() ? { textValue: text } : null,
    }
  }).filter((row) => row.answer != null)
}

export function normalizeMcaScreeningStandaloneMetadata(
  raw: unknown,
): McaScreeningStandaloneMetadata {
  if (Array.isArray(raw)) return metadataFromMcaSnapshotRows(raw)
  if (!raw || typeof raw !== 'object') return defaultMcaScreeningStandaloneMetadata()
  const row = raw as Record<string, unknown>
  return {
    mcaStage1Impairment:
      typeof row.mcaStage1Impairment === 'boolean' ? row.mcaStage1Impairment : null,
    mcaStage2UnableToDecide:
      typeof row.mcaStage2UnableToDecide === 'boolean' ? row.mcaStage2UnableToDecide : null,
    mcaFunctionalUnderstand:
      typeof row.mcaFunctionalUnderstand === 'boolean' ? row.mcaFunctionalUnderstand : null,
    mcaFunctionalRetain:
      typeof row.mcaFunctionalRetain === 'boolean' ? row.mcaFunctionalRetain : null,
    mcaFunctionalWeigh:
      typeof row.mcaFunctionalWeigh === 'boolean' ? row.mcaFunctionalWeigh : null,
    mcaFunctionalCommunicate:
      typeof row.mcaFunctionalCommunicate === 'boolean' ? row.mcaFunctionalCommunicate : null,
    mcaScreeningOutcome:
      typeof row.mcaScreeningOutcome === 'string' ? row.mcaScreeningOutcome : null,
    mcaScreeningComments:
      typeof row.mcaScreeningComments === 'string' ? row.mcaScreeningComments : '',
  }
}

export function isMcaScreeningStandaloneComplete(
  meta: McaScreeningStandaloneMetadata | undefined,
): boolean {
  if (!meta) return false
  for (const def of MCA_SCREENING_FIELD_DEFINITIONS) {
    if (!def.required) continue
    const raw = (meta as Record<string, unknown>)[def.fieldKey]
    if (def.kind === 'yesNo' && !boolAnswered(raw as boolean | null | undefined)) return false
    if (def.kind === 'select' && (typeof raw !== 'string' || !raw.trim())) return false
  }
  return true
}

export function mcaOutcomeLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return MCA_SCREENING_OUTCOME_OPTIONS.find((o) => o.value === value)?.label ?? value
}
