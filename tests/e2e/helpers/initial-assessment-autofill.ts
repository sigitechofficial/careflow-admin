import type { APIRequestContext } from '@playwright/test'
import { HOLISTIC_TAB_COUNT } from '../../../src/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import {
  assertHolisticMetadataSaved,
  buildHolisticWorksheetMetadata,
} from '../../../src/features/service-users/initial-assessment/utils/ia-holistic-metadata-autofill'
import { mergeMetadataPatch } from '../../../src/features/service-users/initial-assessment/utils/submission-metadata'

export type IaFillLevel = 'low' | 'normal' | 'critical'

/** UI labels for service-user condition severity (matches dev autofill buttons). */
export const IA_FILL_LEVEL_LABELS: Record<IaFillLevel, string> = {
  critical: 'Very critical',
  normal: 'Moderate',
  low: 'Stable',
}

const SECTION_COUNT = HOLISTIC_TAB_COUNT

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

type TemplateQuestion = {
  id: string
  questionText: string
  questionType: string
  isRequired: boolean
  sortOrder: number
  metadata: Record<string, unknown> | null
  options?: unknown
  sectionNumber: number
}

type TemplateSection = {
  sectionNumber: number
  questions: TemplateQuestion[]
}

type Template = {
  id: string
  sections: TemplateSection[]
}

type Submission = {
  id: string
  status: string
  templateId: string
  metadata?: Record<string, unknown> | null
}

type AnswerInput = {
  questionId: string
  checked?: boolean
  booleanValue?: boolean
  textValue?: string
  numberValue?: number
  dateValue?: string
  timeValue?: string
  selectedOptions?: unknown
  notes?: string
}

function specRef(q: TemplateQuestion): string | undefined {
  const m = q.metadata
  return typeof m?.specRef === 'string' ? m.specRef : undefined
}

function fieldKey(q: TemplateQuestion): string | undefined {
  const m = q.metadata
  return typeof m?.fieldKey === 'string' ? m.fieldKey : undefined
}

function parseSelectOptions(raw: unknown): { value: string; label: string }[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === 'string') return { value: entry, label: entry }
        if (entry && typeof entry === 'object') {
          const o = entry as Record<string, unknown>
          const value = String(o.value ?? o.id ?? o.label ?? '')
          const label = String(o.label ?? o.value ?? o.id ?? '')
          if (!value && !label) return null
          return { value: value || label, label: label || value }
        }
        return null
      })
      .filter((x): x is { value: string; label: string } => x != null)
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const list = (raw as { options?: unknown[] }).options
    if (Array.isArray(list)) return parseSelectOptions(list)
  }
  return []
}

function isoDate(offsetMonths = 0): string {
  const d = new Date()
  if (offsetMonths) d.setMonth(d.getMonth() + offsetMonths)
  return d.toISOString().slice(0, 10)
}

function shouldFillQuestion(q: TemplateQuestion, level: IaFillLevel): boolean {
  if (level === 'critical') return q.sectionNumber >= 1 && q.sectionNumber <= SECTION_COUNT
  if (level === 'low' || level === 'normal') {
    if (q.isRequired) return true
    return q.sectionNumber <= 12 && q.sortOrder <= 8
  }
  return false
}

/** Stable skips only non-required fields outside sections 1–3 (required fields always filled). */
function skipOptionalStableField(level: IaFillLevel, q: TemplateQuestion): boolean {
  return level === 'low' && !q.isRequired && q.sectionNumber > 3
}

/** Safe defaults for E2E submit (avoids gated follow-ups without filling detail fields). */
function e2eYesNoValue(q: TemplateQuestion): { checked: boolean; booleanValue: boolean } {
  const key = fieldKey(q)
  const ref = specRef(q)
  const text = q.questionText.toLowerCase()

  const negative =
    key === 'safeguardingConcern' ||
    key === 'fallsLast12Months' ||
    key === 'hasWounds' ||
    key === 'usesHoistOrSling' ||
    key === 'financeSupportRequired' ||
    key === 'clinicalEquipmentInUse' ||
    text.includes('safeguarding concerns identified') ||
    text.includes('falls in last') ||
    text.includes('currently has ulcers') ||
    text.includes('finance support required') ||
    text.includes('representative involved') ||
    text.includes('mca required') ||
    text.includes('capacity not intact') ||
    text.includes('salt referral required') ||
    text.includes('local authority safeguarding referral required')

  const positive =
    ref === '2.1' ||
    ref === '2.2' ||
    key === 'noResponseProcedureAgreed' ||
    key === 'suSignatureObtained' ||
    key === 'assessorDeclarationConfirmed' ||
    text.includes('consented to this assessment') ||
    text.includes('consented to receive care') ||
    text.includes('capacity intact') ||
    text.includes('mca completed') ||
    text.includes('no response procedure agreed') ||
    text.includes('signature obtained') ||
    text.includes('assessor declaration confirmed') ||
    text.includes('competent to record vital signs') ||
    text.includes('emergency contact') ||
    text.includes('waterlow assessment completed')

  if (positive) return { checked: true, booleanValue: true }
  if (negative) return { checked: false, booleanValue: false }
  return { checked: true, booleanValue: true }
}

