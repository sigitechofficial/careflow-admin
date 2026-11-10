import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, startingLanguage } from './survey-translate'
import type { PublicSurveyForm } from './types'

const form = (over: Partial<PublicSurveyForm> = {}) =>
  ({
    languages: [
      { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
      { code: 'en-x-easyread', name: 'Easy read', nativeName: 'Easy read', dir: 'ltr' },
    ],
    ...over,
  }) as PublicSurveyForm

beforeEach(() => window.localStorage.clear())

describe('the version a survey opens in', () => {
  it('opens in the version their record suggests', () => {
    expect(startingLanguage(form({ suggestedLanguage: 'en-x-easyread' }))).toBe('en-x-easyread')
  })

  it('a choice they made on the page before wins', () => {
    window.localStorage.setItem(STORAGE_KEY, 'pl')
    expect(startingLanguage(form({ suggestedLanguage: 'en-x-easyread' }))).toBe('pl')
  })

  it('ignores a suggestion the survey is not published in', () => {
    expect(startingLanguage(form({ suggestedLanguage: 'ur' }))).toBeNull()
  })
})
