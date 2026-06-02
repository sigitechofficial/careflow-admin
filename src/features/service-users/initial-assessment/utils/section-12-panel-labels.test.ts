import { describe, expect, it } from 'vitest'
import {
  SECTION_12_ADL_WORKSHEET_PANEL_TITLE,
  section12PanelTitle,
} from '@/features/service-users/initial-assessment/utils/section-12-panel-labels'

describe('section12PanelTitle', () => {
  it('returns catalog labels for §12 spec refs', () => {
    expect(section12PanelTitle('12.7')).toBe('12.7 Falls trigger assessment')
    expect(section12PanelTitle('12.11')).toBe('12.11 Practical care tasks')
  })

  it('keeps composite ADL worksheet title stable', () => {
    expect(SECTION_12_ADL_WORKSHEET_PANEL_TITLE).toBe('12.1–12.5 Activities of daily living')
  })
})
