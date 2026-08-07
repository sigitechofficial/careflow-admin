import { describe, expect, it, beforeEach } from 'vitest'
import {
  __getEcmOperationalPeriodSnapshotForTests,
  __resetEcmOperationalPeriodStoreForTests,
} from './useEcmOperationalPeriod'

describe('useEcmOperationalPeriod store getSnapshot', () => {
  beforeEach(() => {
    __resetEcmOperationalPeriodStoreForTests()
  })

  it('returns a referentially stable snapshot while the store is empty', () => {
    const a = __getEcmOperationalPeriodSnapshotForTests()
    const b = __getEcmOperationalPeriodSnapshotForTests()
    const c = __getEcmOperationalPeriodSnapshotForTests()
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a.preset).toBe('today')
  })
})
