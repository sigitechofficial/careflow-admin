import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmployeeLookupsBundle } from '@/features/employees/api/employees.api'

const calls: string[] = []
const api = vi.hoisted(() => ({
  createEmployee: vi.fn(),
  patchPersonalDetails: vi.fn(),
  patchEmployment: vi.fn(),
  replaceWorkingPatternsBulk: vi.fn(),
  createEmployeeSkill: vi.fn(),
  createEmergencyContact: vi.fn(),
  fetchEmployeeLookups: vi.fn(),
  listEmployees: vi.fn(),
  setSignInAccess: vi.fn(),
  fetchSignInAccess: vi.fn(),
  createOfficeUser: vi.fn(),
  setOfficeUserRoles: vi.fn(),
  setOfficeUserLocations: vi.fn(),
  fetchOfficeUsers: vi.fn(),
  ensureEmployeeComplianceChecklist: vi.fn(),
  fetchComplianceChecklist: vi.fn(),
  updateEmployeeCompliance: vi.fn(),
  createEmployeeCompliance: vi.fn(),
  apiJson: vi.fn(),
  auth: { permissions: new Set<string>(), roles: [] as string[] },
}))

vi.mock('@/features/employees/api/employees.api', () => ({
  createEmployee: api.createEmployee,
  patchPersonalDetails: api.patchPersonalDetails,
  patchEmployment: api.patchEmployment,
  replaceWorkingPatternsBulk: api.replaceWorkingPatternsBulk,
  createEmployeeSkill: api.createEmployeeSkill,
  createEmergencyContact: api.createEmergencyContact,
  fetchEmployeeLookups: api.fetchEmployeeLookups,
  listEmployees: api.listEmployees,
}))
vi.mock('@/features/employees/api/staff-sign-in-access.api', () => ({
  setSignInAccess: api.setSignInAccess,
  fetchSignInAccess: api.fetchSignInAccess,
}))
vi.mock('@/features/employees/api/employee-compliance-api', () => ({
  ensureEmployeeComplianceChecklist: api.ensureEmployeeComplianceChecklist,
  fetchComplianceChecklist: api.fetchComplianceChecklist,
  updateEmployeeCompliance: api.updateEmployeeCompliance,
  createEmployeeCompliance: api.createEmployeeCompliance,
}))
vi.mock('@/features/settings/api/users-access.api', async (orig) => ({
  ...(await orig<typeof import('@/features/settings/api/users-access.api')>()),
  createOfficeUser: api.createOfficeUser,
  setOfficeUserRoles: api.setOfficeUserRoles,
  setOfficeUserLocations: api.setOfficeUserLocations,
  fetchOfficeUsers: api.fetchOfficeUsers,
}))
vi.mock('@/shared/api/api-client', async (orig) => ({
  ...(await orig<typeof import('@/shared/api/api-client')>()),
  apiJson: api.apiJson,
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      can: (p: string) => api.auth.permissions.has(p),
      user: { backendRoles: api.auth.roles },
    }),
  },
}))

import {
  complianceDates,
  inputProblems,
  officeRoleCheck,
  patternWeeks,
  planPeople,
  resolvePreset,
  runStaffCreation,
  type CreateStaffInput,
} from '@/features/scripts/create-staff.runner'
import { presetById } from '@/features/scripts/staff-presets'

const row = (name: string) => ({ id: `id-${name}`, name })
const lookups = {
  workAreas: [row('Care'), row('Administration')],
  roles: [row('Carer'), row('Office Administrator'), row('Office Manager')],
  jobTitles: [row('Carer'), row('Human Resources'), row('Office Manager')],
  rbacLevels: [row('Carer/Domestic'), row('Manager')],
  contractTypes: [row('Hourly paid'), row('Salaried')],
  travelPaymentTypes: [row('Driver')],
  employeeStatuses: [row('Active'), row('Inactive')],
  locations: [row('Croydon')],
  skillTypes: [{ ...row('Manual Handling'), defaultRefreshMonths: 12 }],
} as unknown as EmployeeLookupsBundle

const input = (over: Partial<CreateStaffInput> = {}): CreateStaffInput => ({
  preset: 'carer',
  count: 1,
  locationId: 'id-Croydon',
  startDate: '2026-11-20',
  password: 'Passw0rd!',
  compliance: false,
  skills: false,
  emergencyContact: false,
  ...over,
})

