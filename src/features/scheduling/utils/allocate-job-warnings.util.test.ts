import { describe, expect, it } from 'vitest'
import { isDragAllocationHardBlock } from '@/features/scheduling/utils/allocate-job-warnings.util'

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
