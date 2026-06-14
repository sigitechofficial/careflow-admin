import type { OrganisationGeneralSettings } from '@/features/settings/types'

/** Pre-assessment form key — Nutritional Risk using MUAC (org settings → Pre Assessment). */
export const PRE_ASSESSMENT_MUAC_FORM_KEY = 'nutritional_risk_muac' as const

export function isPreAssessmentFormEnabled(
  settings: OrganisationGeneralSettings | null | undefined,
  formKey: string,
): boolean {
  const forms = settings?.preAssessmentSettings?.assessmentForms
  if (!forms?.length) return false
  return forms.some((f) => f.key === formKey && f.selected)
}
