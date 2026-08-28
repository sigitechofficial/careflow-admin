import { describe, expect, it } from 'vitest'
import {
  filterCarePlansByFormSelection,
  mergeFormsWithCarePlanInstances,
} from './care-plan-catalog'

const catalogue = [
  { id: 'form-falls', name: 'Falls', pictureUrl: null },
  { id: 'form-skin', name: 'Skin Integrity', pictureUrl: null },
  { id: 'form-psych', name: 'Psychological', pictureUrl: null },
]

describe('mergeFormsWithCarePlanInstances', () => {
  it('keeps Form Selection filter for templates that have no instance', () => {
    const selected = filterCarePlansByFormSelection(catalogue, ['form-falls'])
    expect(selected.map((f) => f.name)).toEqual(['Falls'])

    const merged = mergeFormsWithCarePlanInstances(selected, catalogue, [])
    expect(merged.map((f) => f.name)).toEqual(['Falls'])
  })

  it('adds a published Skin Integrity form that is outside Form Selection so Live can show it', () => {
    const selected = filterCarePlansByFormSelection(catalogue, ['form-falls'])
    const merged = mergeFormsWithCarePlanInstances(selected, catalogue, [
      {
        carePathwayFormId: 'form-skin',
        formName: 'Skin Integrity',
        pictureUrl: null,
      },
    ])

    expect(merged.map((f) => f.name).sort()).toEqual(['Falls', 'Skin Integrity'])
  })

  it('does not duplicate a selected form that also has an instance', () => {
    const selected = filterCarePlansByFormSelection(catalogue, ['form-falls', 'form-skin'])
    const merged = mergeFormsWithCarePlanInstances(selected, catalogue, [
      { carePathwayFormId: 'form-falls', formName: 'Falls' },
      { carePathwayFormId: 'form-skin', formName: 'Skin Integrity' },
    ])
    expect(merged).toHaveLength(2)
  })

  it('falls back to instance formName when the form is missing from the catalogue', () => {
    const selected = filterCarePlansByFormSelection(catalogue, ['form-falls'])
    const merged = mergeFormsWithCarePlanInstances(selected, catalogue, [
      { carePathwayFormId: 'form-orphan', formName: 'Custom Plan', pictureUrl: '/x.png' },
    ])
    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'form-orphan', name: 'Custom Plan', pictureUrl: '/x.png' }),
      ]),
    )
  })
})
