import type { CareFormFieldRow, CareFormSectionRow } from '@/features/care-pathway/types/care-pathway.types'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { parseMultiSelectValue } from '@/features/care-pathway/utils/form-builder-field-options.util'

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'is_true'
  | 'is_false'
  | 'includes'

export type FieldConditionalRule = {
  sectionId: string
  fieldId: string
  operator: ConditionalOperator
  value?: string
}

export type FieldConditionalLogic = {
  showWhen?: FieldConditionalRule[]
}

export type PriorFieldOption = {
  sectionId: string
  fieldId: string
  label: string
  fieldType: CareFormFieldRow['fieldType']
}

export function parseConditionalLogic(raw: unknown): FieldConditionalLogic | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const showWhen = (raw as FieldConditionalLogic).showWhen
  if (!showWhen?.length) return null
  if (!Array.isArray(showWhen)) return null
  const rules = showWhen.filter(
    (rule): rule is FieldConditionalRule =>
      Boolean(rule) &&
      typeof rule === 'object' &&
      typeof (rule as FieldConditionalRule).sectionId === 'string' &&
      typeof (rule as FieldConditionalRule).fieldId === 'string' &&
      typeof (rule as FieldConditionalRule).operator === 'string',
  )
  return rules.length ? { showWhen: rules } : null
}

export function serializeConditionalLogic(
  logic: FieldConditionalLogic | null | undefined,
): FieldConditionalLogic | null {
  const parsed = logic ? parseConditionalLogic(logic) : null
  return parsed
}

function fieldValueKey(sectionId: string, fieldId: string) {
  return `${sectionId}:${fieldId}`
}

function normalizeComparableValue(value: string | boolean | undefined): string {
  if (value === true || value === 'true') return 'true'
  if (value === false || value === 'false') return 'false'
  return String(value ?? '')
}

function evaluateRule(rule: FieldConditionalRule, values: CarePlanDraftValues): boolean {
  const key = fieldValueKey(rule.sectionId, rule.fieldId)
  const raw = values[key]

  switch (rule.operator) {
    case 'is_true':
      return raw === true || raw === 'true'
    case 'is_false':
      return raw === false || raw === 'false' || raw === undefined || raw === ''
    case 'equals':
      return normalizeComparableValue(raw) === (rule.value ?? '')
    case 'not_equals':
      return normalizeComparableValue(raw) !== (rule.value ?? '')
    case 'includes':
      return parseMultiSelectValue(raw).includes(rule.value ?? '')
    default:
      return true
  }
}

export function isFieldVisible(
  field: CareFormFieldRow,
  values: CarePlanDraftValues,
): boolean {
  const logic = parseConditionalLogic(field.conditionalLogicJson)
  if (!logic?.showWhen?.length) return true
  return logic.showWhen.every((rule) => evaluateRule(rule, values))
}

export function flattenPriorFieldOptions(
  sections: CareFormSectionRow[],
  currentSectionId: string,
  currentFieldId: string,
): PriorFieldOption[] {
  const orderedSections = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const options: PriorFieldOption[] = []

  for (const section of orderedSections) {
    const orderedFields = [...section.fields].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const field of orderedFields) {
      if (field.fieldType === 'SECTION_TEXT') continue
      if (section.id === currentSectionId && field.id === currentFieldId) {
        return options
      }
      options.push({
        sectionId: section.id,
        fieldId: field.id,
        label: field.label.trim() || 'Untitled field',
        fieldType: field.fieldType,
      })
    }
  }

  return options
}

export function operatorNeedsValue(operator: ConditionalOperator): boolean {
  return operator === 'equals' || operator === 'not_equals' || operator === 'includes'
}

export function operatorsForFieldType(
  fieldType: CareFormFieldRow['fieldType'],
): ConditionalOperator[] {
  if (fieldType === 'YES_NO' || fieldType === 'CHECKBOX') {
    return ['is_true', 'is_false']
  }
  if (fieldType === 'MULTI_SELECT') {
    return ['includes', 'equals', 'not_equals']
  }
  return ['equals', 'not_equals']
}
