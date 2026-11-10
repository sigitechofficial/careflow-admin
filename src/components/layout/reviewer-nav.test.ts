import { describe, expect, it } from 'vitest'
import { inspectorOnlyNavItems, reviewerOnlyNavItems } from '@/components/layout/Sidebar'
import { backendRolesToRoleId } from '@/features/auth/store'

/** Independent survey reviewers have their own account, never a Temporary Inspector login. */
describe('independent reviewer accounts in the app', () => {
  it('a reviewer account sees just "Surveys to record"', () => {
    expect(reviewerOnlyNavItems.map(i => [i.label, i.href])).toEqual([['Surveys to record', '/survey-reviews']])
  })

  it('"Surveys to record" is no longer in the Temporary Inspector menu', () => {
    const hrefs = JSON.stringify(inspectorOnlyNavItems)
    expect(hrefs).not.toContain('/survey-reviews')
  })

  it('only an account whose only role is Independent reviewer is treated as one', () => {
    expect(backendRolesToRoleId(['Independent reviewer'], 'user')).toBe('independent_reviewer')
    expect(backendRolesToRoleId(['Independent reviewer', 'Care Coordinator'], 'user')).not.toBe('independent_reviewer')
    expect(backendRolesToRoleId([], 'user')).not.toBe('independent_reviewer')
    expect(backendRolesToRoleId(['Temporary Inspector'], 'temporary_inspector')).toBe('temporary_inspector')
  })
})