const record = (name: string) => (...args: unknown[]) => {
  calls.push(`${name} ${JSON.stringify(args[1] ?? args[0])}`)
  return Promise.resolve(name === 'createEmployee' ? { id: 'emp-1' } : name === 'createOfficeUser' ? { id: 'user-1' } : {})
}

beforeEach(() => {
  calls.length = 0
  vi.clearAllMocks()
  api.auth.permissions = new Set(['users.create', 'roles.manage', 'employees.compliance.verify'])
  api.auth.roles = ['Admin']
  api.fetchEmployeeLookups.mockResolvedValue(lookups)
  api.listEmployees.mockResolvedValue({ rows: [{ username: 'test.carer.01' }], meta: { totalPages: 1 } })
  api.fetchOfficeUsers.mockResolvedValue([{ email: 'test.carer.02@careflow.test', username: null }])
  for (const k of [
    'createEmployee',
    'patchPersonalDetails',
    'patchEmployment',
    'replaceWorkingPatternsBulk',
    'setSignInAccess',
    'createOfficeUser',
    'setOfficeUserRoles',
    'setOfficeUserLocations',
    'createEmployeeSkill',
    'createEmergencyContact',
  ] as const) {
    api[k].mockImplementation(record(k))
  }
  api.fetchSignInAccess.mockResolvedValue({ website: { state: 'none', roles: [] }, app: { state: 'active' } })
})

describe('input and presets', () => {
  it('flags a bad count, short password and missing branch', () => {
    expect(inputProblems(input({ count: 0, password: 'short', locationId: '' }))).toEqual([
      'Choose between 1 and 20 people.',
      'Choose a branch.',
      'The password needs at least 8 characters.',
    ])
    expect(inputProblems(input())).toEqual([])
  })

  it('matches lookups by name and stops when a required one is missing', () => {
    const ok = resolvePreset(presetById('carer'), lookups)
    expect(ok.blocking).toEqual([])
    expect(ok.rbacLevelId).toBe('id-Carer/Domestic')
    expect(ok.skills.map((s) => s.name)).toEqual(['Manual Handling'])
    const bad = resolvePreset(presetById('senior-carer'), lookups)
    expect(bad.blocking).toContain('Role "Senior Carer" is not in Settings → Lookup data.')
  })

  it('skips usernames and emails already used', () => {
    const people = planPeople(presetById('carer'), 2, 'Test', {
      usernames: new Set(['test.carer.01']),
      emails: new Set(['test.carer.02@careflow.test']),
    })
    expect(people.map((p) => [p.username, p.email, `${p.firstName} ${p.lastName}`])).toEqual([
      ['test.carer.03', 'test.carer.03@careflow.test', 'Test Carer 03'],
      ['test.carer.04', 'test.carer.04@careflow.test', 'Test Carer 04'],
    ])
    expect(people[0]!.mobile).toBe('+44 7700 900003')
  })

  it('makes a one-week pattern with the preset days available', () => {
    const weeks = patternWeeks(presetById('hr'))
    expect(weeks).toHaveLength(7)
    expect(weeks.filter((w) => w.isAvailable).map((w) => w.dayOfWeek)).toEqual(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])
    expect(weeks[0]).toMatchObject({ startTime: '09:00', endTime: '17:00' })
  })

  it('dates compliance from the start date', () => {
    expect(complianceDates({ hasExpiry: true, defaultValidityMonths: 36 }, '2026-11-20')).toEqual({
      issueDate: '2026-11-20',
      expiryDate: '2029-11-20',
    })
    expect(complianceDates({ hasExpiry: false, defaultValidityMonths: null }, '2026-11-20').expiryDate).toBeNull()
  })

  it('refuses office access above your own', () => {
    expect(officeRoleCheck(presetById('office-manager'), ['Staff Allocation'])).toMatch(/Manager office access/)
    expect(officeRoleCheck(presetById('office-manager'), ['Admin'])).toBeNull()
    expect(officeRoleCheck(presetById('carer'), [])).toBeNull()
  })
})

