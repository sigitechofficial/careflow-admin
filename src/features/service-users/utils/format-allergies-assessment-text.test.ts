import { describe, expect, it } from 'vitest'
import { formatAllergiesAssessmentText } from './format-allergies-assessment-text'
import type { ServiceUserAllergyRow } from '@/features/service-users/api'

function row(partial: Partial<ServiceUserAllergyRow> & { allergyName: string }): ServiceUserAllergyRow {
  return {
    id: partial.id ?? '1',
    serviceUserId: 'su-1',
    allergyCatalogId: partial.allergyCatalogId ?? null,
    allergyName: partial.allergyName,
    comment: partial.comment ?? '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('formatAllergiesAssessmentText', () => {
  it('returns a none recorded line when empty', () => {
    expect(formatAllergiesAssessmentText([])).toBe('No known allergies recorded')
  })

  it('joins names and comments', () => {
    expect(
      formatAllergiesAssessmentText([
        row({ allergyName: 'Penicillin', comment: 'Anaphylaxis' }),
        row({ allergyName: 'Latex', comment: '  ' }),
      ]),
    ).toBe('Penicillin — Anaphylaxis\nLatex')
  })
})
