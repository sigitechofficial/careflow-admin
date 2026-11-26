import { describe, expect, it } from 'vitest'
import { defaultAboutMe } from '@/features/service-users/service-user-about-me'
import {
  practicalCareWithAboutMePrefill,
  splitDomesticSupport,
} from '@/features/service-users/initial-assessment/utils/practical-care-about-me'

describe('Practical tasks ↔ About Me', () => {
  it('splits labelled domestic support and reads plain text as cleaning', () => {
    expect(splitDomesticSupport('Laundry: Weekly wash\nCleaning and housework: Hoovering\nand dusting')).toEqual({
      laundry: 'Weekly wash',
      cleaning: 'Hoovering\nand dusting',
    })
    expect(splitDomesticSupport('Needs help with housework')).toEqual({ laundry: '', cleaning: 'Needs help with housework' })
    expect(splitDomesticSupport('Laundry: Weekly')).toEqual({ laundry: 'Weekly', cleaning: '' })
    expect(splitDomesticSupport('  ')).toEqual({ laundry: '', cleaning: '' })
  })

  it('fills only empty notes from the profile', () => {
    const about = { ...defaultAboutMe(), shoppingArrangements: 'Online order', domesticSupport: 'Laundry: Weekly\nCleaning and housework: Hoovering' }
    expect(practicalCareWithAboutMePrefill({ cleaning: 'Already noted' }, about)).toEqual({
      cleaning: 'Already noted',
      shopping: 'Online order',
      laundry: 'Weekly',
    })
    const full = { shopping: 'a', laundry: 'b', cleaning: 'c' }
    expect(practicalCareWithAboutMePrefill(full, about)).toBe(full)
    const empty = {}
    expect(practicalCareWithAboutMePrefill(empty, defaultAboutMe())).toBe(empty)
  })
})
