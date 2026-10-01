import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/api-client'
import {
  isDragAllocationHardBlock,
  teamWarningsFromAllocateError,
} from '@/features/scheduling/utils/allocate-job-warnings.util'

describe('isDragAllocationHardBlock', () => {
  it('treats COMPLIANCE_BLOCK as a hard block', () => {
    expect(
      isDragAllocationHardBlock([
        {
          type: 'COMPLIANCE_BLOCK',
          message: 'Cannot allocate: DBS (EXPIRED)',
          severity: 'blocking',
        },
      ]),
    ).toBe(true)
  })

  it('does not hard-block COMPLIANCE_WARNING', () => {
    expect(
      isDragAllocationHardBlock([
        {
          type: 'COMPLIANCE_WARNING',
          message: 'Employee has 1 compliance item(s) requiring attention',
          severity: 'warning',
        },
      ]),
    ).toBe(false)
  })
})

describe('teamWarningsFromAllocateError', () => {
  const carer = (
    employeeId: string,
    extra: { hardBlocked?: boolean; warnings?: Array<{ type: string; message: string; severity: string }> },
  ) => ({
    employeeId,
    name: employeeId,
    hardBlocked: extra.hardBlocked ?? false,
    requiresConfirmation: !extra.hardBlocked && Boolean(extra.warnings?.length),
    warnings: extra.warnings ?? [],
  })

  it('returns null for non-team errors', () => {
    expect(teamWarningsFromAllocateError(new Error('x'))).toBeNull()
    expect(teamWarningsFromAllocateError(new ApiError('x', 400, { message: 'x' }))).toBeNull()
  })

  it('lists only carers with warnings and allows force for soft warnings', () => {
    const err = new ApiError('Team not assigned', 400, {
      requiresConfirmation: true,
      carers: [
        carer('a', {}),
        carer('b', { warnings: [{ type: 'CAPACITY_EXCEEDED', message: 'Hours', severity: 'blocking' }] }),
      ],
    })
    const parsed = teamWarningsFromAllocateError(err)
    expect(parsed?.carers.map((c) => c.employeeId)).toEqual(['b'])
    expect(parsed?.canForce).toBe(true)
  })

  it('never allows force when any carer is hard-blocked', () => {
    const err = new ApiError('Team not assigned', 400, {
      requiresConfirmation: false,
      carers: [
        carer('a', {
          hardBlocked: true,
          warnings: [{ type: 'TIME_CONFLICT', message: 'Clash', severity: 'blocking' }],
        }),
      ],
    })
    expect(teamWarningsFromAllocateError(err)?.canForce).toBe(false)
  })
})
