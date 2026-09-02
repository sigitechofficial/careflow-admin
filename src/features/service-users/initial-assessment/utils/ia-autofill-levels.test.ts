import { describe, expect, it } from 'vitest'
import {
  IA_AUTOFILL_LEVELS,
  IA_CONDITION_LEVEL_LABELS,
  IA_QA_DEMO_DATA_BUTTON_LABEL,
  IA_QA_DEMO_DATA_BUTTON_TOOLTIP,
  IA_SECTION_DEMO_SUCCESS_TOAST,
  iaAutofillLevelUi,
  iaSectionDemoOverwriteConfirmText,
} from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'

describe('ia-autofill-levels QA demo data constants', () => {
  it('exposes the QA Demo Data button copy', () => {
    expect(IA_QA_DEMO_DATA_BUTTON_LABEL).toBe('QA Demo Data')
    expect(IA_QA_DEMO_DATA_BUTTON_TOOLTIP).toMatch(/Fill Demo Data/i)
    expect(IA_SECTION_DEMO_SUCCESS_TOAST).toBe('Demo data populated for this section')
  })

  it('no longer references the removed full-assessment demo button', () => {
    // The old "Fill Demo Assessment Data" one-click feature is gone.
    const tooltip = IA_QA_DEMO_DATA_BUTTON_TOOLTIP.toLowerCase()
    expect(tooltip).not.toContain('fill demo assessment data')
  })

  it('offers the three severity scenarios', () => {
    expect(IA_AUTOFILL_LEVELS.map((l) => l.level)).toEqual(['critical', 'normal', 'low'])
    expect(IA_CONDITION_LEVEL_LABELS).toEqual({
      critical: 'Very critical',
      normal: 'Moderate',
      low: 'Stable',
    })
  })

  it('resolves a level UI row', () => {
    expect(iaAutofillLevelUi('critical').label).toBe('Very critical')
    expect(() => iaAutofillLevelUi('nope' as never)).toThrow()
  })

  it('names the selected scenario in the overwrite confirm', () => {
    expect(iaSectionDemoOverwriteConfirmText('Moderate')).toBe(
      'This section already contains data. Replace it with Moderate demo data?',
    )
    expect(iaSectionDemoOverwriteConfirmText('Very critical')).toBe(
      'This section already contains data. Replace it with Very critical demo data?',
    )
    expect(iaSectionDemoOverwriteConfirmText('Stable')).toBe(
      'This section already contains data. Replace it with Stable demo data?',
    )
  })
})
