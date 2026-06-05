/** Social and clinical assessment outcome summary — paper table (holistic tab 15). */

export const CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT = 6

export type ClinicalOutcomeRowId =
  | 'waterlow'
  | 'must'
  | 'pain'
  | 'movingHandling'
  | 'skinIntegrity'
  | 'bloodPressure'
  | 'pulseRate'
  | 'pulseRhythm'
  | 'o2Saturations'
  | 'respirationRate'
  | 'temperature'
  | 'others'

export type ClinicalOutcomeSummaryColumn = {
  assessmentDate?: string
  practitioner?: string
}

export type ClinicalOutcomeSummaryRowData = {
  initial?: string
  reviews?: string[]
}

export type ClinicalAssessmentOutcomeSummaryMetadata = {
  initial?: ClinicalOutcomeSummaryColumn
  reviews?: ClinicalOutcomeSummaryColumn[]
  rows?: Partial<Record<ClinicalOutcomeRowId, ClinicalOutcomeSummaryRowData>>
}

export const CLINICAL_OUTCOME_SUMMARY_ROWS: {
  id: ClinicalOutcomeRowId
  label: string
}[] = [
  { id: 'waterlow', label: 'Waterlow' },
  { id: 'must', label: 'MUST' },
  {
    id: 'pain',
    label: 'Pain (state tool used in assessment)',
  },
  { id: 'movingHandling', label: 'Moving and Handling' },
  {
    id: 'skinIntegrity',
    label:
      'Skin integrity (please sign to indicate completion, full results to be documented on skin integrity check record)',
  },
  { id: 'bloodPressure', label: 'Blood pressure' },
  { id: 'pulseRate', label: 'Pulse rate' },
  { id: 'pulseRhythm', label: 'Pulse rhythm (irregular/regular)' },
  { id: 'o2Saturations', label: 'O2 Saturations' },
  { id: 'respirationRate', label: 'Respiration rate' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'others', label: 'Others, please state:' },
]

export function defaultClinicalAssessmentOutcomeSummaryMetadata(): ClinicalAssessmentOutcomeSummaryMetadata {
  return {
    initial: {},
    reviews: Array.from({ length: CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT }, () => ({})),
    rows: {},
  }
}

function normalizeColumn(raw: unknown): ClinicalOutcomeSummaryColumn {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as ClinicalOutcomeSummaryColumn
  return {
    assessmentDate:
      typeof row.assessmentDate === 'string' ? row.assessmentDate : undefined,
    practitioner: typeof row.practitioner === 'string' ? row.practitioner : undefined,
  }
}

function normalizeRowData(raw: unknown): ClinicalOutcomeSummaryRowData {
  if (!raw || typeof raw !== 'object') return { reviews: [] }
  const row = raw as ClinicalOutcomeSummaryRowData
  const reviews = Array.isArray(row.reviews)
    ? row.reviews.map((v) => (typeof v === 'string' ? v : ''))
    : []
  return {
    initial: typeof row.initial === 'string' ? row.initial : undefined,
    reviews: Array.from({ length: CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT }, (_, i) => reviews[i] ?? ''),
  }
}

export function normalizeClinicalAssessmentOutcomeSummaryMetadata(
  raw: unknown,
): ClinicalAssessmentOutcomeSummaryMetadata {
  if (!raw || typeof raw !== 'object') return defaultClinicalAssessmentOutcomeSummaryMetadata()
  const row = raw as ClinicalAssessmentOutcomeSummaryMetadata

  const reviewsRaw = Array.isArray(row.reviews) ? row.reviews : []
  const reviews = Array.from({ length: CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT }, (_, i) =>
    normalizeColumn(reviewsRaw[i]),
  )

  const rows: Partial<Record<ClinicalOutcomeRowId, ClinicalOutcomeSummaryRowData>> = {}
  if (row.rows && typeof row.rows === 'object') {
    for (const def of CLINICAL_OUTCOME_SUMMARY_ROWS) {
      if (def.id in row.rows) {
        rows[def.id] = normalizeRowData(row.rows[def.id])
      }
    }
  }

  return {
    initial: normalizeColumn(row.initial),
    reviews,
    rows,
  }
}

export function clinicalOutcomeRowValue(
  meta: ClinicalAssessmentOutcomeSummaryMetadata,
  rowId: ClinicalOutcomeRowId,
  column: 'initial' | number,
): string {
  const row = meta.rows?.[rowId]
  if (!row) return ''
  if (column === 'initial') return row.initial ?? ''
  return row.reviews?.[column] ?? ''
}

export function isClinicalAssessmentOutcomeSummaryComplete(
  meta: ClinicalAssessmentOutcomeSummaryMetadata | undefined,
): boolean {
  if (!meta?.initial?.assessmentDate?.trim()) return false
  if (!meta.initial.practitioner?.trim()) return false
  return true
}
