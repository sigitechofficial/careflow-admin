import * as React from 'react'
import type { ReactNode } from 'react'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { section12PanelTitle } from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'

type Props = {
  value: AdlWorksheetMetadata
  disabled?: boolean
  fallsQuestions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  onChange: (next: AdlWorksheetMetadata) => void
}

export function InitialAssessmentFallsMobilityPanel({
  value,
  disabled,
  fallsQuestions,
  renderField,
  onChange,
}: Props) {
  const patch = (next: AdlWorksheetMetadata) => onChange(next)

  return (
    <InitialAssessmentSection12PanelShell title={section12PanelTitle('12.7')} testId="ia-falls-panel">
      <InitialAssessmentPaperYesNoRow
        label="Falls trigger assessment completed?"
        name="adl-falls-completed"
        value={value.fallsAssessmentCompleted ?? null}
        disabled={disabled}
        showDivider={false}
        onChange={(v) =>
          patch({
            ...value,
            fallsAssessmentCompleted: v,
            fallsAssessmentDate: v ? value.fallsAssessmentDate : null,
          })
        }
        dateLabel="Date:"
        dateValue={value.fallsAssessmentDate ?? undefined}
        dateDisabled={value.fallsAssessmentCompleted !== true}
        onDateChange={(d) => patch({ ...value, fallsAssessmentDate: d || null })}
      />
      {fallsQuestions.map((q) => (
        <InitialAssessmentSection12FieldRow key={q.id}>{renderField(q)}</InitialAssessmentSection12FieldRow>
      ))}
    </InitialAssessmentSection12PanelShell>
  )
}
