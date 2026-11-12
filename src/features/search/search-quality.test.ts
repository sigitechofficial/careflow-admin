import { describe, expect, it } from 'vitest'
import { buildFindEntries, locate } from './find-entries'
import { rank } from './search-engine'

/** What people type, and what must come first (someone with full access). Add a line when a search lets someone down. */
const TOP_RESULT: Array<[string, string]> = [
  ['branches', 'Location Management'],
  ['locations', 'Location Management'],
  ['dom care', 'Dom Care Settings'],
  ['service', 'Service Users'],
  ['rota', 'Rota view'],
  ['roster', 'Rota view'],
  ['annual leave', 'Absence tracker'],
  ['dbs', 'Compliance board'],
  ['medication', 'Medication'],
  ['missed meds', 'How do I see missed or refused medication?'],
  ['payroll', 'UK Payroll'],
  ['payslip', 'Payslips'],
  ['council', 'Funders'],
  ['complaint', 'Complaints & Compliments'],
  ['incident', 'All Incidents'],
  ['survey', 'All surveys'],
  ['reviewer', 'Independent reviewers'],
  ['policy', 'Policy Library'],
  ['logged out', 'Why was I signed out?'],
  ['late visits', 'Live monitoring'],
  ['audit', 'Audit log'],
  ['company logo', 'Company Logo'],
  ['add carer', 'Add Employee'],
  ['how do i add a service user', 'Add Service User'],
  ['mileage', 'Travel payment'],
]

describe('Find anything: everyday searches put the right thing first', () => {
  const entries = buildFindEntries(() => true, { role: 'super_admin', permissions: ['schedule.read'] })

  it.each(TOP_RESULT)('"%s" → %s', (query, expected) => {
    expect(rank(entries, query, 3)[0]?.title).toBe(expected)
  })

  it('nothing rather than something misleading ("ppe": there is no equipment page yet)', () => {
    expect(rank(entries, 'ppe', 3)).toEqual([])
  })

  it('records show where they live in the menu', () => {
    expect(locate('/incidents/123')).toEqual(['Quality & Compliance', 'Incidents'])
    expect(locate('/policies/123').slice(-1)).toEqual(['Policy Library'])
    expect(locate('/settings/location-management').slice(-1)).toEqual(['Location Management'])
    expect(locate('/employee/1/edit')).toEqual(['Workforce', 'Staff'])
  })
})
