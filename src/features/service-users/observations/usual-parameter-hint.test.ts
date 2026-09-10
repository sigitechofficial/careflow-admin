import { describe, expect, it } from 'vitest'
import type { UsualParameterRow } from '@/features/alerts/api/medical-clinical.types'
import {
  checkNumericAgainstUsualBands,
  findUsualParameterForType,
  formatUsualParameterHint,
} from './usual-parameter-hint'

function row(partial: Partial<UsualParameterRow> & { code: string }): UsualParameterRow {
  return {
    id: '1',
    serviceUserId: 'su',
    observationTypeId: 'ot',
    enabled: true,
    usualNumericValue: null,
    usualTextValue: null,
    usualPayload: null,
    lowerBand: null,
    upperBand: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
    observationType: { id: 'ot', code: partial.code, name: partial.code },
    ...partial,
  }
}

describe('usual-parameter-hint', () => {
  it('finds enabled usual row by type code', () => {
    const rows = [
      row({ code: 'PULSE', enabled: false, usualNumericValue: 70 }),
      row({ code: 'PULSE', id: '2', usualNumericValue: 72, lowerBand: 60, upperBand: 100 }),
    ]
    // First match that is enabled — only second is enabled with same code in real data;
    // simulate single enabled:
    const only = [row({ code: 'TEMPERATURE', usualNumericValue: 36.5, lowerBand: 36, upperBand: 37.5 })]
    expect(findUsualParameterForType(only, 'temperature')?.usualNumericValue).toBe(36.5)
    expect(findUsualParameterForType(rows, 'PULSE')?.id).toBe('2')
  })

  it('formats usual + range hint', () => {
    expect(
      formatUsualParameterHint(
        row({ code: 'PULSE', usualNumericValue: 72, lowerBand: 60, upperBand: 100 }),
      ),
    ).toBe('Usual 72 · Range 60–100')
    expect(
      formatUsualParameterHint(row({ code: 'BLOOD_PRESSURE', usualTextValue: '120/80' })),
    ).toBe('Usual 120/80')
    expect(formatUsualParameterHint(row({ code: 'PULSE' }))).toBeNull()
  })

  it('checks numeric bands', () => {
    const bands = row({ code: 'PULSE', lowerBand: 60, upperBand: 100 })
    expect(checkNumericAgainstUsualBands(bands, 72)).toBe('ok')
    expect(checkNumericAgainstUsualBands(bands, 50)).toBe('below')
    expect(checkNumericAgainstUsualBands(bands, 110)).toBe('above')
    expect(checkNumericAgainstUsualBands(bands, null)).toBe('skip')
    expect(checkNumericAgainstUsualBands(null, 72)).toBe('skip')
  })
})