/** Very critical condition — flag risks and care escalations as Yes (details filled in full autofill). */
function severeYesNoValue(q: TemplateQuestion): { checked: boolean; booleanValue: boolean } {
  const key = fieldKey(q)
  const text = q.questionText.toLowerCase()

  const riskYes =
    key === 'safeguardingConcern' ||
    key === 'fallsLast12Months' ||
    key === 'hasWounds' ||
    key === 'financeSupportRequired' ||
    key === 'clinicalEquipmentInUse' ||
    text.includes('safeguarding concerns identified') ||
    text.includes('falls in last') ||
    text.includes('currently has ulcers') ||
    text.includes('wound assessment been completed') ||
    text.includes('finance support required') ||
    text.includes('feels low') ||
    text.includes('low in mood') ||
    text.includes('pain concern') ||
    text.includes('salt referral required') ||
    text.includes('controlled drugs in use') ||
    text.includes('covert medication required') ||
    text.includes('local authority safeguarding referral required')

  if (riskYes) return { checked: true, booleanValue: true }
  return e2eYesNoValue(q)
}

function conditionTextPrefix(level: IaFillLevel): string {
  if (level === 'critical') return 'Very critical condition'
  if (level === 'normal') return 'Moderate condition'
  return 'Stable condition — out of danger'
}

function buildPreferredVisitTimesAnswer(): Record<string, unknown> {
  return {
    MORNING: { selected: true, from: '08:00', to: '12:00', roundName: 'Morning' },
    AFTERNOON: { selected: true, from: '13:00', to: '17:00', roundName: 'Afternoon' },
  }
}

function buildAnswer(q: TemplateQuestion, level: IaFillLevel): AnswerInput | null {
  if (!shouldFillQuestion(q, level)) return null

  const base: AnswerInput = { questionId: q.id }
  const key = fieldKey(q)
  const ref = specRef(q)
  const opts = parseSelectOptions(q.options)
  const textNeedle = q.questionText.toLowerCase()

  if (key === 'preferredVisitTimes' || textNeedle.includes('preferred visit times')) {
    return { ...base, selectedOptions: buildPreferredVisitTimesAnswer() }
  }

  if (ref === '2.1' || ref === '2.2') {
    if (level === 'low' && q.sectionNumber > 2 && !q.isRequired) return null
    return { ...base, checked: true, booleanValue: true }
  }

  switch (q.questionType) {
    case 'YES_NO':
    case 'CHECKBOX': {
      if (level === 'critical') return { ...base, ...severeYesNoValue(q) }
      if (level === 'normal' || level === 'low') return { ...base, ...e2eYesNoValue(q) }
      return { ...base, checked: false, booleanValue: false }
    }
    case 'NUMBER': {
      if (key === 'temperature') return { ...base, numberValue: 36.6 }
      if (key === 'pulse') return { ...base, numberValue: 72 }
      if (key === 'respirations') return { ...base, numberValue: 16 }
      if (key === 'bpSystolic') return { ...base, numberValue: 120 }
      if (key === 'bpDiastolic') return { ...base, numberValue: 80 }
      if (key === 'spo2') return { ...base, numberValue: 98 }
      if (key === 'bloodGlucose') return { ...base, numberValue: 5.5 }
      if (skipOptionalStableField(level, q)) return null
      return { ...base, numberValue: 1 }
    }
    case 'DATE': {
      if (skipOptionalStableField(level, q)) return null
      if (key === 'nextReviewDate' || key === 'assessorSignDate') {
        return { ...base, dateValue: isoDate(key === 'nextReviewDate' ? 6 : 0) }
      }
      return { ...base, dateValue: isoDate() }
    }
    case 'TIME':
      if (skipOptionalStableField(level, q)) return null
      return { ...base, timeValue: '09:00' }
    case 'TEXT':
    case 'TEXTAREA': {
      if (key === 'assessorName') return { ...base, textValue: 'E2E Assessor' }
      if (key === 'assessorRole') return { ...base, textValue: 'Registered Manager' }
      if (skipOptionalStableField(level, q)) return null
      if (textNeedle.includes('safeguarding concern details')) {
        return {
          ...base,
          textValue: `${conditionTextPrefix(level)} — safeguarding details documented for E2E.`,
        }
      }
      if (textNeedle.includes('review and sign-off')) {
        return {
          ...base,
          textValue: `${conditionTextPrefix(level)} — assessment sign-off (E2E).`,
        }
      }
      return {
        ...base,
        textValue: `${conditionTextPrefix(level)} — ${q.questionText.slice(0, 48)}`,
      }
    }
    case 'SINGLE_SELECT': {
      if (skipOptionalStableField(level, q)) return null
      if (opts[0]) return { ...base, selectedOptions: opts[0].value }
      return level === 'critical' ? { ...base, textValue: 'E2E selected' } : null
    }
    case 'MULTI_SELECT': {
      if (skipOptionalStableField(level, q)) return null
      if (opts.length) {
        const pick = level === 'critical' ? opts.slice(0, Math.min(3, opts.length)) : [opts[0]!]
        return { ...base, selectedOptions: pick.map((o) => o.value) }
      }
      return level === 'critical' ? { ...base, selectedOptions: ['e2e_option'] } : null
    }
    default:
      return level === 'critical' ? { ...base, textValue: 'E2E' } : null
  }
}

