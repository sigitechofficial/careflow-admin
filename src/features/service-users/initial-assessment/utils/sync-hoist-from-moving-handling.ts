import { findQuestionByFieldKey } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { MovingHandlingOperationsMetadata } from '@/features/service-users/initial-assessment/utils/moving-handling-operations'

/**
 * Whether any Moving & Handling task lists a hoist. `undefined` while no task has been recorded,
 * so a legacy "Uses hoist or sling?" answer is never overwritten before the worksheet is started.
 * Mirrors careflow-api `movingHandlingUsesHoist`.
 */
export function movingHandlingUsesHoist(
  meta: MovingHandlingOperationsMetadata | undefined,
): boolean | undefined {
  if (!meta?.tasks) return undefined
  let anyRecorded = false
  for (const row of Object.values(meta.tasks)) {
    if (!row || typeof row !== 'object') continue
    anyRecorded = true
    if (row.methods?.some((m) => m === 'hoist')) return true
  }
  return anyRecorded ? false : undefined
}

const TRANSFER_TASK_IDS = ['gettingInOutOfBed', 'transfersBedToChair', 'moveUpBed', 'toileting'] as const

/**
 * Whether any transfer task needs supervision or assistance. `undefined` until the transfers are
 * recorded (or the person is marked totally independent). Mirrors careflow-api
 * `movingHandlingNeedsTransferSupport`.
 */
export function movingHandlingNeedsTransferSupport(
  meta: MovingHandlingOperationsMetadata | undefined,
): boolean | undefined {
  if (!meta) return undefined
  const capabilities = TRANSFER_TASK_IDS.map((id) => meta.tasks?.[id]?.capability)
  if (capabilities.some((c) => c === 'supervision' || c === 'assistance')) return true
  if (meta.riskFilter?.totallyIndependentLowRisk === true) return false
  if (capabilities.every((c) => c === 'independent')) return false
  return undefined
}

function withDerivedYesNo(
  answers: Record<string, InitialAssessmentAnswerInput>,
  questionId: string | undefined,
  value: boolean | undefined,
): Record<string, InitialAssessmentAnswerInput> {
  if (!questionId || value === undefined) return answers
  const existing = answers[questionId]
  if (existing?.checked === value && existing?.booleanValue === value) return answers
  return { ...answers, [questionId]: { questionId, checked: value, booleanValue: value } }
}

/**
 * C43 — keep the hidden §12.5a hoist and §12.5c transfer-support answers (risk / care-plan triggers)
 * in step with the Moving & Handling worksheet. Nothing is written until the worksheet records it.
 */
export function syncHoistFromMovingHandling(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  movingHandling: MovingHandlingOperationsMetadata | undefined,
): Record<string, InitialAssessmentAnswerInput> {
  const hoistQ = findQuestionByFieldKey(sections, 'usesHoistOrSling')
  const transferQ = findQuestionByFieldKey(sections, 'transferSupportRequired')
  const withHoist = withDerivedYesNo(answers, hoistQ?.id, movingHandlingUsesHoist(movingHandling))
  return withDerivedYesNo(withHoist, transferQ?.id, movingHandlingNeedsTransferSupport(movingHandling))
}
