import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CarePlanRuleConditionWhen =
  | 'yes'
  | 'no'
  | 'answered'
  | 'not_answered'
  | 'select_equals'
  | 'text_contains'
  | 'adl_score_gte'

export type CarePlanRuleCondition = {
  fieldKey?: string
  specRef?: string
  questionTextContains?: string
  /** ADL worksheet activity id, for `adl_score_gte` (e.g. bathing). */
  adlActivity?: string
  when: CarePlanRuleConditionWhen
  value?: string
}

export type CarePlanRecommendationRule = {
  id: string
  carePathwayFormId: string
  label: string | null
  matchMode: 'ANY' | 'ALL'
  conditions: CarePlanRuleCondition[]
  suppressLegacyArea: string | null
  sortOrder: number
  isActive: boolean
  form: { id: string; name: string; formType: string; status: string } | null
}

export type AssessmentFieldKeyOption = {
  questionId: string
  questionText: string
  questionType: string
  carePlanTrigger: boolean
  fieldKey: string | null
  specRef: string | null
  sectionNumber: number
  sectionTitle: string
  carePlanArea: string | null
}

export type CarePlanFormOption = {
  id: string
  name: string
  status: string
  isActive: boolean
}

export async function listCarePlanFormsForRules(): Promise<CarePlanFormOption[]> {
  const res = await apiJson<ApiEnvelope<CarePlanFormOption[]>>(
    '/initial-assessments/care-plan-recommendation-rules/care-plans',
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function listCarePlanRecommendationRules(): Promise<CarePlanRecommendationRule[]> {
  const res = await apiJson<ApiEnvelope<CarePlanRecommendationRule[]>>(
    '/initial-assessments/care-plan-recommendation-rules',
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function listAssessmentFieldKeys(templateId?: string): Promise<AssessmentFieldKeyOption[]> {
  const q = templateId ? `?templateId=${encodeURIComponent(templateId)}` : ''
  const res = await apiJson<ApiEnvelope<AssessmentFieldKeyOption[]>>(
    `/initial-assessments/care-plan-recommendation-rules/field-keys${q}`,
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function createCarePlanRecommendationRule(body: {
  carePathwayFormId: string
  label?: string
  matchMode?: 'ANY' | 'ALL'
  conditions: CarePlanRuleCondition[]
  suppressLegacyArea?: string
  sortOrder?: number
  isActive?: boolean
}): Promise<CarePlanRecommendationRule> {
  const res = await apiJson<ApiEnvelope<CarePlanRecommendationRule>>(
    '/initial-assessments/care-plan-recommendation-rules',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateCarePlanRecommendationRule(
  id: string,
  body: Partial<{
    carePathwayFormId: string
    label: string
    matchMode: 'ANY' | 'ALL'
    conditions: CarePlanRuleCondition[]
    suppressLegacyArea: string
    sortOrder: number
    isActive: boolean
  }>,
): Promise<CarePlanRecommendationRule> {
  const res = await apiJson<ApiEnvelope<CarePlanRecommendationRule>>(
    `/initial-assessments/care-plan-recommendation-rules/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteCarePlanRecommendationRule(id: string): Promise<void> {
  await apiJson(`/initial-assessments/care-plan-recommendation-rules/${id}`, { method: 'DELETE' })
}
