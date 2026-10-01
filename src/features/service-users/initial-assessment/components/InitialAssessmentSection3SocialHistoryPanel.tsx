import type { ReactNode } from 'react'
import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { InitialAssessmentFieldRenderOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'
import { groupedYesNoFieldOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'

const SOCIAL_HISTORY_ORDER = [
  'Family, representative, next of kin, advocate, key contacts',
  'Representative relationship',
  'Representative involved in assessment?',
  'Representative name',
  'Does the client receive support from an informal carer?',
  'Informal carer name',
  'Informal carer contact (if different)',
  'Is the client receiving a care package?',
  'Care package comments',
  'Details of other care agencies involved with client',
  'Does the carer require a carer’s assessment?',
  'Carer assessment referral made?',
  'Carer assessment referral date',
  'Type of living accommodation',
  'Other accommodation (please state)',
  'Does the client live alone?',
  'Is client able to answer front door?',
  'Key safe present?',
  'Access instructions for staff',
  'Door entry code (secure — from DOM Care)',
  'Key safe location',
  'Any identified risks to visiting staff members?',
  'Lifestyle, role and choices',
] as const

type Props = {
  group: SpecRefGroup
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  renderField: (q: InitialAssessmentQuestion, fieldOptions?: InitialAssessmentFieldRenderOptions) => ReactNode
  renderMultiSelect?: (q: InitialAssessmentQuestion) => ReactNode
  onOpenEnvironmentAssessmentTab?: () => void
}

function normalizeQuestionText(text: string): string {
  return text
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function byPaperOrder(questions: InitialAssessmentQuestion[]): InitialAssessmentQuestion[] {
  const byText = new Map(questions.map((q) => [normalizeQuestionText(q.questionText), q]))
  const ordered: InitialAssessmentQuestion[] = []
  for (const text of SOCIAL_HISTORY_ORDER) {
    const q = byText.get(normalizeQuestionText(text))
    if (q) ordered.push(q)
  }
  for (const q of questions) {
    if (!ordered.includes(q)) ordered.push(q)
  }
  return ordered
}

function renderQuestion(
  q: InitialAssessmentQuestion,
  renderField: Props['renderField'],
  renderMultiSelect?: Props['renderMultiSelect'],
  fieldOptions?: InitialAssessmentFieldRenderOptions,
) {
  if (q.questionType === 'MULTI_SELECT' && renderMultiSelect) return renderMultiSelect(q)
  const fieldKey =
    q.metadata && typeof q.metadata === 'object' && !Array.isArray(q.metadata)
      ? (q.metadata as Record<string, unknown>).fieldKey
      : undefined
  if (fieldKey === 'accommodationType' && renderMultiSelect) return renderMultiSelect(q)
  return renderField(q, fieldOptions)
}

export function InitialAssessmentSection3SocialHistoryPanel({
  group,
  allSections,
  renderField,
  renderMultiSelect,
}: Props) {
  const questions = byPaperOrder(group.questions)
  const section3Questions =
    allSections.find((s) => s.sectionNumber === 3)?.questions ?? []

  const find = (text: string) =>
    questions.find((q) => normalizeQuestionText(q.questionText) === normalizeQuestionText(text))

  const findSec3ByField = (fieldKey: string) =>
    section3Questions.find((q) => fieldKeyOf(q) === fieldKey)

  const nextOfKin = find('Family, representative, next of kin, advocate, key contacts')
  const relationship = find('Representative relationship')
  const repInvolved = find('Representative involved in assessment?')
  const repName = find('Representative name')
  const informalCarer = find('Does the client receive support from an informal carer?')
  const informalCarerName = find('Informal carer name')
  const informalCarerContact = find('Informal carer contact (if different)')
  const carePackage = find('Is the client receiving a care package?')
  const carePackageComments = find('Care package comments')
  const otherAgencies = find('Details of other care agencies involved with client')
  const carerAssessment = find('Does the carer require a carer’s assessment?')
  const referralMade = find('Carer assessment referral made?')
  const referralDate = find('Carer assessment referral date')
  const accommodation = find('Type of living accommodation')
  const accommodationOther = find('Other accommodation (please state)')
  const livesAlone = find('Does the client live alone?')
  const frontDoor = find('Is client able to answer front door?')
  const keySafePresent =
    questions.find((q) => fieldKeyOf(q) === 'keySafePresentHolistic') ?? find('Key safe present?')
  const accessInstructions =
    findSec3ByField('accessInstructions') ??
    section3Questions.find((q) =>
      normalizeQuestionText(q.questionText).includes('access instructions for staff'),
    )
  const doorCode = findSec3ByField('doorCode')
  const keySafeLocation = findSec3ByField('keySafeLocation')
  const staffRisks = find('Any identified risks to visiting staff members?')
  const lifestyle = find('Lifestyle, role and choices')

  const placed = new Set(
    [
      nextOfKin,
      relationship,
      repInvolved,
      repName,
      informalCarer,
      informalCarerName,
      informalCarerContact,
      carePackage,
      carePackageComments,
      otherAgencies,
      carerAssessment,
      referralMade,
      referralDate,
      accommodation,
      accommodationOther,
      livesAlone,
      frontDoor,
      keySafePresent,
      accessInstructions,
      doorCode,
      keySafeLocation,
      staffRisks,
      lifestyle,
    ].filter((q): q is InitialAssessmentQuestion => Boolean(q)),
  )
  const fallbackQuestions = questions.filter((q) => !placed.has(q))

  return (
    <HolisticCollapsibleSection
      title="Section 3 — Social history"
      subtitle="Next of kin, informal carers, accommodation, property access, and lifestyle."
      testId="ia-section3-social-history"
      bodyClassName="space-y-5"
    >
      <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
            {nextOfKin ? renderQuestion(nextOfKin, renderField, renderMultiSelect) : null}
            {relationship ? renderQuestion(relationship, renderField, renderMultiSelect) : null}
          </div>
          <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
            {informalCarer
              ? renderQuestion(informalCarer, renderField, renderMultiSelect, groupedYesNoFieldOptions(informalCarer))
              : null}
            {informalCarerName ? renderQuestion(informalCarerName, renderField, renderMultiSelect) : null}
            {informalCarerContact ? renderQuestion(informalCarerContact, renderField, renderMultiSelect) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
            {carePackage
              ? renderQuestion(carePackage, renderField, renderMultiSelect, groupedYesNoFieldOptions(carePackage))
              : null}
            {carePackageComments ? renderQuestion(carePackageComments, renderField, renderMultiSelect) : null}
          </div>
          <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
            {carerAssessment
              ? renderQuestion(carerAssessment, renderField, renderMultiSelect, groupedYesNoFieldOptions(carerAssessment))
              : null}
            {referralMade
              ? renderQuestion(referralMade, renderField, renderMultiSelect, groupedYesNoFieldOptions(referralMade))
              : null}
            {referralDate ? renderQuestion(referralDate, renderField, renderMultiSelect) : null}
          </div>
        </div>

        {otherAgencies ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            {renderQuestion(otherAgencies, renderField, renderMultiSelect)}
          </div>
        ) : null}

        <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Type of living accommodation</p>
          {accommodation ? renderQuestion(accommodation, renderField, renderMultiSelect) : null}
          {accommodationOther ? renderQuestion(accommodationOther, renderField, renderMultiSelect) : null}
        </div>

        <div className="space-y-4">
          {livesAlone ? (
            <div>
              {renderQuestion(livesAlone, renderField, renderMultiSelect, groupedYesNoFieldOptions(livesAlone))}
            </div>
          ) : null}
          {frontDoor ? (
            <div>
              {renderQuestion(frontDoor, renderField, renderMultiSelect, groupedYesNoFieldOptions(frontDoor))}
            </div>
          ) : null}
          {keySafePresent ? (
            <div>
              {renderQuestion(
                keySafePresent,
                renderField,
                renderMultiSelect,
                groupedYesNoFieldOptions(keySafePresent),
              )}
            </div>
          ) : null}
          {keySafeLocation ? <div>{renderQuestion(keySafeLocation, renderField, renderMultiSelect)}</div> : null}
          {doorCode ? <div>{renderQuestion(doorCode, renderField, renderMultiSelect)}</div> : null}
          {accessInstructions ? (
            <div>{renderQuestion(accessInstructions, renderField, renderMultiSelect)}</div>
          ) : null}
        </div>
        {staffRisks ? <div>{renderQuestion(staffRisks, renderField, renderMultiSelect)}</div> : null}
        {lifestyle ? <div>{renderQuestion(lifestyle, renderField, renderMultiSelect)}</div> : null}

        {repInvolved || repName ? (
          <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
            {repInvolved ? <div>{renderQuestion(repInvolved, renderField, renderMultiSelect)}</div> : null}
            {repName ? <div>{renderQuestion(repName, renderField, renderMultiSelect)}</div> : null}
          </div>
        ) : null}

        {fallbackQuestions.length > 0 ? (
          <div className="space-y-4 border-t border-border/60 pt-4">
            {fallbackQuestions.map((q) => (
              <div key={q.id}>{renderQuestion(q, renderField, renderMultiSelect)}</div>
            ))}
          </div>
        ) : null}
    </HolisticCollapsibleSection>
  )
}

