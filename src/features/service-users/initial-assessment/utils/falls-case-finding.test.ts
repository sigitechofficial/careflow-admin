import { describe, expect, it } from 'vitest'
import { fallsCaseFinding } from '@/features/service-users/initial-assessment/utils/falls-case-finding'

const none = { fallsLast12Months: false, unsteadiness: false, fearOfFalling: false, clinicalConcern: false }

describe('fallsCaseFinding', () => {
  it('requires the falls assessment after a fall or with unsteadiness', () => {
    expect(fallsCaseFinding({ ...none, fallsLast12Months: true }).status).toBe('required')
    expect(fallsCaseFinding({ ...none, unsteadiness: true, clinicalConcern: null }).status).toBe('required')
  })

  it('suggests it for fear of falling or another clinical concern', () => {
    expect(fallsCaseFinding({ ...none, clinicalConcern: true })).toEqual({
      status: 'suggested',
      reasons: ['Other clinical concern about falls'],
    })
  })

  it('is not needed only on a clear negative screen', () => {
    expect(fallsCaseFinding(none).status).toBe('not_needed')
  })

  it('stays pending when unanswered — never required by default', () => {
    expect(fallsCaseFinding({ ...none, fearOfFalling: null }).status).toBe('pending')
  })
})
