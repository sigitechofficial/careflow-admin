import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: state.user }),
}))

import { hasOrganisationPayScope, withOrganisationPayScope } from './pay-scope'
import { adminNavItems, filterNavByPermission } from '@/components/layout/Sidebar'

const labels = (organisationPayScope: boolean) => {
  const nav = filterNavByPermission(adminNavItems, () => true, undefined, organisationPayScope)
  const children = (group: string) => nav.find(n => n.label === group)?.children?.map(c => c.label) ?? []
  return { payroll: children('UK Payroll'), billing: children('Billing') }
}

describe('organisation-wide pay access (R-13)', () => {
  beforeEach(() => {
    state.user = null
  })

  it('is held by a user who is not limited to branches, or who has the explicit grant', () => {
    expect(hasOrganisationPayScope(null)).toBe(false)
    expect(hasOrganisationPayScope({ assignedLocationIds: null, permissions: [] })).toBe(true)
    expect(hasOrganisationPayScope({ assignedLocationIds: undefined, permissions: [] })).toBe(true)
    expect(hasOrganisationPayScope({ assignedLocationIds: ['a'], permissions: ['billing.payroll_runs.read'] })).toBe(false)
    expect(hasOrganisationPayScope({ assignedLocationIds: [], permissions: [] })).toBe(false)
    expect(hasOrganisationPayScope({ assignedLocationIds: ['a'], permissions: ['payroll.scope.organisation'] })).toBe(true)
  })

  it('the menu of a branch-limited user keeps the branch screens and drops the organisation-wide ones', () => {
    const branch = labels(false)
    expect(branch.billing).toEqual(expect.arrayContaining(['Billing management', 'Visit reconciliation', 'Salary']))
    expect(branch.billing).not.toContain('Pay items')
    expect(branch.billing).not.toContain('Employee payouts')
    expect(branch.payroll).toEqual(expect.arrayContaining(['Payslips', 'Employee setup']))
    for (const hidden of ['UK payroll runs', 'Taxes', 'Employer PAYE', 'Schedules & periods', 'Tax years']) {
      expect(branch.payroll).not.toContain(hidden)
    }
  })

  it('the menu of an organisation-wide user is unchanged', () => {
    const org = labels(true)
    expect(org.billing).toEqual(expect.arrayContaining(['Pay items', 'Employee payouts', 'Visit reconciliation', 'Salary']))
    expect(org.payroll).toEqual(expect.arrayContaining(['UK payroll runs', 'Payslips', 'Taxes', 'Employee setup']))
  })

  it('an organisation-wide page opened by URL explains why it is not available, instead of an error', () => {
    const Page = withOrganisationPayScope(() => <p>Pay runs</p>)

    state.user = { assignedLocationIds: ['branch-a'], permissions: ['billing.payroll_runs.read'] }
    const limited = render(<Page />)
    expect(screen.getByTestId('organisation-pay-scope-notice')).toHaveTextContent('This screen covers every branch')
    expect(screen.queryByText('Pay runs')).not.toBeInTheDocument()
    limited.unmount()

    state.user = { assignedLocationIds: null, permissions: [] }
    render(<Page />)
    expect(screen.getByText('Pay runs')).toBeInTheDocument()
  })
})
