import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { EmployeePayrollProfile, EmployeePayrollSetupRow } from '@/features/payroll/types/payroll.types'

// Stable lists, as react-query returns them (a new [] on every render would re-run the form's effect).
const state = vi.hoisted(() => ({ rows: [] as unknown[], mutate: vi.fn(), none: [] as unknown[] }))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ can: () => true, user: { id: 'u-1' } }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/locations/hooks/useGlobalLocationScope', () => ({ useGlobalLocationScope: () => ({ locationId: null }) }))
vi.mock('@/features/payroll/components/PayrollSectionLayout', () => ({
  PayrollSectionLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/payroll/components/PayAgreementsPanel', () => ({ PayAgreementsPanel: () => null }))
vi.mock('@/features/payroll/components/DirectorStatusSection', () => ({
  DirectorStatusSection: () => null,
  directorStatusLabel: () => 'Not yet classified',
}))
vi.mock('@/features/payroll/hooks/usePayroll', () => ({
  usePayrollEmployees: () => ({ data: state.rows, isLoading: false }),
  usePayrollSchedules: () => ({ data: state.none }),
  usePayrollTaxCodes: () => ({ data: state.none }),
  usePayrollStatutoryRates: () => ({ data: state.none }),
  useUpsertEmployeePayrollProfile: () => ({ mutate: state.mutate, isPending: false }),
}))

import PayrollEmployeesPage from './PayrollEmployeesPage'

const profile = (over: Partial<EmployeePayrollProfile> = {}): EmployeePayrollProfile => ({
  id: 'p-1',
  employeeId: 'e-1',
  scheduleId: null,
  status: 'DRAFT',
  taxCode: '1257L',
  taxCodeWeek1Month1: false,
  niCategory: null,
  starterDeclaration: 'UNKNOWN',
  hoursNormallyWorked: null,
  p45Received: false,
  studentLoanPlan1: false,
  studentLoanPlan2: false,
  studentLoanPlan4: false,
  studentLoanPlan5: false,
  postgraduateLoan: false,
  pensionOptedIn: false,
  pensionSchemeRef: null,
  isDirector: null,
  deductionElections: [],
  bankSortCode: '12-34-56',
  bankAccountNumber: '12345678',
  bankAccountName: 'Synthetic Carer',
  notes: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...over,
})
const openProfile = (p: EmployeePayrollProfile) => {
  const row: EmployeePayrollSetupRow = {
    employeeId: 'e-1',
    displayName: 'Synthetic Carer',
    payrollNumber: 'P-1',
    nationalInsuranceNo: null,
    defaultPayCardId: null,
    profile: p,
    activeAgreement: null,
  }
  state.rows = [row]
  render(<PayrollEmployeesPage />)
  fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
}
const niField = () => screen.getByRole('combobox', { name: 'Employee National Insurance category' })
const saveProfile = () => fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

describe('NI category on the payroll profile form: never assumed to be A (Gate C9)', () => {
  beforeEach(() => {
    state.mutate.mockReset()
  })

  it('a missing NI category shows "Not set", not A, with a clear message', () => {
    openProfile(profile({ niCategory: null }))
    expect(niField()).toHaveTextContent('Not set')
    expect(niField()).not.toHaveTextContent(/^A/)
    expect(screen.getByTestId('ni-category-missing')).toHaveTextContent('NI category not set')
  })

  it('choosing A explicitly saves A', () => {
    openProfile(profile({ niCategory: null }))
    fireEvent.click(niField())
    fireEvent.click(screen.getByRole('option', { name: /A — Standard/ }))
    expect(niField()).toHaveTextContent('A — Standard')
    expect(screen.queryByTestId('ni-category-missing')).toBeNull()
    saveProfile()
    expect(state.mutate).toHaveBeenCalledWith(expect.objectContaining({ niCategory: 'A' }))
  })

  it('saving other fields leaves a missing category unset and a recorded one unchanged', () => {
    openProfile(profile({ niCategory: null }))
    fireEvent.click(screen.getByText('P45 received from previous employer'))
    saveProfile()
    const body = state.mutate.mock.calls[0][0] as Record<string, unknown>
    expect(body.p45Received).toBe(true)
    expect(body.niCategory).toBeUndefined() // not sent: the backend keeps it not set

    state.mutate.mockReset()
    cleanup()
    openProfile(profile({ niCategory: 'C' }))
    expect(niField()).toHaveTextContent(/^C/)
    saveProfile()
    expect(state.mutate).toHaveBeenCalledWith(expect.objectContaining({ niCategory: 'C' }))
  })
})
