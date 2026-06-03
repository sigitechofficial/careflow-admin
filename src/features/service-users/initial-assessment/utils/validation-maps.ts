import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import {
  isSkippableIncompleteValidationMessage,
  type ValidationIssue,
} from '@/features/service-users/initial-assessment/utils/submit-validation'
import {
  sectionProgress,
  type SectionProgressContext,
} from '@/features/service-users/initial-assessment/utils/section-progress'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

export type SectionNavStatus = 'ok' | 'incomplete' | 'blocking' | 'warning'

export function isRequiredFieldValidationMessage(message: string): boolean {
  return isSkippableIncompleteValidationMessage(message) && message.startsWith('Required: ')
}

function sectionHasHardBlocks(sectionBlocks: ValidationIssue[] | undefined, revealFieldErrors: boolean): boolean {
  const list = sectionBlocks ?? []
  if (list.length === 0) return false
  if (revealFieldErrors) return true
  return list.some((issue) => !isRequiredFieldValidationMessage(issue.message))
}

export function buildValidationMaps(params: {
  sections: InitialAssessmentSection[]
  blocks: ValidationIssue[]
  warnings: ValidationIssue[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  editable: boolean
  progressContext?: SectionProgressContext
  /** When false, omit inline "Required" on fields and treat missing required as incomplete nav only. */
  revealFieldErrors?: boolean
}): {
  questionErrors: Map<string, string>
  sectionBlocks: Map<number, ValidationIssue[]>
  sectionWarnings: Map<number, ValidationIssue[]>
  sectionNavStatus: Map<number, SectionNavStatus>
} {
  const { sections, blocks, warnings, draftAnswers, editable, progressContext } = params
  const revealFieldErrors = params.revealFieldErrors ?? false
  const questionErrors = new Map<string, string>()
  const sectionBlocks = new Map<number, ValidationIssue[]>()
  const sectionWarnings = new Map<number, ValidationIssue[]>()

  const allQuestions = sections.flatMap((s) =>
    s.questions.map((q) => ({ q, sectionNumber: s.sectionNumber })),
  )

  const pushSection = (map: Map<number, ValidationIssue[]>, issue: ValidationIssue) => {
    const list = map.get(issue.sectionNumber) ?? []
    list.push(issue)
    map.set(issue.sectionNumber, list)
  }

  for (const issue of blocks) pushSection(sectionBlocks, issue)
  for (const issue of warnings) pushSection(sectionWarnings, issue)

  if (revealFieldErrors) {
    for (const issue of blocks) {
      const msg = issue.message
      if (msg.startsWith('Required: ')) {
        const text = msg.slice('Required: '.length)
        const match = allQuestions.find(({ q }) => q.questionText === text)
        if (match) questionErrors.set(match.q.id, 'Required')
        continue
      }
      if (msg.startsWith('Assessor sign-off required: ')) {
        const text = msg.slice('Assessor sign-off required: '.length)
        const match = allQuestions.find(({ q }) => q.questionText === text)
        if (match) questionErrors.set(match.q.id, 'Sign-off required')
      }
    }
  }

  const sectionNavStatus = new Map<number, SectionNavStatus>()
  for (const sec of sections) {
    const n = sec.sectionNumber
    const blocksForSection = sectionBlocks.get(n)
    const hasHardBlocks = sectionHasHardBlocks(blocksForSection, revealFieldErrors)
    const hasWarnings = (sectionWarnings.get(n)?.length ?? 0) > 0
    const prog = sectionProgress(sec, draftAnswers, sections, progressContext)
    const requiredIncomplete = editable && prog.requiredTotal > 0 && prog.requiredAnswered < prog.requiredTotal

    if (hasHardBlocks) {
      sectionNavStatus.set(n, 'blocking')
    } else if (hasWarnings) {
      sectionNavStatus.set(n, 'warning')
    } else if (editable && (requiredIncomplete || (prog.total > 0 && prog.percent < 100))) {
      sectionNavStatus.set(n, 'incomplete')
    } else {
      sectionNavStatus.set(n, 'ok')
    }
  }

  return { questionErrors, sectionBlocks, sectionWarnings, sectionNavStatus }
}
