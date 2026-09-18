import { describe, expect, it } from 'vitest'
import { carePlanPictureSlug, resolveCarePlanCardPictureUrl } from './care-plan-icon-resolve'

describe('resolveCarePlanCardPictureUrl', () => {
  it('rewrites imported upload paths to bundled public assets', () => {
    expect(resolveCarePlanCardPictureUrl('Continence', '/uploads/care-pathway/imported/continence.png')).toBe(
      '/care-plan-icons/imported/continence.png',
    )
  })

  it('prefers imported PNG when API points at generated standard SVG', () => {
    expect(resolveCarePlanCardPictureUrl('Medication', '/uploads/care-pathway/standard/medication.svg')).toBe(
      '/care-plan-icons/imported/medication.png',
    )
  })

  it('resolves by title when pictureUrl is missing (live gap)', () => {
    expect(resolveCarePlanCardPictureUrl('Falls', null)).toBe('/care-plan-icons/imported/mobility.png')
    expect(resolveCarePlanCardPictureUrl('Final Days', undefined)).toBe(
      '/care-plan-icons/imported/palliative.png',
    )
  })

  it('leaves custom form uploads on the API path', () => {
    expect(
      resolveCarePlanCardPictureUrl('Custom', '/uploads/care-pathway/forms/abc.png'),
    ).toBe('/uploads/care-pathway/forms/abc.png')
  })

  it('maps catalogue titles to the same slugs as local seed', () => {
    expect(carePlanPictureSlug('Culture/Religion/Spirituality')).toBe('religion')
    expect(carePlanPictureSlug('Risk Assessment and Care Plan')).toBe('danger')
    expect(carePlanPictureSlug('Washing and dressing')).toBe('personal-washing')
  })
})
