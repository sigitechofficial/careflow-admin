import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'

const IA_SECTION_DEMO_PATH = '/dev/run-ia-section'

/** Section fill saves at most a few dozen answers; a short timeout is plenty. */
const IA_SECTION_DEMO_TIMEOUT_MS = 60 * 1000

export type RunIaSectionDemoResult = {
  message: string
  tabId: number
  answersWritten: number
}

/**
 * Populate a SINGLE holistic tab/section with demo data at the given severity.
 * The backend fills only the supplied `questionIds` (minus profile/secure fields) plus
 * that tab's own worksheet metadata, and never submits the assessment. Dev/QA only —
 * the endpoint 404s outside non-production/`ENABLE_DEV_TOOLS` environments.
 */
export async function runIaSectionDemoDev(
  serviceUserId: string,
  level: IaAutofillLevel,
  tabId: number,
  questionIds: string[],
): Promise<RunIaSectionDemoResult> {
  const res = await apiJson<ApiEnvelope<RunIaSectionDemoResult>>(
    IA_SECTION_DEMO_PATH,
    {
      method: 'POST',
      body: JSON.stringify({ serviceUserId, level, tabId, questionIds }),
    },
    { timeoutMs: IA_SECTION_DEMO_TIMEOUT_MS },
  )
  return {
    message: res.data?.message ?? res.message ?? 'Demo data populated for this section.',
    tabId: res.data?.tabId ?? tabId,
    answersWritten: res.data?.answersWritten ?? 0,
  }
}
