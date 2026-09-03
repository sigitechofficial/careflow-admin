import { describe, expect, it } from 'vitest'
import {
  isIaQaDemoFlagOn,
  isIaQaDemoUiEnabled,
} from '@/features/service-users/initial-assessment/utils/ia-qa-demo-enabled'

describe('IA QA Demo UI visibility', () => {
  it('is hidden in production without VITE_ENABLE_IA_QA_DEMO', () => {
    const env = { DEV: false }
    expect(isIaQaDemoFlagOn(env)).toBe(false)
    expect(isIaQaDemoUiEnabled(env)).toBe(false)
  })

  it('is hidden when VITE_ENABLE_IA_QA_DEMO is not the string true', () => {
    expect(isIaQaDemoUiEnabled({ DEV: false, VITE_ENABLE_IA_QA_DEMO: 'false' })).toBe(false)
    expect(isIaQaDemoUiEnabled({ DEV: false, VITE_ENABLE_IA_QA_DEMO: '1' })).toBe(false)
    expect(isIaQaDemoUiEnabled({ DEV: false, VITE_ENABLE_IA_QA_DEMO: '' })).toBe(false)
  })

  it('is visible in DEV', () => {
    expect(isIaQaDemoUiEnabled({ DEV: true })).toBe(true)
  })

  it('production + QA flag: visible for SU-1042, SU-9999, and any newly created SU', () => {
    const env = { DEV: false, VITE_ENABLE_IA_QA_DEMO: 'true' }
    expect(isIaQaDemoFlagOn(env)).toBe(true)
    expect(isIaQaDemoUiEnabled(env)).toBe(true)
  })
})
