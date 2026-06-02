import * as React from 'react'
import type { ReactNode } from 'react'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { InitialAssessmentEquipmentChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEquipmentChecklistPanel'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { section12PanelTitle } from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type { EquipmentChecklistMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

type Props = {
  adl: AdlWorksheetMetadata
  equipmentQuestions: InitialAssessmentQuestion[]
  equipmentChecklist: EquipmentChecklistMetadata
  equipmentChecklistVisible: boolean
  disabled?: boolean
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  onAdlChange: (next: AdlWorksheetMetadata) => void
  onEquipmentChecklistChange: (next: EquipmentChecklistMetadata) => void
}

export function InitialAssessmentSection12EquipmentPanel({
  adl,
  equipmentQuestions,
  equipmentChecklist,
  equipmentChecklistVisible,
  disabled,
  renderField,
  onAdlChange,
  onEquipmentChecklistChange,
}: Props) {
  const patchAdl = (next: AdlWorksheetMetadata) => onAdlChange(next)

  return (
    <InitialAssessmentSection12PanelShell
      title={section12PanelTitle('12.8')}
      hint="Day-to-day aids, clinical equipment, and hoist or bed servicing where applicable."
      testId="ia-section-12-equipment"
    >
      <InitialAssessmentPaperYesNoRow
        label="Are mobility aids in use or required?"
        name="adl-mobility-aids"
        value={adl.mobilityAidsRequired ?? null}
        disabled={disabled}
        showDivider={false}
        onChange={(v) =>
          patchAdl({
            ...adl,
            mobilityAidsRequired: v,
            mobilityAidsList: v ? adl.mobilityAidsList : '',
          })
        }
      />
      {adl.mobilityAidsRequired === true ? (
        <InitialAssessmentSection12FieldRow>
          <Label htmlFor="adl-mobility-aids-list" className="text-[13px] font-medium">
            Mobility aids list
          </Label>
          <Input
            id="adl-mobility-aids-list"
            className="mt-1.5 h-9 text-sm"
            disabled={disabled}
            placeholder="e.g. walking frame, wheelchair, profiling bed"
            value={adl.mobilityAidsList ?? ''}
            onChange={(e) => patchAdl({ ...adl, mobilityAidsList: e.target.value })}
          />
        </InitialAssessmentSection12FieldRow>
      ) : null}

      {equipmentQuestions.map((q) => (
        <InitialAssessmentSection12FieldRow key={q.id}>{renderField(q)}</InitialAssessmentSection12FieldRow>
      ))}

      {equipmentChecklistVisible ? (
        <InitialAssessmentSection12FieldRow>
          <InitialAssessmentEquipmentChecklistPanel
            embedded
            visible
            value={equipmentChecklist}
            disabled={disabled}
            onChange={onEquipmentChecklistChange}
          />
        </InitialAssessmentSection12FieldRow>
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}
