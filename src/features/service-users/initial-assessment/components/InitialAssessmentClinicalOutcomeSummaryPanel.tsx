import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  HOLISTIC_SECTION_SHELL_CLASS,
  HOLISTIC_TABLE_CELL_CLASS,
  HOLISTIC_TABLE_CLASS,
  HOLISTIC_TABLE_HEAD_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT,
  CLINICAL_OUTCOME_SUMMARY_ROWS,
  type ClinicalAssessmentOutcomeSummaryMetadata,
  type ClinicalOutcomeRowId,
  type ClinicalOutcomeSummaryColumn,
} from '@/features/service-users/initial-assessment/utils/clinical-assessment-outcome-summary'
import { IA_SECTION_BODY_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: ClinicalAssessmentOutcomeSummaryMetadata
  disabled?: boolean
  onChange: (next: ClinicalAssessmentOutcomeSummaryMetadata) => void
  /** Review columns are for reviews / reassessments; the initial IA shows the baseline only. */
  showReviewColumns?: boolean
}

function ColumnHeaderFields({
  title,
  column,
  disabled,
  dateId,
  practitionerId,
  onChange,
}: {
  title: string
  column: ClinicalOutcomeSummaryColumn
  disabled?: boolean
  dateId: string
  practitionerId: string
  onChange: (next: ClinicalOutcomeSummaryColumn) => void
}) {
  return (
    <div className="space-y-2 text-left text-xs font-normal">
      <p className="font-semibold text-foreground">{title}</p>
      <div className="space-y-1">
        <Label htmlFor={dateId} className="text-xs text-muted-foreground">
          Date
        </Label>
        <Input
          id={dateId}
          type="date"
          className="h-9 w-full min-w-[8.5rem] text-sm"
          disabled={disabled}
          value={column.assessmentDate?.slice(0, 10) ?? ''}
          onChange={(e) =>
            onChange({
              ...column,
              assessmentDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={practitionerId} className="text-xs text-muted-foreground">
          Practitioner
        </Label>
        <Input
          id={practitionerId}
          className="h-9 w-full min-w-[8.5rem] text-sm"
          disabled={disabled}
          value={column.practitioner ?? ''}
          onChange={(e) => onChange({ ...column, practitioner: e.target.value })}
        />
      </div>
    </div>
  )
}

export function InitialAssessmentClinicalOutcomeSummaryPanel({
  value,
  disabled,
  onChange,
  showReviewColumns = true,
}: Props) {
  const reviewColumnCount = showReviewColumns ? CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT : 0
  const initial = value.initial ?? {}
  const reviews =
    value.reviews ??
    Array.from({ length: CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT }, () => ({}))

  const patchInitial = (next: ClinicalOutcomeSummaryColumn) =>
    onChange({ ...value, initial: next })

  const patchReview = (index: number, next: ClinicalOutcomeSummaryColumn) => {
    const nextReviews = [...reviews]
    nextReviews[index] = next
    onChange({ ...value, reviews: nextReviews })
  }

  const patchCell = (rowId: ClinicalOutcomeRowId, column: 'initial' | number, cellValue: string) => {
    const existing = value.rows?.[rowId] ?? { reviews: [] }
    const nextReviews = [...(existing.reviews ?? [])]
    while (nextReviews.length < CLINICAL_OUTCOME_REVIEW_COLUMN_COUNT) nextReviews.push('')

    if (column === 'initial') {
      onChange({
        ...value,
        rows: {
          ...value.rows,
          [rowId]: { ...existing, initial: cellValue },
        },
      })
      return
    }

    nextReviews[column] = cellValue
    onChange({
      ...value,
      rows: {
        ...value.rows,
        [rowId]: { ...existing, reviews: nextReviews },
      },
    })
  }

  const cellValue = (rowId: ClinicalOutcomeRowId, column: 'initial' | number): string => {
    const row = value.rows?.[rowId]
    if (!row) return ''
    if (column === 'initial') return row.initial ?? ''
    return row.reviews?.[column] ?? ''
  }

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-clinical-outcome-summary-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader
          title="Clinical outcome summary (baseline)"
          subtitle="Filled from the worksheets and baseline vitals in this assessment; empty cells only."
        />

        <div className="overflow-x-auto border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <table className={cn(HOLISTIC_TABLE_CLASS, reviewColumnCount ? 'min-w-[72rem]' : 'min-w-[32rem]')}>
            <thead>
              <tr>
                <th className={cn(HOLISTIC_TABLE_HEAD_CLASS, 'w-[18rem] align-top')}>
                  Clinical Activity
                </th>
                <th className={cn(HOLISTIC_TABLE_HEAD_CLASS, 'min-w-[10rem] align-top')}>
                  <ColumnHeaderFields
                    title="Initial Assessment"
                    column={initial}
                    disabled={disabled}
                    dateId="clinical-outcome-initial-date"
                    practitionerId="clinical-outcome-initial-practitioner"
                    onChange={patchInitial}
                  />
                </th>
                {Array.from({ length: reviewColumnCount }, (_, index) => (
                  <th
                    key={index}
                    className={cn(HOLISTIC_TABLE_HEAD_CLASS, 'min-w-[10rem] align-top')}
                  >
                    <ColumnHeaderFields
                      title="Review Assessment"
                      column={reviews[index] ?? {}}
                      disabled={disabled}
                      dateId={`clinical-outcome-review-${index}-date`}
                      practitionerId={`clinical-outcome-review-${index}-practitioner`}
                      onChange={(next) => patchReview(index, next)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLINICAL_OUTCOME_SUMMARY_ROWS.map((row) => (
                <tr key={row.id}>
                  <td className={cn(HOLISTIC_TABLE_CELL_CLASS, 'text-sm font-medium')}>
                    {row.label}
                  </td>
                  <td className={HOLISTIC_TABLE_CELL_CLASS}>
                    <Input
                      className="h-9 w-full text-sm"
                      disabled={disabled}
                      aria-label={`${row.label} — initial assessment`}
                      value={cellValue(row.id, 'initial')}
                      onChange={(e) => patchCell(row.id, 'initial', e.target.value)}
                    />
                  </td>
                  {Array.from({ length: reviewColumnCount }, (_, index) => (
                    <td key={index} className={HOLISTIC_TABLE_CELL_CLASS}>
                      <Input
                        className="h-9 w-full text-sm"
                        disabled={disabled}
                        aria-label={`${row.label} — review ${index + 1}`}
                        value={cellValue(row.id, index)}
                        onChange={(e) => patchCell(row.id, index, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
