import { describe, expect, it } from 'vitest'
import { carePlanValueKey, formatCarePlanAnswer } from './care-plan-read-view.util'

const field = (fieldType: string) => ({ fieldType, label: 'Q' }) as Parameters<typeof formatCarePlanAnswer>[0]

describe('care plan read view answers', () => {
  it('keys answers by section and field', () => {
    expect(carePlanValueKey('s1', 'f1')).toBe('s1:f1')
  })

  it('shows yes / no and empty answers', () => {
    expect(formatCarePlanAnswer(field('YES_NO'), true)).toEqual({ kind: 'text', text: 'Yes' })
    expect(formatCarePlanAnswer(field('CHECKBOX'), 'false')).toEqual({ kind: 'text', text: 'No' })
    expect(formatCarePlanAnswer(field('TEXT'), undefined)).toEqual({ kind: 'empty' })
    expect(formatCarePlanAnswer(field('TEXT'), '   ')).toEqual({ kind: 'empty' })
  })

  it('keeps rich text as html and treats an empty editor as empty', () => {
    expect(formatCarePlanAnswer(field('RICH_TEXT'), '<p>Likes tea</p>')).toEqual({ kind: 'html', html: '<p>Likes tea</p>' })
    expect(formatCarePlanAnswer(field('TEXTAREA'), '<p><br></p>')).toEqual({ kind: 'empty' })
    expect(formatCarePlanAnswer(field('TEXTAREA'), 'Plain words')).toEqual({ kind: 'text', text: 'Plain words' })
  })

  it('lists multi-select answers and shows signatures as images', () => {
    expect(formatCarePlanAnswer(field('MULTI_SELECT'), JSON.stringify(['Morning', 'Evening']))).toEqual({
      kind: 'list',
      items: ['Morning', 'Evening'],
    })
    expect(formatCarePlanAnswer(field('SIGNATURE'), 'data:image/png;base64,AAAA')).toMatchObject({ kind: 'image' })
    expect(formatCarePlanAnswer(field('SIGNATURE'), 'not-an-image')).toEqual({ kind: 'empty' })
  })
})
