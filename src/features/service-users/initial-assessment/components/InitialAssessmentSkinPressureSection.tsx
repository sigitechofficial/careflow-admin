import { ExternalLink } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { InitialAssessmentSectionQuestions } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionQuestions'
import { sectionElevenIntroCopy } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import { IA_CALLOUT_TEAL_CLASS, IA_SECTION_BODY_CLASS, IA_SECTION_TITLE_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  section: InitialAssessmentSection
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  prefillMap: Map<string, string>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  serviceUserDetail?: ServiceUserDetail | null
  excludeQuestionIds?: Set<string>
  showBodyMapCta?: boolean
  onOpenBodyMap?: () => void
  onOpenWaterlowTab?: () => void
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}

export function InitialAssessmentSkinPressureSection({
  section,
  allSections,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  serviceUserDetail,
  excludeQuestionIds,
  showBodyMapCta,
  onOpenBodyMap,
  onOpenWaterlowTab,
  onChange,
}: Props) {
  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-skin-pressure-section">
      <h2 className={IA_SECTION_TITLE_CLASS}>
        {section.sectionNumber}. {section.title}
      </h2>

      <div className={IA_CALLOUT_TEAL_CLASS}>
        <p className="text-sm text-muted-foreground">{sectionElevenIntroCopy()}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onOpenWaterlowTab ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenWaterlowTab}>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              Open Waterlow tab
            </Button>
          ) : null}
          {showBodyMapCta && onOpenBodyMap ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenBodyMap}>
              Open body map
            </Button>
          ) : null}
        </div>
      </div>

      <InitialAssessmentSectionQuestions
        key={section.id}
        section={section}
        allSections={allSections}
        draftAnswers={draftAnswers}
        prefillMap={prefillMap}
        questionErrors={questionErrors}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        serviceUserDetail={serviceUserDetail}
        excludeQuestionIds={excludeQuestionIds}
        suppressIntro
        onOpenWaterlowTab={onOpenWaterlowTab}
        onChange={onChange}
      />
    </div>
  )
}
