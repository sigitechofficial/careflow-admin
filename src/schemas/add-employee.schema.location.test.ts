import { describe, expect, it } from 'vitest'
import { employmentStepSchema } from '@/schemas/add-employee.schema'

const baseEmployment = {
  workAreaId: '11111111-1111-4111-8111-111111111111',
  roleId: '22222222-2222-4222-8222-222222222222',
  locationId: '',
  baseLocationIds: [] as string[],
  zoneIds: [] as string[],
  serviceUserAreaIds: [] as string[],
  accessAllZones: false,
  isInCountry: true,
  optedOutOf48Hours: false,
  isAgencyStaff: false,
  isPreferredAgency: false,
  isBlacklisted: false,
}

describe('employmentStepSchema location scope', () => {
  it('requires a branch when access all zones is No', () => {
    const parsed = employmentStepSchema.safeParse(baseEmployment)
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.some(i => i.path.join('.') === 'locationId')).toBe(true)
  })

  it('allows missing branch when access all zones is Yes', () => {
    const parsed = employmentStepSchema.safeParse({
      ...baseEmployment,
      accessAllZones: true,
      locationId: '',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts a single primary branch with service areas', () => {
    const branchId = '33333333-3333-4333-8333-333333333333'
    const areaId = '44444444-4444-4444-8444-444444444444'
    const parsed = employmentStepSchema.safeParse({
      ...baseEmployment,
      locationId: branchId,
      baseLocationIds: [],
      serviceUserAreaIds: [areaId],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.locationId).toBe(branchId)
    expect(parsed.data.baseLocationIds).toEqual([])
    expect(parsed.data.serviceUserAreaIds).toEqual([areaId])
    expect(parsed.data.accessAllZones).toBe(false)
  })
})
