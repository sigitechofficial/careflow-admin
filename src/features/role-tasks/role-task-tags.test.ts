import { describe, expect, it } from 'vitest'
import { roleTaskTags } from '@/features/role-tasks/role-task-tags'

describe('roleTaskTags', () => {
  it('Care app sign-up: carer by name, requested by the carer', () => {
    expect(
      roleTaskTags({ sourceType: 'CARER_SIGNUP', templateId: null, about: { kind: 'CARER', name: 'Phone Tester' } }),
    ).toEqual({ type: 'Care app sign-up', about: 'Carer · Phone Tester', requestedBy: 'Carer (Care app)', course: null })
  })

  it('training finished late: exact type, course, carer by name, nobody requested it', () => {
    expect(
      roleTaskTags({
        sourceType: 'LEARNING_LATE_REVIEW',
        templateId: null,
        about: { kind: 'CARER', name: 'Priya Sharma' },
        course: 'Infection Prevention and Control',
      }),
    ).toEqual({
      type: 'Training finished late (review)',
      about: 'Carer · Priya Sharma',
      requestedBy: null,
      course: 'Infection Prevention and Control',
    })
  })

  it('surveys, manager tasks and unknown sources', () => {
    expect(roleTaskTags({ sourceType: 'SURVEY_ALERT', templateId: null }).type).toBe('Survey')
    expect(roleTaskTags({ sourceType: 'SURVEY_ALERT', templateId: null }).about).toBeNull()
    expect(roleTaskTags({ sourceType: null, templateId: 't1' }).type).toBe('Role task')
    expect(roleTaskTags({ sourceType: 'SOMETHING_NEW', templateId: null }).type).toBeNull()
  })

  it('falls back to "Carer" when the name is not known', () => {
    expect(roleTaskTags({ sourceType: 'CARER_DELETION_REQUEST', templateId: null }).about).toBe('Carer')
  })
})
