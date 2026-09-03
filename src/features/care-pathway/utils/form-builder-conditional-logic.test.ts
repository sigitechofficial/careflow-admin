import { describe, expect, it } from 'vitest'
import { isFieldVisible, parseConditionalLogic } from './form-builder-conditional-logic.util'
import type { CareFormFieldRow } from '@/features/care-pathway/types/care-pathway.types'

function field(overrides: Partial<CareFormFieldRow> = {}): CareFormFieldRow {
  return {
    id: 'follow-up',
    label: 'Follow up',
    fieldType: 'TEXT',
    placeholder: null,
    helpText: null,
    required: false,
    optionsJson: null,
    validationJson: null,
    conditionalLogicJson: {
      showWhen: [{ sectionId: 'sec-1', fieldId: 'ctrl', operator: 'equals', value: 'No' }],
    },
    sortOrder: 1,
    ...overrides,
  }
}

describe('form-builder-conditional-logic', () => {
  it('shows field when no rules configured', () => {
    expect(isFieldVisible(field({ conditionalLogicJson: null }), {})).toBe(true)
  })

  it('hides field until controlling value matches', () => {
    const target = field()
    const values = { 'sec-1:ctrl': 'Yes' }
    expect(isFieldVisible(target, values)).toBe(false)
    expect(isFieldVisible(target, { 'sec-1:ctrl': 'No' })).toBe(true)
  })

  it('supports yes/no is_true operator', () => {
    const target = field({
      conditionalLogicJson: {
        showWhen: [{ sectionId: 'sec-1', fieldId: 'ctrl', operator: 'is_true' }],
      },
    })
    expect(isFieldVisible(target, { 'sec-1:ctrl': false })).toBe(false)
    expect(isFieldVisible(target, { 'sec-1:ctrl': true })).toBe(true)
  })

  it('hides Care 2020 area-risk follow-ups until the gate is YES', () => {
    const followUp = field({
      id: 'identify',
      label: 'Identify the risk?',
      fieldType: 'RICH_TEXT',
      required: true,
      conditionalLogicJson: {
        showWhen: [{ sectionId: 'sec-needs', fieldId: 'area-risk', operator: 'is_true' }],
      },
    })
    expect(isFieldVisible(followUp, {})).toBe(false)
    expect(isFieldVisible(followUp, { 'sec-needs:area-risk': false })).toBe(false)
    expect(isFieldVisible(followUp, { 'sec-needs:area-risk': true })).toBe(true)
    expect(isFieldVisible(followUp, { 'sec-needs:area-risk': 'true' })).toBe(true)
  })

  it('parses conditional logic safely', () => {
    expect(parseConditionalLogic(null)).toBeNull()
    expect(parseConditionalLogic({ showWhen: [{ sectionId: 'a', fieldId: 'b', operator: 'equals' }] })?.showWhen).toHaveLength(1)
  })
})
