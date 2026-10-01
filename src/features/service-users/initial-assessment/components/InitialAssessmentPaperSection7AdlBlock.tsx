import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { Label } from '@/shared/ui/form-field'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { InitialAssessmentAdlWorksheetPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAdlWorksheetPanel'
import { InitialAssessmentDailyLivingAidsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentDailyLivingAidsPanel'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'
import { InitialAssessmentSection12FieldRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import {
  IA_CALLOUT_TEAL_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'
import { PAPER_SECTION_7_ADL_TITLE } from '@/features/service-users/initial-assessment/utils/section-7-adl-display-order'
import { enrichAdlWorksheetFromAnswers } from '@/features/service-users/initial-assessment/utils/section-12-adl-footer'
import type { DailyLivingAidsMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

type Props = {
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  disabled?: boolean
  adl: AdlWorksheetMetadata
  dailyLivingAids: DailyLivingAidsMetadata
  onAdlChange: (next: AdlWorksheetMetadata) => void
  onDailyLivingAidsChange: (next: DailyLivingAidsMetadata) => void
  onOpenFallsScreeningTab?: () => void
}

export function InitialAssessmentPaperSection7AdlBlock({
  sections,
  draftAnswers,
  disabled,
  adl,
  dailyLivingAids,
  onAdlChange,
  onDailyLivingAidsChange,
  onOpenFallsScreeningTab,
}: Props) {
  const section12 = sections.find((s) => s.sectionNumber === 12)
  const adlDisplay = React.useMemo(
    () => enrichAdlWorksheetFromAnswers(adl, section12?.questions ?? [], draftAnswers),
    [adl, section12?.questions, draftAnswers],
  )

  const patchAdl = (next: AdlWorksheetMetadata) => onAdlChange(next)

  return (
    <HolisticCollapsibleSection title={PAPER_SECTION_7_ADL_TITLE} testId="ia-paper-section-7-adl">
      <div className="space-y-5">
        <InitialAssessmentAdlWorksheetPanel
          section="scores"
          embedded
          paperLabels
          value={adlDisplay}
          disabled={disabled}
          onChange={patchAdl}
        />

        <InitialAssessmentAdlWorksheetPanel
          section="total"
          embedded
          includeComments={false}
          value={adlDisplay}
          disabled={disabled}
          onChange={patchAdl}
        />

        {/* Falls status is derived from the Falls tab (§12.7 case-finding + screen) — not a manual answer. */}
        <div className={cn(IA_CALLOUT_TEAL_CLASS, 'text-sm')} data-testid="ia-adl-falls-status">
          <p className="font-medium text-teal-950 dark:text-teal-100">
            {adlDisplay.fallsAssessmentCompleted === true
              ? `Falls assessment completed${adlDisplay.fallsAssessmentDate ? ` on ${adlDisplay.fallsAssessmentDate}` : ''}.`
              : 'Falls history, concerns and the falls screen are recorded on the Falls Screening tab.'}
          </p>
          {onOpenFallsScreeningTab ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onOpenFallsScreeningTab}
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              Open Falls Screening
            </Button>
          ) : null}
        </div>

        <InitialAssessmentYesNoCardField
          label="Are mobility aids in use or required?"
          name="paper-adl-mobility-aids"
          value={adlDisplay.mobilityAidsRequired ?? null}
          disabled={disabled}
          showDivider={false}
          onChange={(v) =>
            patchAdl({
              ...adlDisplay,
              mobilityAidsRequired: v,
              mobilityAidsList: v ? adlDisplay.mobilityAidsList : '',
            })
          }
        />

        {adlDisplay.mobilityAidsRequired === true ? (
          <InitialAssessmentSection12FieldRow>
            <Label htmlFor="paper-adl-mobility-aids-list" className={IA_QUESTION_LABEL_CLASS}>
              Please list
            </Label>
            <Input
              id="paper-adl-mobility-aids-list"
              className="mt-1.5 h-9 text-sm"
              disabled={disabled}
              placeholder="e.g. walking frame, wheelchair, profiling bed"
              value={adlDisplay.mobilityAidsList ?? ''}
              onChange={(e) => patchAdl({ ...adlDisplay, mobilityAidsList: e.target.value })}
            />
          </InitialAssessmentSection12FieldRow>
        ) : null}

        <InitialAssessmentDailyLivingAidsPanel
          embedded
          paperSection7
          part="aids"
          value={dailyLivingAids}
          disabled={disabled}
          onChange={onDailyLivingAidsChange}
        />

        <div className="space-y-1">
          <Label htmlFor="paper-adl-additional-comments" className={IA_QUESTION_LABEL_CLASS}>
            Activities of daily living additional comments
          </Label>
          <Textarea
            id="paper-adl-additional-comments"
            disabled={disabled}
            rows={3}
            className={IA_FORM_TEXTAREA_COMPACT_CLASS}
            placeholder="Optional"
            value={adlDisplay.additionalComments ?? ''}
            onChange={(e) =>
              patchAdl({
                ...adlDisplay,
                additionalComments: e.target.value,
              })
            }
          />
        </div>

        <InitialAssessmentDailyLivingAidsPanel
          embedded
          paperSection7
          part="equipment"
          value={dailyLivingAids}
          disabled={disabled}
          onChange={onDailyLivingAidsChange}
        />
      </div>
    </HolisticCollapsibleSection>
  )
}
