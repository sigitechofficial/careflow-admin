import { describe, expect, it } from 'vitest'
import {
  holisticQuestionLabel,
  stripInternalLabelPlaceholders,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'

describe('stripInternalLabelPlaceholders', () => {
  it('removes bare "@" name tokens and @token placeholders', () => {
    expect(stripInternalLabelPlaceholders('What matters most to @?')).toBe('What matters most to ?')
    expect(stripInternalLabelPlaceholders('How does @preferredName like to be supported?')).toBe(
      'How does like to be supported?',
    )
    expect(stripInternalLabelPlaceholders('@ @firstName goals')).toBe('goals')
  })

  it('leaves normal labels unchanged', () => {
    expect(stripInternalLabelPlaceholders('Reason for admission / starting care')).toBe(
      'Reason for admission / starting care',
    )
  })
})

describe('holisticQuestionLabel', () => {
  it('maps known questions to their human-readable wording and never exposes "@"', () => {
    // Mapped wording is returned as-is (no placeholder to strip).
    expect(holisticQuestionLabel('NHS number')).not.toContain('@')
    // Unmapped question text passes through, with any placeholder stripped.
    expect(holisticQuestionLabel('Support required for @')).toBe('Support required for')
  })
})
