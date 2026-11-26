import { describe, expect, it } from 'vitest'
import { buildPrefillMap, prefillKeyForQuestion } from '@/features/service-users/initial-assessment/utils/question-prefill'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ServiceUserDetail } from '@/features/service-users/api'

const rel = (code: string, name: string) => ({ id: code, code, name })
const detail = {
  firstName: 'Amir',
  lastName: 'Khan',
  references: [],
  contacts: [
    { id: '1', firstName: 'Dr', lastName: 'Patel', phone: '0100', relationshipType: rel('GP', 'GP') },
    { id: '2', firstName: 'Omar', lastName: 'Khan', mobile: '0711', relationshipType: rel('SON', 'Son'), isPrimary: true },
    { id: '3', firstName: 'Sara', lastName: 'Khan', phone: '0722', relationshipType: rel('DAUGHTER', 'Daughter'), isEmergencyContact: true },
    { id: '4', firstName: 'Ali', lastName: 'Raza', email: 'ali@example.com', address: '1 High St', relationshipType: rel('POWER_OF_ATTORNEY', 'Power of Attorney') },
  ],
} as unknown as ServiceUserDetail

describe('contacts prefill', () => {
  it('lists every family / representative contact, emergency first, without GP', () => {
    const map = buildPrefillMap({ detail, domCare: null })
    expect(map.get('emergencyContact')).toBe(
      [
        'Sara Khan · Daughter · 0722 · (emergency contact)',
        'Omar Khan · Son · 0711 · (primary)',
        'Ali Raza · Power of Attorney',
      ].join('\n'),
    )
  })

  it('prefills the LPA questions from the Power of Attorney contact', () => {
    const map = buildPrefillMap({ detail, domCare: null })
    expect(map.get('lpaName')).toBe('Ali Raza')
    expect(map.get('lpaContact')).toBe('Contact: ali@example.com\nAddress: 1 High St')
    const q = (fieldKey: string) => ({ id: 'q', questionText: '', questionType: 'TEXT', metadata: { fieldKey } }) as unknown as InitialAssessmentQuestion
    expect(prefillKeyForQuestion(q('lpoaName'))).toBe('lpaName')
    expect(prefillKeyForQuestion(q('lpoaContactDetails'))).toBe('lpaContact')
  })
})
