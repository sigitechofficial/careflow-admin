import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { shouldUseSearchableSelect } from '@/shared/utils/searchable-select'

export type QuestionOption = { value: string; label: string }

export type QuestionOptionCatalogs = {
  woundTypeCatalog?: QuestionOption[]
  fundingTypeCatalog?: QuestionOption[]
  ethnicityCatalog?: QuestionOption[]
  languageCatalog?: QuestionOption[]
  genderCatalog?: QuestionOption[]
  sexCatalog?: QuestionOption[]
  sexualOrientationCatalog?: QuestionOption[]
}

const LEGACY_OPTION_LABELS: Record<string, string> = {
  other: 'Other',
  unknown: 'Unknown at assessment stage',
  self_funded: 'Self Funded',
  funding_unknown: 'Unknown',
}

export function usesBodyMapWoundTypeLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  return Boolean(
    meta &&
      typeof meta === 'object' &&
      !Array.isArray(meta) &&
      meta.optionsLookup === 'body_map_wound_types',
  )
}

export function usesServiceUserFundingTypeLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false
  if (meta.optionsLookup === 'service_user_funding_types') return true
  return meta.fieldKey === 'fundingType'
}

export function usesServiceUserEthnicityLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return question.questionText.trim() === 'Ethnicity'
  }
  if (meta.optionsLookup === 'service_user_ethnicities') return true
  return meta.fieldKey === 'ethnicity'
}

export function usesServiceUserLanguageLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return question.questionText.trim() === 'Languages spoken'
  }
  if (meta.optionsLookup === 'service_user_languages') return true
  return meta.fieldKey === 'languagesSpoken'
}

export function usesServiceUserGenderLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return question.questionText.trim() === 'Gender'
  }
  if (meta.optionsLookup === 'service_user_genders') return true
  return meta.prefillKey === 'gender' || meta.fieldKey === 'gender'
}

export function usesServiceUserSexLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false
  return meta.optionsLookup === 'service_user_sexes' || meta.fieldKey === 'sex'
}

export function usesServiceUserSexualOrientationLookup(question: InitialAssessmentQuestion): boolean {
  const meta = question.metadata
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false
  return meta.optionsLookup === 'service_user_sexual_orientations' || meta.fieldKey === 'sexualOrientation'
}

/** Large service-user / body-map lookup lists — use shared searchable Combobox. */
export function usesSearchableSingleSelectLookup(question: InitialAssessmentQuestion): boolean {
  return (
    usesServiceUserEthnicityLookup(question) ||
    usesServiceUserLanguageLookup(question) ||
    usesServiceUserFundingTypeLookup(question) ||
    usesBodyMapWoundTypeLookup(question)
  )
}

export function usesSearchableSingleSelect(
  question: InitialAssessmentQuestion,
  options: QuestionOption[],
): boolean {
  if (usesSearchableSingleSelectLookup(question)) return true
  return shouldUseSearchableSelect(options.length)
}

/** Keep selected value visible while lookup catalog is loading or stale. */
export function questionOptionsForCombobox(
  options: QuestionOption[],
  currentValue: string,
): QuestionOption[] {
  if (!currentValue || options.some((o) => o.value === currentValue)) return options
  return [...options, { value: currentValue, label: currentValue }]
}

/** Maps service-user lookup rows to IA answer codes (lowercase `code`, same as prefill). */
export function mapLookupRowsToQuestionOptions(
  rows: ReadonlyArray<{ name: string; code: string }>,
): QuestionOption[] {
  return rows.map((row) => ({
    value: row.code.trim().toLowerCase(),
    label: row.name,
  }))
}

export function resolveQuestionOptions(
  question: InitialAssessmentQuestion,
  catalogs: QuestionOptionCatalogs = {},
): QuestionOption[] {
  if (usesBodyMapWoundTypeLookup(question)) {
    return catalogs.woundTypeCatalog ?? []
  }
  if (usesServiceUserFundingTypeLookup(question)) {
    const fromDb = catalogs.fundingTypeCatalog ?? []
    if (fromDb.length > 0) return fromDb
    return parseQuestionOptions(question.options)
  }
  if (usesServiceUserEthnicityLookup(question)) {
    return catalogs.ethnicityCatalog ?? []
  }
  if (usesServiceUserLanguageLookup(question)) {
    return catalogs.languageCatalog ?? []
  }
  if (usesServiceUserGenderLookup(question)) {
    const fromDb = catalogs.genderCatalog ?? []
    if (fromDb.length > 0) return fromDb
    return parseQuestionOptions(question.options)
  }
  if (usesServiceUserSexLookup(question)) {
    const fromDb = catalogs.sexCatalog ?? []
    if (fromDb.length > 0) return fromDb
    return parseQuestionOptions(question.options)
  }
  if (usesServiceUserSexualOrientationLookup(question)) {
    const fromDb = catalogs.sexualOrientationCatalog ?? []
    if (fromDb.length > 0) return fromDb
    return parseQuestionOptions(question.options)
  }
  return parseQuestionOptions(question.options)
}

export function labelForQuestionOptionValue(
  value: string,
  question: InitialAssessmentQuestion,
  catalogs: QuestionOptionCatalogs = {},
): string {
  const opts = resolveQuestionOptions(question, catalogs)
  return opts.find((o) => o.value === value)?.label ?? LEGACY_OPTION_LABELS[value] ?? value
}

export function parseQuestionOptions(raw: unknown): QuestionOption[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      if (typeof entry === 'string') return { value: entry, label: entry }
      if (entry && typeof entry === 'object') {
        const o = entry as Record<string, unknown>
        const value = String(o.value ?? o.id ?? o.label ?? '')
        const label = String(o.label ?? o.value ?? o.id ?? '')
        if (!value && !label) return null
        return { value: value || label, label: label || value }
      }
      return null
    }).filter((x): x is QuestionOption => x != null)
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.options)) return parseQuestionOptions(o.options)
  }
  return []
}
