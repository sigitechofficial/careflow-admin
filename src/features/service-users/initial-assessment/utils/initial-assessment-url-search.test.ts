import { describe, expect, it } from 'vitest'
import { parseInitialAssessmentEnterpriseSearch } from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import { holisticTabById } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

describe('parseInitialAssessmentEnterpriseSearch', () => {
  it('accepts registered holistic tab ids including 19, 20, 21 and 22', () => {
    for (const section of [1, 18, 19, 20, 21, 22]) {
      expect(parseInitialAssessmentEnterpriseSearch({ section }).section).toBe(section)
      expect(parseInitialAssessmentEnterpriseSearch({ section: String(section) }).section).toBe(section)
    }
  })

  it('selects by frozen internal tab id, not enterpriseSection or display order index', () => {
    expect(parseInitialAssessmentEnterpriseSearch({ section: 21 }).section).toBe(21)
    expect(holisticTabById(21)?.title).toBe('Infection and Clinical Precautions')
    expect(holisticTabById(21)?.enterpriseSection).toBe(15)

    expect(parseInitialAssessmentEnterpriseSearch({ section: 19 }).section).toBe(19)
    expect(holisticTabById(19)?.title).toBe('Personal Emergency Evacuation Plan (PEEP)')

    expect(parseInitialAssessmentEnterpriseSearch({ section: 20 }).section).toBe(20)
    expect(holisticTabById(20)?.title).toBe('Bed Rails')

    expect(parseInitialAssessmentEnterpriseSearch({ section: 22 }).section).toBe(22)
    expect(holisticTabById(22)?.title).toBe('Fire Safety')

    expect(parseInitialAssessmentEnterpriseSearch({ section: 15 }).section).toBe(15)
    expect(holisticTabById(15)?.title).toBe('Social and Clinical assessment outcome summary')
  })

  it('rejects unregistered ids such as 0, 23 and 99', () => {
    expect(parseInitialAssessmentEnterpriseSearch({ section: 0 }).section).toBeUndefined()
    expect(parseInitialAssessmentEnterpriseSearch({ section: 23 }).section).toBeUndefined()
    expect(parseInitialAssessmentEnterpriseSearch({ section: '99' }).section).toBeUndefined()
    expect(parseInitialAssessmentEnterpriseSearch({ section: 'abc' }).section).toBeUndefined()
  })
})