async function apiLogin(request: APIRequestContext, apiBase: string) {
  const email = process.env.E2E_LOGIN_EMAIL!
  const password = process.env.E2E_LOGIN_PASSWORD!
  const res = await request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`)
  const json = (await res.json()) as ApiEnvelope<{ accessToken: string }>
  return json.data.accessToken
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function fetchDefaultTemplate(request: APIRequestContext, apiBase: string, token: string) {
  const res = await request.get(`${apiBase}/initial-assessment-templates/default`, {
    headers: authHeaders(token),
  })
  if (!res.ok()) throw new Error(`Template fetch failed: ${res.status()}`)
  const json = (await res.json()) as ApiEnvelope<Template>
  return json.data
}

export async function fetchInitialAssessmentSubmission(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
  submissionId: string,
) {
  const res = await request.get(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments/${submissionId}`,
    { headers: authHeaders(token) },
  )
  if (!res.ok()) throw new Error(`Fetch submission failed: ${res.status()}`)
  const json = (await res.json()) as ApiEnvelope<Submission>
  return json.data
}

async function countExistingAnswers(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
  submissionId: string,
): Promise<number> {
  const res = await request.get(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments/${submissionId}/answers`,
    { headers: authHeaders(token) },
  )
  if (!res.ok()) return 0
  const json = (await res.json()) as ApiEnvelope<unknown[]>
  return json.data?.length ?? 0
}

async function listSubmissions(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
) {
  const res = await request.get(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments?limit=20&sortOrder=desc`,
    { headers: authHeaders(token) },
  )
  if (!res.ok()) throw new Error(`List submissions failed: ${res.status()}`)
  const json = (await res.json()) as ApiEnvelope<Submission[]>
  return json.data ?? []
}

async function createSubmission(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
) {
  const res = await request.post(`${apiBase}/service-users/${serviceUserId}/initial-assessments`, {
    headers: authHeaders(token),
    data: {},
  })
  if (!res.ok()) throw new Error(`Create submission failed: ${res.status()} ${await res.text()}`)
  const json = (await res.json()) as ApiEnvelope<Submission>
  return json.data
}

async function reopenIfNeeded(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
  submission: Submission,
) {
  if (submission.status === 'IN_PROGRESS' || submission.status === 'DRAFT') return submission
  const res = await request.patch(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments/${submission.id}/status`,
    {
      headers: authHeaders(token),
      data: { status: 'IN_PROGRESS', reason: 'E2E Playwright autofill reopen' },
    },
  )
  if (!res.ok()) throw new Error(`Reopen failed: ${res.status()} ${await res.text()}`)
  const json = (await res.json()) as ApiEnvelope<Submission>
  return json.data
}

async function saveAnswersBatch(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
  submissionId: string,
  answers: AnswerInput[],
  correctionReason?: string,
) {
  const res = await request.patch(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments/${submissionId}/answers`,
    {
      headers: authHeaders(token),
      data: {
        answers,
        ...(correctionReason ? { correctionReason } : {}),
      },
    },
  )
  if (!res.ok()) throw new Error(`Save answers failed: ${res.status()} ${await res.text()}`)
}

