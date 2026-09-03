import { describe, expect, it } from 'vitest'
import {
  IA_QA_DEMO_SERVICE_USER_NUMBERS,
  isDesignatedIaQaDemoServiceUserNumber,
  isIaQaDemoFlagOn,
  isIaQaDemoUiEnabled,
} from '@/features/service-users/initial-assessment/utils/ia-qa-demo-enabled'

describe('IA QA Demo UI visibility', () => {
  it('is hidden by default in a production-like build (DEV off, flag unset)', () => {
    const env = { DEV: false }
    expect(isIaQaDemoFlagOn(env)).toBe(false)
    expect(isIaQaDemoUiEnabled('SU-1042', env)).toBe(false)
    expect(isIaQaDemoUiEnabled('SU-9999', env)).toBe(false)
    expect(isIaQaDemoUiEnabled(null, env)).toBe(false)
  })

  it('is hidden when VITE_ENABLE_IA_QA_DEMO is not the string true', () => {
    expect(isIaQaDemoUiEnabled('SU-1042', { DEV: false, VITE_ENABLE_IA_QA_DEMO: 'false' })).toBe(
      false,
    )
    expect(isIaQaDemoUiEnabled('SU-1042', { DEV: false, VITE_ENABLE_IA_QA_DEMO: '1' })).toBe(false)
    expect(isIaQaDemoUiEnabled('SU-1042', { DEV: false, VITE_ENABLE_IA_QA_DEMO: '' })).toBe(false)
  })

  it('is visible in DEV for any Service User (existing local behaviour)', () => {
    const env = { DEV: true }
    expect(isIaQaDemoUiEnabled('SU-1042', env)).toBe(true)
    expect(isIaQaDemoUiEnabled('SU-9999', env)).toBe(true)
    expect(isIaQaDemoUiEnabled(null, env)).toBe(true)
  })

  it('is visible in production only when VITE_ENABLE_IA_QA_DEMO=true and the SU is designated', () => {
    const env = { DEV: false, VITE_ENABLE_IA_QA_DEMO: 'true' }
    expect(isIaQaDemoFlagOn(env)).toBe(true)
    expect(isIaQaDemoUiEnabled('SU-1042', env)).toBe(true)
    expect(isIaQaDemoUiEnabled('SU-9999', env)).toBe(false)
    expect(isIaQaDemoUiEnabled('SU-TEST-P01', env)).toBe(false)
    expect(isIaQaDemoUiEnabled(null, env)).toBe(false)
  })

  it('designates only the existing IA demo Service User number SU-1042', () => {
    expect([...IA_QA_DEMO_SERVICE_USER_NUMBERS]).toEqual(['SU-1042'])
    expect(isDesignatedIaQaDemoServiceUserNumber('SU-1042')).toBe(true)
    expect(isDesignatedIaQaDemoServiceUserNumber('SU-TEST-P01')).toBe(false)
  })
})
