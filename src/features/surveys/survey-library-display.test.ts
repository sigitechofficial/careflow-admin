import { describe, expect, it } from 'vitest'
import { describeAnsweredWithoutName } from '@/features/surveys/survey-respondent'
import {
  cardSummary,
  recommendedTiming,
  responsesDescription,
  responsesLabel,
  shortTiming,
  suggestSurveyName,
} from '@/features/surveys/survey-library-display'

describe('ready-made survey card text', () => {
  it('shortens the timing to how often and the month', () => {
    expect(
      shortTiming({
        when: 'Once a year: opens on the first working day of February and closes 4 weeks later, with a reminder after 2 weeks',
        recurrence: 'YEARLY',
        trigger: null,
      }),
    ).toBe('Once a year, February')
    expect(shortTiming({ when: 'Six weeks after care starts; by phone', recurrence: null, trigger: 'START' })).toBe(
      'Six weeks after care starts',
    )
    expect(shortTiming({ when: 'Every quarter', recurrence: 'QUARTERLY', trigger: null })).toBe('Every quarter')
  })

  it('drops the repeated counts and minutes from the summary', () => {
    expect(
      cardSummary(
        'Our main yearly survey for everyone we support: overall experience and raising concerns. Confidential, 18 questions, about 8 minutes, by portal, post, phone or visit.',
      ),
    ).toBe('Our main yearly survey for everyone we support: overall experience and raising concerns.')
    expect(cardSummary('A quick check-in after six weeks.')).toBe('A quick check-in after six weeks.')
    expect(cardSummary('A quick check-in, anonymous, 6 questions, about 2 minutes.')).toBe('A quick check-in.')
  })

  it('names how answers are kept', () => {
    expect(responsesLabel({ anonymous: true, audience: 'EMPLOYEE' })).toBe('Anonymous')
    expect(responsesLabel({ anonymous: false, audience: 'SERVICE_USER' })).toBe('Confidential')
    expect(responsesLabel({ anonymous: false, audience: 'EMPLOYEE' })).toBe('Confidential')
    expect(responsesLabel({ anonymous: false, audience: 'PUBLIC' })).toBe('Named')
  })
})

describe('starting a survey from a ready-made template', () => {
  const yearly = {
    when: 'Once a year: opens on the first working day of February and closes 4 weeks later',
    recurrence: 'YEARLY' as const,
    trigger: null,
  }

  it('suggests the recommended timing without scheduling anything', () => {
    expect(recommendedTiming(yearly)).toBe('Recommended: once a year in February')
    expect(recommendedTiming({ when: 'Every quarter', recurrence: 'QUARTERLY', trigger: null })).toBe('Recommended: every quarter')
    expect(recommendedTiming({ when: 'Six weeks after care starts; by phone', recurrence: null, trigger: 'START' })).toBe(
      'Recommended: six weeks after care starts',
    )
    expect(recommendedTiming({ when: '', recurrence: null, trigger: null })).toBeNull()
    expect(recommendedTiming(null)).toBeNull()
  })

  it('adds the period to the name where the survey repeats', () => {
    // Yearly in February: the next February (this year's if it is still to come).
    expect(suggestSurveyName('Annual survey', yearly, '2026-11-05')).toBe('Annual survey — February 2027')
    expect(suggestSurveyName('Annual survey', yearly, '2027-01-10')).toBe('Annual survey — February 2027')
    expect(suggestSurveyName('Annual survey', yearly, '2027-02-20')).toBe('Annual survey — February 2027')
    expect(suggestSurveyName('Annual survey', { ...yearly, when: 'Once a year' }, '2026-11-05')).toBe('Annual survey — 2026')
    expect(suggestSurveyName('Pulse', { when: 'Every quarter', recurrence: 'QUARTERLY', trigger: null }, '2026-11-05')).toBe(
      'Pulse — October–December 2026',
    )
    expect(suggestSurveyName('Check-in', { when: 'Every month', recurrence: 'MONTHLY', trigger: null }, '2026-11-05')).toBe(
      'Check-in — November 2026',
    )
    // 5 Nov 2026 is a Thursday; the week starts on Monday 2 Nov.
    expect(suggestSurveyName('Huddle', { when: 'Every week', recurrence: 'WEEKLY', trigger: null }, '2026-11-05')).toBe(
      'Huddle — week of 2 Nov 2026',
    )
  })

  it('keeps the name as it is for one-off surveys or without timing', () => {
    expect(suggestSurveyName('Six-week review', { when: 'Six weeks after care starts', recurrence: null, trigger: 'START' }, '2026-11-05')).toBe(
      'Six-week review',
    )
    expect(suggestSurveyName('My template', null, '2026-11-05')).toBe('My template')
    expect(suggestSurveyName('Annual survey — February 2027', yearly, '2026-11-05')).toBe('Annual survey — February 2027')
  })
})

describe('ready-made reader: answering without a name', () => {
  it('says when people can choose to answer without their name', () => {
    expect(responsesDescription({ anonymous: false, audience: 'SERVICE_USER', allowAnonymousResponses: true })).toBe(
      'Confidential — people can choose to answer without their name',
    )
    expect(responsesDescription({ anonymous: false, audience: 'SERVICE_USER' })).toBe('Confidential')
    expect(responsesDescription({ anonymous: true, audience: 'EMPLOYEE', allowAnonymousResponses: true })).toBe('Anonymous')
  })
})

describe('results: share answered without a name', () => {
  it('describes the share on named surveys', () => {
    expect(describeAnsweredWithoutName({ answeredWithoutName: 3, answeredWithoutNamePercent: 30, responses: 10 })).toBe(
      '3 of 10 responses (30%) were given without a name.',
    )
    expect(describeAnsweredWithoutName({ answeredWithoutName: 1, answeredWithoutNamePercent: 100, responses: 1 })).toBe(
      '1 of 1 response (100%) was given without a name.',
    )
    expect(
      describeAnsweredWithoutName({ answeredWithoutName: 0, answeredWithoutNamePercent: 0, responses: 4, allowAnonymousResponses: true }),
    ).toBe('0 of 4 responses (0%) were given without a name.')
    expect(describeAnsweredWithoutName({ answeredWithoutName: 0, responses: 4 })).toBeNull()
    expect(describeAnsweredWithoutName({ answeredWithoutName: null, responses: 4 })).toBeNull()
  })
})