async function patchMetadata(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
  submissionId: string,
  metadata: Record<string, unknown>,
) {
  const res = await request.patch(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments/${submissionId}`,
    {
      headers: authHeaders(token),
      data: { metadata },
    },
  )
  if (!res.ok()) throw new Error(`Patch metadata failed: ${res.status()} ${await res.text()}`)
}

async function submitAssessment(
  request: APIRequestContext,
  apiBase: string,
  token: string,
  serviceUserId: string,
  submissionId: string,
  skipIncomplete: boolean,
) {
  const res = await request.patch(
    `${apiBase}/service-users/${serviceUserId}/initial-assessments/${submissionId}/submit`,
    {
      headers: authHeaders(token),
      data: skipIncomplete ? { skipIncompleteValidation: true } : {},
    },
  )
  if (!res.ok()) throw new Error(`Submit failed: ${res.status()} ${await res.text()}`)
}

export async function autofillInitialAssessmentViaApi(
  request: APIRequestContext,
  serviceUserId: string,
  level: IaFillLevel,
): Promise<{
  submissionId: string
  sectionsFilled: number
  answersSaved: number
  metadataKeysSaved: number
}> {
  const apiBase = process.env.E2E_API_BASE_URL!.replace(/\/$/, '')
  const token = await apiLogin(request, apiBase)
  const template = await fetchDefaultTemplate(request, apiBase, token)

  let submissions = await listSubmissions(request, apiBase, token, serviceUserId)
  let submission =
    submissions.find((s) => s.status === 'IN_PROGRESS' || s.status === 'DRAFT') ?? submissions[0]

  if (!submission) {
    submission = await createSubmission(request, apiBase, token, serviceUserId)
  } else {
    submission = await reopenIfNeeded(request, apiBase, token, serviceUserId, submission)
  }

  const fresh = await fetchInitialAssessmentSubmission(
    request,
    apiBase,
    token,
    serviceUserId,
    submission.id,
  )
  const existingMeta =
    fresh.metadata && typeof fresh.metadata === 'object' && !Array.isArray(fresh.metadata)
      ? (fresh.metadata as Record<string, unknown>)
      : {}

  const existingAnswerCount = await countExistingAnswers(
    request,
    apiBase,
    token,
    serviceUserId,
    submission.id,
  )
  const needsCorrectionReason =
    existingMeta.correctionRequired === true ||
    typeof existingMeta.reopenedAt === 'string' ||
    (existingAnswerCount > 0 && (fresh.status === 'IN_PROGRESS' || fresh.status === 'DRAFT'))
  const correctionReason = needsCorrectionReason
    ? 'E2E Playwright autofill after manager reopen for testing.'
    : undefined

  const allQuestions = template.sections.flatMap((s) =>
    s.questions.map((q) => ({ ...q, sectionNumber: s.sectionNumber })),
  )

  const answers: AnswerInput[] = []
  const sectionsWithAnswers = new Set<number>()
  for (const q of allQuestions) {
    const a = buildAnswer(q, level)
    if (a) {
      answers.push(a)
      sectionsWithAnswers.add(q.sectionNumber)
    }
  }

  const chunkSize = 40
  for (let i = 0; i < answers.length; i += chunkSize) {
    await saveAnswersBatch(
      request,
      apiBase,
      token,
      serviceUserId,
      submission.id,
      answers.slice(i, i + chunkSize),
      needsCorrectionReason ? correctionReason : undefined,
    )
  }

  const metaPatch = buildHolisticWorksheetMetadata(level)
  await patchMetadata(
    request,
    apiBase,
    token,
    serviceUserId,
    submission.id,
    mergeMetadataPatch(existingMeta, metaPatch),
  )

  const saved = await fetchInitialAssessmentSubmission(
    request,
    apiBase,
    token,
    serviceUserId,
    submission.id,
  )
  const missingMetadataKeys = assertHolisticMetadataSaved(
    saved.metadata as Record<string, unknown> | undefined,
  )
  if (missingMetadataKeys.length > 0) {
    throw new Error(`Holistic metadata not persisted: ${missingMetadataKeys.join(', ')}`)
  }

  if (level === 'low') {
    try {
      await submitAssessment(request, apiBase, token, serviceUserId, submission.id, false)
    } catch {
      await submitAssessment(request, apiBase, token, serviceUserId, submission.id, true)
    }
  } else if (level === 'normal') {
    try {
      await submitAssessment(request, apiBase, token, serviceUserId, submission.id, true)
    } catch {
      // Leave in progress if incomplete submit still blocked (e.g. leftover answers from a prior run).
    }
  } else if (level === 'critical') {
    try {
      await submitAssessment(request, apiBase, token, serviceUserId, submission.id, false)
    } catch {
      await submitAssessment(request, apiBase, token, serviceUserId, submission.id, true)
    }
  }

  return {
    submissionId: submission.id,
    sectionsFilled: sectionsWithAnswers.size,
    answersSaved: answers.length,
    holisticTabs: SECTION_COUNT,
    metadataKeysSaved: Object.keys(metaPatch).length,
  }
}

export { assertHolisticMetadataSaved, HOLISTIC_TAB_COUNT }
