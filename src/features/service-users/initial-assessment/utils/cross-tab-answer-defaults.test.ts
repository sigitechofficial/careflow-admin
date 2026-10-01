import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  autoFillSourceNote,
  substanceMisuseImpliedByAnswers,
  syncCrossTabAnswerDefaults,
} from '@/features/service-users/initial-assessment/utils/cross-tab-answer-defaults'

const q = (id: string, fieldKey: string, questionType: InitialAssessmentQuestion['questionType'] = 'YES_NO') =>
  ({
    id,
    questionText: fieldKey,
    questionType,
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 1,
    metadata: { fieldKey },
  }) as InitialAssessmentQuestion

const sections: InitialAssessmentSection[] = [
  {
    id: 's',
    sectionNumber: 1,
    title: 'All',
    sortOrder: 1,
    questions: [
      q('referral', 'referralSource', 'SINGLE_SELECT'),
      q('reason', 'assessmentReason', 'SINGLE_SELECT'),
      q('hospital', 'recentHospitalStay'),
      q('followups', 'dischargeFollowUps', 'MULTI_SELECT'),
      q('dn', 'districtNurseInvolved'),
      q('smoking', 'smokingStatus', 'SINGLE_SELECT'),
      q('smokingProperty', 'smokingInProperty'),
      q('alcohol', 'alcoholUse', 'SINGLE_SELECT'),
      q('drugs', 'recreationalDrugUse', 'SINGLE_SELECT'),
    ],
  },
]

const sel = (questionId: string, value: string | string[]): InitialAssessmentAnswerInput => ({
  questionId,
  selectedOptions: value,
})

describe('syncCrossTabAnswerDefaults', () => {
  it('marks a recent hospital stay when the referral came from hospital', () => {
    const { answers, syncedQuestionIds } = syncCrossTabAnswerDefaults(sections, {
      referral: sel('referral', 'hospital_discharge'),
    })
    expect(answers.hospital?.booleanValue).toBe(true)
    expect(syncedQuestionIds).toEqual(['hospital'])
  })

  it('also uses a post-hospital assessment reason', () => {
    const { answers } = syncCrossTabAnswerDefaults(sections, { reason: sel('reason', 'post_hospital') })
    expect(answers.hospital?.booleanValue).toBe(true)
  })

  it('fills district nurse from discharge follow-up and smoking in property from a current smoker', () => {
    const { answers } = syncCrossTabAnswerDefaults(sections, {
      followups: sel('followups', ['gp_review', 'district_nurse']),
      smoking: sel('smoking', 'current_smoker'),
    })
    expect(answers.dn?.booleanValue).toBe(true)
    expect(answers.smokingProperty?.booleanValue).toBe(true)
  })

  it('never overrides an answer the assessor already gave', () => {
    const before = {
      referral: sel('referral', 'hospital_discharge'),
      hospital: { questionId: 'hospital', booleanValue: false },
    }
    const { answers, syncedQuestionIds } = syncCrossTabAnswerDefaults(sections, before)
    expect(answers.hospital?.booleanValue).toBe(false)
    expect(syncedQuestionIds).toEqual([])
    expect(answers).toBe(before)
  })

  it('implies substance misuse only for alcohol dependence concern or drug use', () => {
    expect(substanceMisuseImpliedByAnswers(sections, { alcohol: sel('alcohol', 'above_14_units') })).toBe(false)
    expect(substanceMisuseImpliedByAnswers(sections, { alcohol: sel('alcohol', 'concern_dependence') })).toBe(true)
    expect(substanceMisuseImpliedByAnswers(sections, { drugs: sel('drugs', 'yes') })).toBe(true)
    expect(substanceMisuseImpliedByAnswers(sections, { drugs: sel('drugs', 'declined') })).toBe(false)
  })
})

describe('autoFillSourceNote', () => {
  const question = (id: string) => sections[0].questions.find((x) => x.id === id)!
  const yes = (questionId: string): InitialAssessmentAnswerInput => ({ questionId, booleanValue: true })

  it('says which answer filled the field', () => {
    const answers = { referral: sel('referral', 'hospital_discharge'), hospital: yes('hospital') }
    expect(autoFillSourceNote(question('hospital'), sections, answers)).toMatch(/^Personal Details \(1\.1\)/)
    expect(
      autoFillSourceNote(question('smokingProperty'), sections, {
        smoking: sel('smoking', 'current_smoker'),
        smokingProperty: yes('smokingProperty'),
      }),
    ).toBe('Personal Details (1.11): current smoker')
  })

  it('stays quiet when the assessor answered No or the source no longer applies', () => {
    expect(
      autoFillSourceNote(question('hospital'), sections, {
        referral: sel('referral', 'hospital_discharge'),
        hospital: { questionId: 'hospital', booleanValue: false },
      }),
    ).toBeNull()
    expect(
      autoFillSourceNote(question('hospital'), sections, {
        referral: sel('referral', 'gp'),
        hospital: yes('hospital'),
      }),
    ).toBeNull()
    expect(autoFillSourceNote(question('referral'), sections, {})).toBeNull()
  })
})
