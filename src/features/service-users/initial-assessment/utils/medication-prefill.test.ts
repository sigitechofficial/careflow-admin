import { describe, expect, it } from 'vitest'
import {
  answerIsPrefillValue,
  buildAnswerFromPrefill,
  buildPrefillMap,
  prefillKeyForQuestion,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type { ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'

const detail = { firstName: 'Amir', lastName: 'Khan', references: [], contacts: [] } as unknown as ServiceUserDetail
const med = (over: Partial<ServiceUserMedicationRow>) =>
  ({ medicationName: 'Paracetamol', strength: '500mg', dose: '1 tablet', status: 'ACTIVE', medicationKind: 'REGULAR', ...over }) as ServiceUserMedicationRow
const q = (fieldKey: string, questionType = 'TEXTAREA') =>
  ({ id: 'q1', questionText: '', questionType, metadata: { fieldKey } }) as unknown as InitialAssessmentQuestion

describe('Meds tab → IA §9 prefill', () => {
  it('prefills storage, notes and "yes" answers from the medicines list', () => {
    const map = buildPrefillMap({
      detail,
      domCare: null,
      medicationSupport: { storageLocation: 'Kitchen cupboard', notes: 'Pharmacy: Boots' },
      medications: [
        med({}),
        med({ medicationName: 'Oramorph', strength: '10mg/5ml', dose: '5ml', medicationKind: 'PRN', reasonForMedication: 'Pain', prnMaxDosesIn24Hours: 4 }),
        med({ medicationName: 'Sinemet', strength: '125mg', dose: null, timeCritical: true }),
        med({ medicationName: 'Old', status: 'ENDED', medicationKind: 'PRN' }),
      ],
    })
    expect(map.get('medStorageLocation')).toBe('Kitchen cupboard')
    expect(map.get('medSupportNotes')).toBe('Pharmacy: Boots')
    expect(map.get('medTakingPrescribed')).toBe('yes')
    expect(map.get('medPrnDetails')).toBe('Oramorph 10mg/5ml 5ml — Pain (max 4 in 24 hours)')
    expect(map.get('medTimeCriticalDetails')).toBe('Sinemet 125mg')
  })

  it('never prefills "no" for an empty list', () => {
    const map = buildPrefillMap({ detail, domCare: null, medications: [] })
    expect(map.get('medTakingPrescribed') ?? '').toBe('')
    expect(buildAnswerFromPrefill(q('takingPrescribedMedication', 'YES_NO'), '')).toBeNull()
    expect(buildAnswerFromPrefill(q('takingPrescribedMedication', 'YES_NO'), 'no')).toBeNull()
  })

  it('links the §9 questions and prefills a yes/no as checked', () => {
    expect(prefillKeyForQuestion(q('prnMedicationInUse', 'YES_NO'))).toBe('medPrnInUse')
    expect(prefillKeyForQuestion(q('medicationStorageDetails'))).toBe('medStorageLocation')
    const yesNo = q('prnMedicationInUse', 'YES_NO')
    expect(buildAnswerFromPrefill(yesNo, 'yes')).toEqual({ questionId: 'q1', checked: true, booleanValue: true })
    expect(answerIsPrefillValue(yesNo, { questionId: 'q1', booleanValue: true }, new Map([['medPrnInUse', 'yes']]))).toBe(true)
  })
})
