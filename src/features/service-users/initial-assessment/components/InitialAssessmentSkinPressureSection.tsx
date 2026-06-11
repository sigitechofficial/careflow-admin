import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { initialAssessmentBodyMapSearch } from '@/features/service-users/initial-assessment/utils/body-map-navigation'
import { InitialAssessmentSectionQuestions } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionQuestions'
import { holisticTabTitle } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import type { HolisticAssessmentTab } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
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
  onOpenWaterlowTab?: () => void
  sectionFooter?: { dateCompleted?: string; assessorNameDesignation?: string }
  onSectionFooterChange?: (patch: {
    dateCompleted?: string
    assessorNameDesignation?: string
  }) => void
  holisticTab?: HolisticAssessmentTab
  suppressTitle?: boolean
  suppressIntroCallout?: boolean
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
  onOpenWaterlowTab,
  sectionFooter,
  onSectionFooterChange,
  holisticTab,
  suppressTitle,
  suppressIntroCallout,
  onChange,
}: Props) {
  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-skin-pressure-section">
      {!suppressTitle ? (
        <h2 className={IA_SECTION_TITLE_CLASS}>
          {holisticTab?.id ?? section.sectionNumber}.{' '}
          {holisticTab ? holisticTabTitle(holisticTab.id) : section.title}
        </h2>
      ) : null}

      {!suppressIntroCallout ? (
        <div className={IA_CALLOUT_TEAL_CLASS}>
          <p className="text-sm text-muted-foreground">{sectionElevenIntroCopy()}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onOpenWaterlowTab ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenWaterlowTab}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Open Waterlow tab
              </Button>
            ) : null}
            {showBodyMapCta && serviceUserId ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link
                  to="/service-users/$serviceUserId/body-map"
                  params={{ serviceUserId }}
                  search={initialAssessmentBodyMapSearch(submissionId)}
                >
                  Open body map
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

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
        sectionFooter={sectionFooter}
        onSectionFooterChange={onSectionFooterChange}
        holisticTab={holisticTab}
        onChange={onChange}
      />
    </div>
  )
}
