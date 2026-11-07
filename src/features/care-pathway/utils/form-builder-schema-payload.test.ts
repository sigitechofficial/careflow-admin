import { describe, expect, it } from 'vitest'
import type {
  CareFormFieldRow,
  CareFormSectionRow,
} from '@/features/care-pathway/types/care-pathway.types'
import {
  buildSaveSchemaPayload,
  draftRowId,
  isDraftRowId,
  pruneDanglingConditions,
} from './form-builder-schema-payload.util'

const SEC = '11111111-1111-4111-8111-111111111111'
const GATE = '22222222-2222-4222-8222-222222222222'
const DETAIL = '33333333-3333-4333-8333-333333333333'

function field(overrides: Partial<CareFormFieldRow> = {}): CareFormFieldRow {
  return {
    id: GATE,
    label: 'Is there a risk?',
    fieldType: 'YES_NO',
    placeholder: null,
    helpText: null,
    required: false,
    optionsJson: null,
    validationJson: null,
    conditionalLogicJson: null,
    sortOrder: 0,
    ...overrides,
  }
}

function section(overrides: Partial<CareFormSectionRow> = {}): CareFormSectionRow {
  return {
    id: SEC,
    title: 'Risk',
    description: null,
    sortOrder: 0,
    fields: [
      field(),
      field({
        id: DETAIL,
        label: 'Identify the risk',
        fieldType: 'RICH_TEXT',
        sortOrder: 1,
        conditionalLogicJson: {
          showWhen: [{ sectionId: SEC, fieldId: GATE, operator: 'is_true' }],
        },
      }),
    ],
    ...overrides,
  }
}

describe('draftRowId', () => {
  it('is unique, recognisable, and safe inside a `${sectionId}:${fieldId}` key', () => {
    const ids = new Set(Array.from({ length: 500 }, () => draftRowId()))
    expect(ids.size).toBe(500)
    for (const id of ids) {
      expect(isDraftRowId(id)).toBe(true)
      expect(id).not.toContain(':')
      expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/) // API clientId pattern
    }
    expect(isDraftRowId(GATE)).toBe(false)
  })
})

describe('buildSaveSchemaPayload', () => {
  it('sends saved ids so the API updates rows in place', () => {
    const [s] = buildSaveSchemaPayload([section()])
    expect(s.id).toBe(SEC)
    expect(s.fields.map((f) => f.id)).toEqual([GATE, DETAIL])
    expect(s.fields.every((f) => f.clientId === undefined)).toBe(true)
  })

  it('sends show-when rules, and null (clear) when a field has none', () => {
    const [s] = buildSaveSchemaPayload([section()])
    expect(s.fields[0].conditionalLogicJson).toBeNull()
    expect(s.fields[1].conditionalLogicJson).toEqual({
      showWhen: [{ sectionId: SEC, fieldId: GATE, operator: 'is_true' }],
    })
  })

  it('round-trips validationJson', () => {
    const [s] = buildSaveSchemaPayload([
      section({ fields: [field({ validationJson: { maxLength: 200 } })] }),
    ])
    expect(s.fields[0].validationJson).toEqual({ maxLength: 200 })
  })

  it('sends new rows without ids; new fields carry clientId so rules can reference them', () => {
    const newSection = draftRowId()
    const newGate = draftRowId()
    const [, s] = buildSaveSchemaPayload([
      section(),
      section({
        id: newSection,
        title: 'Swallowing',
        fields: [
          field({ id: newGate, label: 'Difficulty swallowing?' }),
          field({
            id: draftRowId(),
            label: 'Describe',
            fieldType: 'TEXT',
            conditionalLogicJson: {
              showWhen: [{ sectionId: newSection, fieldId: newGate, operator: 'is_true' }],
            },
          }),
        ],
      }),
    ])
    expect(s).not.toHaveProperty('id')
    expect(s.fields[0]).toMatchObject({ clientId: newGate })
    expect(s.fields[0]).not.toHaveProperty('id')
    expect(s.fields[1].conditionalLogicJson).toEqual({
      showWhen: [{ sectionId: newSection, fieldId: newGate, operator: 'is_true' }],
    })
  })

  it('skips blank rows, re-indexes sortOrder, and drops rules on skipped fields', () => {
    const [s] = buildSaveSchemaPayload([
      section({
        fields: [
          field({ label: '   ' }),
          field({
            id: DETAIL,
            label: ' Identify ',
            fieldType: 'TEXT',
            sortOrder: 1,
            conditionalLogicJson: {
              showWhen: [{ sectionId: SEC, fieldId: GATE, operator: 'is_true' }],
            },
          }),
        ],
      }),
      section({ id: draftRowId(), title: '  ', fields: [] }),
    ])
    expect(s.fields).toHaveLength(1)
    expect(s.fields[0]).toMatchObject({
      id: DETAIL,
      label: 'Identify',
      sortOrder: 0,
      conditionalLogicJson: null,
    })
  })
})

describe('pruneDanglingConditions', () => {
  it('returns the same array when every rule still has its controlling field', () => {
    const sections = [section()]
    expect(pruneDanglingConditions(sections)).toBe(sections)
  })

  it('removes rules whose controlling field was removed', () => {
    const s = section()
    const pruned = pruneDanglingConditions([{ ...s, fields: [s.fields[1]] }])
    expect(pruned[0].fields[0].conditionalLogicJson).toBeNull()
  })
})
