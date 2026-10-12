import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import type {
  FinancialAuthority,
  RoleResponsibilitiesData,
} from '@/features/settings/roles-permissions/roles-permissions.types'

const state = vi.hoisted(() => ({
  responsibilities: null as unknown,
  authority: null as unknown,
  save: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: () => true }),
}))
vi.mock('@/features/settings/hooks/useRolesPermissions', () => ({
  useRoleResponsibilities: () => ({ data: state.responsibilities, isLoading: false, isError: false }),
  useFinancialAuthority: () => ({ data: state.authority, isLoading: false, isError: false }),
  useAssignRoleResponsibilities: () => ({ mutate: state.save, isPending: false }),
}))

import { ResponsibilitiesPanel } from './ResponsibilitiesPanel'

const responsibilities = (): RoleResponsibilitiesData => ({
  adminRoles: ['Admin', 'Super Admin'],
  roles: [
    { id: 'role-approver', name: 'Payroll Approver' },
    { id: 'role-hr', name: 'HR' },
  ],
  adminRoleOptions: [
    { id: 'role-admin', name: 'Admin' },
    { id: 'role-super', name: 'Super Admin' },
  ],
  responsibilities: [
    {
      key: 'approve-pay',
      label: 'Approve pay and record payments',
      description: 'Approve and lock carer pay runs.',
      explicitOnly: true,
      roleIds: ['role-approver'],
      partialRoleIds: [],
    },
    {
      key: 'payroll',
      label: 'Create payroll (UK payroll)',
      description: 'Run payroll.',
      roleIds: ['role-hr'],
      partialRoleIds: [],
    },
  ],
})
const authority = (over: Partial<FinancialAuthority> = {}): FinancialAuthority => ({
  powers: [
    {
      key: 'approve-pay-runs',
      label: 'Approve and lock visit pay runs',
      permissions: ['billing.payroll_runs.approve'],
      requiredForPayroll: true,
      users: [{ id: 'u1', name: 'Ann Approver', roles: ['Payroll Approver'] }],
    },
    {
      key: 'reopen-uk-payroll',
      label: 'Reopen closed UK payroll runs',
      permissions: ['payroll.runs.reopen'],
      requiredForPayroll: false,
      users: [],
    },
  ],
  warnings: [],
  ...over,
})

describe('ResponsibilitiesPanel — pay authorisation (R-12)', () => {
  beforeEach(() => {
    state.responsibilities = responsibilities()
    state.authority = authority()
    state.save.mockReset()
  })

  it('names the users behind each power and shows no warning when every required power is held', () => {
    render(<ResponsibilitiesPanel />)
    const row = screen.getByTestId('financial-power-approve-pay-runs')
    expect(row).toHaveTextContent('Ann Approver')
    expect(row).toHaveTextContent('Payroll Approver')
    expect(screen.getByTestId('financial-power-reopen-uk-payroll')).toHaveTextContent('Nobody')
    expect(screen.queryByTestId('financial-authority-warnings')).not.toBeInTheDocument()
  })

  it('warns clearly when nobody can approve pay', () => {
    state.authority = authority({
      powers: [{ ...authority().powers[0], users: [] }],
      warnings: [
        {
          powerKey: 'approve-pay-runs',
          kind: 'NO_HOLDER',
          message: 'No active user can approve and lock visit pay runs. Payroll cannot be completed until a role with this power is given to someone.',
        },
      ],
    })
    render(<ResponsibilitiesPanel />)
    expect(screen.getByRole('alert')).toHaveTextContent('No active user can approve and lock visit pay runs')
    expect(screen.getByTestId('financial-power-approve-pay-runs')).toHaveTextContent('Nobody')
  })

  it('admin roles are not shown as holding the approval job, and can be chosen for it', () => {
    render(<ResponsibilitiesPanel />)
    const approval = screen.getByTestId('responsibility-approve-pay')
    expect(within(approval).queryByLabelText(/always responsible/)).not.toBeInTheDocument()
    const superAdmin = within(approval).getByRole('checkbox', { name: 'Super Admin — Approve pay and record payments' })
    expect(superAdmin).toHaveAttribute('aria-checked', 'false')
    expect(within(approval).getByRole('checkbox', { name: 'Payroll Approver — Approve pay and record payments' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    // An ordinary job is still held by the admin roles without a choice.
    const payroll = screen.getByTestId('responsibility-payroll')
    expect(within(payroll).getByLabelText(/always responsible/)).toBeInTheDocument()
    expect(within(payroll).queryByRole('checkbox', { name: /Super Admin/ })).not.toBeInTheDocument()

    fireEvent.click(superAdmin)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(state.save).toHaveBeenCalledWith(
      [{ key: 'approve-pay', roleIds: ['role-approver', 'role-super'] }],
      expect.anything(),
    )
  })
})