describe('runStaffCreation', () => {
  it('check first saves nothing', async () => {
    const out = await runStaffCreation(input({ count: 2 }), { dryRun: true, log: () => {} })
    expect(out.results.map((r) => r.username)).toEqual(['test.carer.03', 'test.carer.04'])
    expect(calls).toEqual([])
  })

  it('creates a carer in the Add employee order, with the Care app and the typed password', async () => {
    const out = await runStaffCreation(input(), { dryRun: false, log: () => {} })
    expect(calls.map((c) => c.split(' ')[0])).toEqual([
      'createEmployee',
      'patchPersonalDetails',
      'patchEmployment',
      'replaceWorkingPatternsBulk',
      'setSignInAccess',
    ])
    expect(api.setSignInAccess).toHaveBeenCalledWith('emp-1', { app: true, password: 'Passw0rd!' })
    expect(api.patchEmployment.mock.calls[0]![1]).toMatchObject({
      workAreaId: 'id-Care',
      roleId: 'id-Carer',
      rbacLevelId: 'id-Carer/Domestic',
      locationId: 'id-Croydon',
      accessAllZones: false,
    })
    expect(api.createOfficeUser).not.toHaveBeenCalled()
    expect(out.results[0]).toMatchObject({ created: true, warnings: [], signIn: { app: 'active' } })
  })

  it('gives HR an office login with the HR role and branch, linked by the same email', async () => {
    await runStaffCreation(input({ preset: 'hr' }), { dryRun: false, log: () => {} })
    expect(api.setSignInAccess).not.toHaveBeenCalled()
    expect(api.createOfficeUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test.hr.01@careflow.test', password: 'Passw0rd!' }),
    )
    expect(api.setOfficeUserRoles).toHaveBeenCalledWith('user-1', ['HR'])
    expect(api.setOfficeUserLocations).toHaveBeenCalledWith('user-1', ['id-Croydon'])
    expect(api.patchEmployment.mock.calls[0]![1]).not.toHaveProperty('rbacLevelId')
  })

  it('needs permission to add office users for a preset with an office login', async () => {
    api.auth.permissions = new Set()
    await expect(runStaffCreation(input({ preset: 'hr' }), { dryRun: true, log: () => {} })).rejects.toThrow(/add office users/)
  })

  it('moves on to the next person when one cannot be created', async () => {
    api.createEmployee.mockRejectedValueOnce(new Error('Username already exists'))
    const out = await runStaffCreation(input({ count: 2 }), { dryRun: false, log: () => {} })
    expect(out.results[0]).toMatchObject({ created: false, outcome: 'Not created: Username already exists' })
    expect(out.results[1]).toMatchObject({ created: true })
    expect(api.patchPersonalDetails).toHaveBeenCalledTimes(1)
  })

  it('fills in and verifies the compliance checklist', async () => {
    api.ensureEmployeeComplianceChecklist.mockResolvedValue({
      items: [
        { complianceTypeId: 'c1', name: 'DBS', hasExpiry: true, defaultValidityMonths: 36, requirementId: null, record: { id: 'r1' } },
        { complianceTypeId: 'c2', name: 'Right to Work', hasExpiry: false, requirementId: 'q2', record: null },
      ],
    })
    api.updateEmployeeCompliance.mockResolvedValue({ id: 'r1' })
    api.createEmployeeCompliance.mockResolvedValue({ id: 'r2' })
    api.apiJson.mockResolvedValue({})
    api.fetchComplianceChecklist.mockResolvedValue({
      items: [{ record: { status: 'VALID' } }, { record: { status: 'VALID' } }],
    })
    const out = await runStaffCreation(input({ compliance: true }), { dryRun: false, log: () => {} })
    expect(api.createEmployeeCompliance).toHaveBeenCalledWith('emp-1', expect.objectContaining({ complianceTypeId: 'c2', requirementId: 'q2' }))
    expect(api.apiJson).toHaveBeenCalledWith('/employees/emp-1/compliance/r1/verify', expect.objectContaining({ method: 'PATCH' }))
    expect(api.apiJson).toHaveBeenCalledWith('/employees/emp-1/compliance/r2/verify', expect.objectContaining({ method: 'PATCH' }))
    expect(out.results[0]!.compliance).toEqual({ valid: 2, total: 2 })
  })
})
