import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/shared/ui/input'
import { DictationProvider } from '@/shared/ui/dictation'
import { InitialAssessmentSecureTextField } from '@/features/service-users/initial-assessment/components/InitialAssessmentSecureTextField'

vi.mock('@/features/service-users/initial-assessment/api', () => ({
  revealInitialAssessmentSecureField: vi.fn(),
}))

describe('InitialAssessmentSecureTextField', () => {
  beforeEach(() => {
    ;(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = class {}
  })
  afterEach(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  })

  it('has no dictation mic, though other fields on the page do', () => {
    render(
      <DictationProvider>
        <Input aria-label="Notes" />
        <InitialAssessmentSecureTextField
          id="key-safe"
          serviceUserId="su"
          submissionId="sub"
          questionId="q"
          value={undefined}
          onChange={() => {}}
        />
      </DictationProvider>,
    )
    expect(screen.getByPlaceholderText('Enter code…')).toHaveAttribute('type', 'text')
    expect(screen.getAllByRole('button', { name: /dictat/i })).toHaveLength(1)
  })
})
